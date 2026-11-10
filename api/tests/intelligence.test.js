import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSpendingAnalysis,
  createPersonalizedAnalysis,
  createSavingsRecommendations,
  extractReceiptFields,
  forecastBudget,
  normalizeMerchant,
  processReceiptImage,
  suggestExpenseCategory,
} from '../src/services/intelligence.js';
import { ownerFilter } from '../src/models/Transaction.js';
import {
  analysisSchema,
  categorySuggestionSchema,
  receiptExtractionSchema,
  savingsNarrativeSchema,
} from '../src/domain/schemas.js';

const now = new Date('2026-11-15T12:00:00.000Z');
const tx = (date, category, amountMinor, type = 'expense') => ({
  date, category, amountMinor, type,
});

test('merchant rules return a validated high-confidence suggestion', async () => {
  const suggestion = await suggestExpenseCategory({ title: 'Order', merchant: 'Swiggy' });
  assert.equal(suggestion.category, 'Food');
  assert.equal(suggestion.source, 'merchant_rule');
  assert.ok(suggestion.confidence >= 0.9);
  assert.equal(categorySuggestionSchema.safeParse(suggestion).success, true);
});

test('personal merchant corrections take precedence over general merchant rules', async () => {
  const suggestion = await suggestExpenseCategory({
    title: 'Online order',
    merchant: 'Amazon',
    userRule: { category: 'Groceries' },
  });
  assert.equal(suggestion.category, 'Groceries');
  assert.equal(suggestion.source, 'personal_rule');
  assert.equal(suggestion.confidence, 1);
});

test('unknown merchant uses a valid AI category and rejects invalid AI output safely', async () => {
  const fromAI = await suggestExpenseCategory({
    title: 'Unfamiliar purchase',
    merchant: 'New local shop',
    requestAI: async () => ({ category: 'Shopping', confidence: 0.82, reason: 'A new retail purchase.' }),
  });
  assert.equal(fromAI.category, 'Shopping');
  assert.equal(fromAI.source, 'ai');

  const fallback = await suggestExpenseCategory({
    title: 'Unfamiliar purchase',
    merchant: 'New local shop',
    requestAI: async () => ({ category: 'Cryptocurrency', confidence: 2, reason: 'Invalid category.' }),
  });
  assert.equal(fallback.category, 'Other');
  assert.equal(fallback.source, 'fallback');
  assert.equal(categorySuggestionSchema.safeParse({ ...fallback, confidence: 1.1 }).success, false);
});

test('AI categorization failure uses deterministic merchant fallback', async () => {
  const suggestion = await suggestExpenseCategory({
    title: 'A new household purchase',
    merchant: 'Local artisan',
    requestAI: async () => { throw new Error('Provider unavailable'); },
  });
  assert.equal(suggestion.category, 'Other');
  assert.equal(suggestion.source, 'fallback');
});

test('merchant normalization supports personalized exact matching', () => {
  assert.equal(normalizeMerchant('  Café / Store  '), 'cafe store');
});

test('receipt extraction returns structured data in paise and leaves missing facts null', () => {
  const result = extractReceiptFields([
    'Fresh Mart',
    'Date: 10/11/2026',
    'Apples 120.00',
    'GST 5.00',
    'Grand Total 125.00',
  ].join('\n'), 92);
  assert.equal(result.merchant, 'Fresh Mart');
  assert.equal(result.date, '2026-11-10');
  assert.equal(result.amountMinor, 12500);
  assert.equal(result.taxMinor, 500);
  assert.equal(result.categorySuggestion.category, 'Groceries');
  assert.equal(receiptExtractionSchema.safeParse(result).success, true);

  const unknown = extractReceiptFields('INVOICE\nTHANK YOU', 0);
  assert.equal(unknown.merchant, null);
  assert.equal(unknown.date, null);
  assert.equal(unknown.amountMinor, null);
  assert.equal(unknown.confidence.amount, 0);
});

test('receipt date parser does not accept impossible calendar dates', () => {
  const result = extractReceiptFields('Fresh Mart\nDate: 31/02/2026\nGrand Total 10.00', 80);
  assert.equal(result.date, null);
  assert.equal(result.amountMinor, 1000);
});

test('receipt extraction reads the final total instead of bill and item numbers', () => {
  const result = extractReceiptFields([
    'Ls = i',
    '- NAR',
    'EL {| |',
    'Ls = AS',
    'A NAV RE 1',
    'RI he J—',
    'Near Kottara Chowki',
    'Manga luru',
    '-- Cash Memo',
    'e : 05/03/26 Bill No. : 40',
    'ho.: 11 Emp. No. : 1',
    'iculars Qty Rate Amount',
    '§ FISH THALI 1120 120',
    'BOILED(MURU)',
    '- £GG FRIED RICE 1100 100',
    'VEG THALT 160 60',
    'cake 18 dl',
    'RTE',
    'NSE . 4/411 Total : 295',
    '= GSTIN:',
  ].join('\n'), 58);

  assert.equal(result.amountMinor, 29500);
  assert.equal(result.date, '2026-03-05');
  assert.equal(result.categorySuggestion.category, 'Food');
  assert.equal(result.merchant, 'A NAV RE 1');
});

test('receipt OCR adapter validates structured extraction and propagates provider errors', async () => {
  const extracted = await processReceiptImage(Buffer.from('image'), async () => ({
    data: { text: 'Metro Cafe\nDate: 2026-11-10\nGrand Total 85.50', confidence: 90 },
  }));
  assert.equal(extracted.merchant, 'Metro Cafe');
  assert.equal(extracted.amountMinor, 8550);
  assert.equal(receiptExtractionSchema.safeParse(extracted).success, true);
  await assert.rejects(() => processReceiptImage(Buffer.from('bad'), async () => {
    throw new Error('OCR service unavailable');
  }), /OCR service unavailable/);
});

test('personal spending analysis derives exact totals from supplied transactions', async () => {
  const transactions = [
    tx('2026-11-02', 'Food', 12000),
    tx('2026-11-05', 'Housing', 80000),
    tx('2026-10-02', 'Food', 10000),
    tx('2026-10-06', 'Shopping', 20000),
    tx('2026-11-07', 'Salary', 300000, 'income'),
  ];
  const summary = computeSpendingAnalysis(transactions, '2026-11');
  assert.equal(summary.totalExpenseMinor, 92000);
  assert.equal(summary.previousExpenseMinor, 30000);
  assert.equal(summary.topCategory, 'Housing');
  assert.equal(summary.categories.length, 2);

  const result = await createPersonalizedAnalysis(transactions, '2026-11', async () => ({
    insights: ['Housing is your top spending category.', 'You paid ₹800 this month.', 'Review 3 recurring subscriptions.'],
  }));
  assert.equal(result.summary.totalExpenseMinor, 92000);
  assert.deepEqual(result.insights, ['Housing is your top spending category.']);
  assert.equal(analysisSchema.safeParse({ insights: ['ok'], invented: 20 }).success, false);
});

test('spending analysis failure returns derived, non-numeric fallback copy', async () => {
  const result = await createPersonalizedAnalysis([
    tx('2026-11-02', 'Food', 1000),
    tx('2026-10-02', 'Food', 500),
  ], '2026-11', async () => { throw new Error('offline'); });
  assert.equal(result.summary.totalExpenseMinor, 1000);
  assert.ok(result.insights.some((insight) => insight.includes('Food')));
});

test('budget forecast uses current run rate, historical totals, and explicit budget', () => {
  const transactions = [
    tx('2026-11-02', 'Food', 10000),
    tx('2026-11-12', 'Food', 20000),
    tx('2026-10-11', 'Food', 30000),
    tx('2026-09-11', 'Food', 20000),
    tx('2026-08-11', 'Food', 10000),
  ];
  const forecast = forecastBudget(transactions, '2026-11', 50000, now);
  assert.equal(forecast.currentSpentMinor, 30000);
  assert.equal(forecast.projectedExpenseMinor, 60000);
  assert.equal(forecast.historicalAverageMinor, 20000);
  assert.equal(forecast.remainingBudgetMinor, 20000);
  assert.equal(forecast.status, 'at_risk');
  assert.equal(forecast.projectionBasis, 'current_month_run_rate');
});

test('budget forecast does not invent a projection without any transaction history', () => {
  const forecast = forecastBudget([], '2026-11', null, now);
  assert.equal(forecast.projectedExpenseMinor, null);
  assert.equal(forecast.budgetMinor, null);
  assert.equal(forecast.status, 'unavailable');
});

test('savings recommendations require observed history and derive possible amount from actual trends', async () => {
  const transactions = [
    tx('2026-08-07', 'Food', 10000),
    tx('2026-09-07', 'Food', 20000),
    tx('2026-10-07', 'Food', 30000),
    tx('2026-11-02', 'Food', 20000),
    tx('2026-11-12', 'Food', 20000),
    tx('2026-11-02', 'Transport', 5000),
  ];
  const recommendations = await createSavingsRecommendations(transactions, '2026-11', async () => ({
    recommendations: [{ category: 'Food', rationale: 'Consider planning meals before grocery trips.' }],
  }), now);
  assert.equal(recommendations.length, 1);
  assert.equal(recommendations[0].category, 'Food');
  assert.equal(recommendations[0].potentialSavingsMinor, 60000);
  assert.equal(recommendations[0].rationale, 'Consider planning meals before grocery trips.');
  assert.equal(savingsNarrativeSchema.safeParse({ recommendations: [{ category: 'Invalid', rationale: 'No.' }] }).success, false);
});

test('savings recommendation provider failure preserves historical calculations', async () => {
  const transactions = [
    tx('2026-08-07', 'Food', 10000),
    tx('2026-09-07', 'Food', 10000),
    tx('2026-11-02', 'Food', 10000),
    tx('2026-11-12', 'Food', 10000),
  ];
  const recommendations = await createSavingsRecommendations(transactions, '2026-11', async () => {
    throw new Error('offline');
  }, now);
  assert.equal(recommendations[0].potentialSavingsMinor, 33333);
  assert.match(recommendations[0].rationale, /not guaranteed/i);
});

test('database filters always scope data to the authenticated owner', () => {
  const ownerId = 'user-a';
  const filter = ownerFilter(ownerId, { type: 'expense' });
  assert.deepEqual(filter, { type: 'expense', userId: ownerId });
  assert.equal(ownerFilter('user-b').userId, 'user-b');
});

import {
  ALL_CATEGORIES,
  analysisSchema,
  categorySuggestionSchema,
  receiptExtractionSchema,
  savingsNarrativeSchema,
} from '../domain/schemas.js';

const merchantRules = [
  { terms: ['swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'bakery', 'dominos', 'pizza hut', 'thali', 'fried rice', 'food total'], category: 'Food', reason: 'Merchant or description matches food and dining.' },
  { terms: ['bigbasket', 'blinkit', 'zepto', 'dmart', 'supermarket', 'grocery', 'groceries', 'fresh mart', 'vegetables', 'produce'], category: 'Groceries', reason: 'Merchant or description matches grocery shopping.' },
  { terms: ['uber', 'ola', 'rapido', 'metro', 'irctc', 'fuel', 'petrol', 'taxi'], category: 'Transport', reason: 'Merchant or description matches transport or travel fare.' },
  { terms: ['amazon', 'flipkart', 'myntra', 'meesho', 'shopping'], category: 'Shopping', reason: 'Merchant or description matches a shopping retailer.' },
  { terms: ['electricity', 'water bill', 'gas bill', 'broadband', 'mobile recharge', 'utility'], category: 'Bills', reason: 'Description matches a household or utility bill.' },
  { terms: ['pharmacy', 'apollo pharmacy', 'medical store', 'hospital', 'clinic'], category: 'Health', reason: 'Merchant or description matches a healthcare provider.' },
  { terms: ['netflix', 'spotify', 'movie', 'cinema', 'hotstar'], category: 'Entertainment', reason: 'Merchant or description matches entertainment.' },
  { terms: ['rent', 'landlord', 'housing'], category: 'Housing', reason: 'Description matches a housing payment.' },
];

export function normalizeMerchant(value = '') {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findMerchantRule(title, merchant) {
  const haystack = normalizeMerchant(`${merchant} ${title}`);
  return merchantRules.find((rule) => rule.terms.some((term) => haystack.includes(normalizeMerchant(term))));
}

function fallbackSuggestion(title, merchant) {
  const rule = findMerchantRule(title, merchant);
  if (rule) {
    return {
      category: rule.category,
      confidence: 0.66,
      reason: rule.reason,
      source: 'fallback',
    };
  }
  return {
    category: 'Other',
    confidence: 0.2,
    reason: 'No reliable merchant match was found. Please choose a category.',
    source: 'fallback',
  };
}

export async function suggestExpenseCategory({ title, merchant = '', userRule, requestAI }) {
  const normalized = normalizeMerchant(merchant);
  if (normalized && userRule?.category && ALL_CATEGORIES.includes(userRule.category)) {
    return categorySuggestionSchema.parse({
      category: userRule.category,
      confidence: 1,
      reason: 'Matched a category you previously chose for this merchant.',
      source: 'personal_rule',
    });
  }

  const localRule = findMerchantRule(title, merchant);
  if (localRule) {
    return categorySuggestionSchema.parse({
      category: localRule.category,
      confidence: 0.96,
      reason: localRule.reason,
      source: 'merchant_rule',
    });
  }

  if (requestAI) {
    try {
      const response = await requestAI({ title, merchant });
      const candidate = categorySuggestionSchema.safeParse({
        ...response,
        source: 'ai',
      });
      if (candidate.success) return candidate.data;
      console.warn('AI categorization response failed schema validation; using rule fallback.');
    } catch (error) {
      console.warn('AI categorization unavailable; using rule fallback.', error.message);
    }
  }

  return categorySuggestionSchema.parse(fallbackSuggestion(title, merchant));
}

function parseMoneyMinor(raw) {
  const normalized = String(raw).replace(/,/g, '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const minor = Math.round(amount * 100);
  return Number.isSafeInteger(minor) ? minor : null;
}

function parseReceiptDate(raw) {
  const value = raw.trim();
  let year;
  let month;
  let day;
  let match = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) [, year, month, day] = match;
  else {
    match = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
    if (!match) return null;
    [, day, month, year] = match;
    if (year.length === 2) year = Number(year) > 50 ? `19${year}` : `20${year}`;
  }

  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null;
  return date.toISOString().slice(0, 10);
}

export function extractReceiptFields(ocrText, ocrConfidence = 0) {
  const lines = String(ocrText || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const firstAddressLine = lines.findIndex((line) => /^(?:near|opp(?:osite)?|road|rd\.?|street|st\.?|avenue|ave\.?|no\.?\s*\d)/i.test(line));
  const merchantHeader = firstAddressLine < 0 ? lines : lines.slice(0, firstAddressLine);
  const merchant = merchantHeader.find((line) => {
    const letters = (line.match(/[a-z]/gi) || []).length;
    const visibleCharacters = line.replace(/\s/g, '').length;
    const words = line.match(/[a-z]{2,}/gi) || [];
    return line.length >= 2
    && line.length <= 120
    && !/(receipt|invoice|tax invoice|date|time|cashier|subtotal|sub total|grand total|total|gstin|phone|thank you)/i.test(line)
    && !/^[\d\s.,:/-]+$/.test(line)
    && letters >= 4
    && letters / visibleCharacters >= 0.72
    && words.some((word) => word.length >= 3);
  }) || null;

  let date = null;
  for (const line of lines) {
    const dateMatch = line.match(/\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b/);
    if (dateMatch) {
      date = parseReceiptDate(dateMatch[0]);
      if (date) break;
    }
  }

  const totalLabelPattern = /grand\s*total|amount\s*due|total\s*(?:paid|amount)?|net\s*amount/i;
  let amountLine = null;
  let amountMinor = null;
  for (const line of [...lines].reverse()) {
    const labels = [...line.matchAll(new RegExp(totalLabelPattern.source, 'gi'))];
    if (!labels.length) continue;

    const amountText = line.slice(labels.at(-1).index + labels.at(-1)[0].length);
    const amounts = [...amountText.matchAll(/(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/gi)];
    for (const amount of [...amounts].reverse()) {
      amountMinor = parseMoneyMinor(amount[1]);
      if (amountMinor) break;
    }
    if (amountMinor) {
      amountLine = line;
      break;
    }
  }
  const taxLine = lines.find((line) => /\b(?:gst|tax|vat)\b/i.test(line));
  const taxMatch = taxLine?.match(/(?:₹|rs\.?|inr)?\s*([\d,]+\.\d{1,2}|[\d,]+)/i);
  const taxMinor = taxMatch ? parseMoneyMinor(taxMatch[1]) : null;
  const items = lines
    .filter((line) => !/(receipt|invoice|date|time|cashier|subtotal|grand total|total|gstin|thank you)/i.test(line))
    .filter((line) => !line.match(/\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b/))
    .filter((line) => line !== merchant)
    .slice(0, 30)
    .map((line) => line.slice(0, 120));

  const confidence = Math.max(0, Math.min(1, Number(ocrConfidence) / 100 || 0));
  const extraction = {
    merchant,
    date,
    amountMinor,
    taxMinor,
    items,
    confidence: {
      merchant: merchant ? confidence : 0,
      date: date ? confidence : 0,
      amount: amountMinor ? Math.min(confidence, amountLine ? 0.97 : confidence) : 0,
    },
    categorySuggestion: fallbackSuggestion(items.join(' '), merchant || ''),
  };

  return receiptExtractionSchema.parse(extraction);
}

export async function processReceiptImage(imageBuffer, recognize) {
  const result = await recognize(imageBuffer);
  if (typeof result?.data?.text !== 'string') throw new Error('OCR provider returned no recognized text.');
  return extractReceiptFields(result.data.text, result.data.confidence);
}

function monthStart(month) {
  return new Date(`${month}-01T00:00:00.000Z`);
}

function previousMonth(month, offset = 1) {
  const date = monthStart(month);
  date.setUTCMonth(date.getUTCMonth() - offset);
  return date.toISOString().slice(0, 7);
}

function monthDays(month) {
  const [year, value] = month.split('-').map(Number);
  return new Date(Date.UTC(year, value, 0)).getUTCDate();
}

function monthOf(transaction) {
  return transaction.date.slice(0, 7);
}

function expenseTransactions(transactions) {
  return transactions.filter((item) => item.type === 'expense' && Number.isSafeInteger(item.amountMinor) && item.amountMinor > 0);
}

function sumMinor(transactions) {
  return transactions.reduce((sum, item) => sum + item.amountMinor, 0);
}

export function computeSpendingAnalysis(transactions, month) {
  const current = transactions.filter((item) => monthOf(item) === month);
  const previous = transactions.filter((item) => monthOf(item) === previousMonth(month));
  const currentExpenses = expenseTransactions(current);
  const previousExpenses = expenseTransactions(previous);
  const currentTotalMinor = sumMinor(currentExpenses);
  const previousTotalMinor = sumMinor(previousExpenses);
  const byCategory = new Map();
  currentExpenses.forEach((item) => byCategory.set(item.category, (byCategory.get(item.category) || 0) + item.amountMinor));
  const categories = [...byCategory.entries()]
    .map(([category, amountMinor]) => ({ category, amountMinor }))
    .sort((a, b) => b.amountMinor - a.amountMinor);
  const top = categories[0] || null;
  const changePercent = previousTotalMinor > 0
    ? Math.round(((currentTotalMinor - previousTotalMinor) / previousTotalMinor) * 1000) / 10
    : null;

  return {
    month,
    transactionCount: current.length,
    expenseCount: currentExpenses.length,
    totalExpenseMinor: currentTotalMinor,
    previousExpenseMinor: previousTotalMinor,
    changePercent,
    topCategory: top?.category ?? null,
    topCategoryMinor: top?.amountMinor ?? null,
    categories,
  };
}

function containsFinancialClaim(text) {
  return /[\d₹]|\b(?:inr|rs\.?|rupees?)\b/i.test(text);
}

export async function createPersonalizedAnalysis(transactions, month, requestAI) {
  const summary = computeSpendingAnalysis(transactions, month);
  if (!summary.expenseCount) {
    return { summary, insights: [] };
  }

  const fallback = [];
  if (summary.topCategory) fallback.push(`${summary.topCategory} is your highest-spend category for this month.`);
  if (summary.changePercent !== null) {
    const direction = summary.changePercent > 0 ? 'higher' : summary.changePercent < 0 ? 'lower' : 'unchanged';
    fallback.push(`Recorded spending is ${direction} than the previous month.`);
  }
  if (summary.expenseCount >= 4) fallback.push('Review recurring purchases in your largest category to spot costs you can adjust.');

  if (!requestAI) return { summary, insights: fallback };

  try {
    const result = await requestAI(summary);
    const validated = analysisSchema.safeParse(result);
    const safeInsights = validated.success
      ? validated.data.insights.filter((text) => !containsFinancialClaim(text))
      : [];
    if (safeInsights.length) return { summary, insights: safeInsights };
    console.warn('AI spending analysis response failed validation; using calculated insights.');
  } catch (error) {
    console.warn('AI spending analysis unavailable; using calculated insights.', error.message);
  }
  return { summary, insights: fallback };
}

export function forecastBudget(transactions, month, budgetMinor, now = new Date()) {
  const expenses = expenseTransactions(transactions);
  const current = expenses.filter((item) => monthOf(item) === month);
  const previousMonths = [1, 2, 3].map((offset) => previousMonth(month, offset));
  const historyTotals = previousMonths.map((period) => sumMinor(expenses.filter((item) => monthOf(item) === period)));
  const hasHistory = historyTotals.some((value) => value > 0);
  const historicalAverageMinor = hasHistory
    ? Math.round(historyTotals.reduce((sum, value) => sum + value, 0) / historyTotals.length)
    : null;
  const daysInMonth = monthDays(month);
  const selected = monthStart(month);
  const sameMonth = now.getUTCFullYear() === selected.getUTCFullYear() && now.getUTCMonth() === selected.getUTCMonth();
  const isPast = selected < new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const daysElapsed = isPast ? daysInMonth : sameMonth ? Math.max(1, now.getUTCDate()) : 0;
  const currentSpentMinor = sumMinor(current);
  let projectedExpenseMinor = null;
  let projectionBasis = 'insufficient_data';

  if (isPast) {
    projectedExpenseMinor = currentSpentMinor;
    projectionBasis = 'completed_month';
  } else if (currentSpentMinor > 0 && daysElapsed > 0) {
    projectedExpenseMinor = Math.round((currentSpentMinor / daysElapsed) * daysInMonth);
    projectionBasis = 'current_month_run_rate';
  } else if (hasHistory) {
    projectedExpenseMinor = historicalAverageMinor;
    projectionBasis = 'historical_average';
  }

  const isValidBudget = Number.isSafeInteger(budgetMinor) && budgetMinor > 0;
  const remainingBudgetMinor = isValidBudget ? budgetMinor - currentSpentMinor : null;
  return {
    month,
    budgetMinor: isValidBudget ? budgetMinor : null,
    currentSpentMinor,
    remainingBudgetMinor,
    historicalAverageMinor,
    projectedExpenseMinor,
    daysElapsed,
    daysInMonth,
    projectionBasis,
    status: !isValidBudget || projectedExpenseMinor === null
      ? 'unavailable'
      : projectedExpenseMinor > budgetMinor
        ? 'at_risk'
        : 'on_track',
  };
}

export async function createSavingsRecommendations(transactions, month, requestAI, now = new Date()) {
  const expenses = expenseTransactions(transactions);
  const currentByCategory = new Map();
  expenses.filter((item) => monthOf(item) === month).forEach((item) => {
    currentByCategory.set(item.category, (currentByCategory.get(item.category) || 0) + item.amountMinor);
  });

  const isCurrentMonth = now.toISOString().slice(0, 7) === month;
  const elapsedDays = isCurrentMonth ? Math.max(1, now.getUTCDate()) : monthDays(month);
  const totalDays = monthDays(month);
  const candidates = [];

  for (const [category, currentSpentMinor] of currentByCategory) {
    const historyTotals = [1, 2, 3].map((offset) => {
      const historicalMonth = previousMonth(month, offset);
      return sumMinor(expenses.filter((item) => monthOf(item) === historicalMonth && item.category === category));
    });
    const observedMonths = historyTotals.filter((value) => value > 0).length;
    if (observedMonths < 2) continue;

    const historicalAverageMinor = Math.round(historyTotals.reduce((sum, value) => sum + value, 0) / 3);
    const projectedMinor = Math.round((currentSpentMinor / elapsedDays) * totalDays);
    const potentialSavingsMinor = Math.max(0, projectedMinor - historicalAverageMinor);
    if (potentialSavingsMinor > 0) {
      candidates.push({
        category,
        historicalAverageMinor,
        projectedMinor,
        potentialSavingsMinor,
        rationale: `Your recorded ${category.toLowerCase()} spending is trending above its recent three-month average. Returning closer to that observed level could free up money, but savings are not guaranteed.`,
      });
    }
  }

  candidates.sort((a, b) => b.potentialSavingsMinor - a.potentialSavingsMinor);
  const limited = candidates.slice(0, 4);
  if (!limited.length || !requestAI) return limited;

  try {
    const generated = await requestAI(limited.map(({ category, historicalAverageMinor, projectedMinor }) => ({
      category,
      historicalAverageMinor,
      projectedMinor,
    })));
    const validated = savingsNarrativeSchema.safeParse(generated);
    if (!validated.success) {
      console.warn('AI savings response failed schema validation; using evidence-based recommendations.');
      return limited;
    }
    return limited.map((candidate) => {
      const narrative = validated.data.recommendations.find((item) => item.category === candidate.category);
      if (narrative && !containsFinancialClaim(narrative.rationale)) {
        return { ...candidate, rationale: narrative.rationale };
      }
      return candidate;
    });
  } catch (error) {
    console.warn('AI savings recommendations unavailable; using evidence-based recommendations.', error.message);
    return limited;
  }
}

export function assertCategoryList(categories) {
  return categories.every((category) => ALL_CATEGORIES.includes(category));
}

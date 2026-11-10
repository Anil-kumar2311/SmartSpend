import { Router } from 'express';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import { z } from 'zod';
import { categorizationInputSchema, monthSchema, merchantRuleInputSchema } from '../domain/schemas.js';
import { Budget } from '../models/Budget.js';
import { MerchantRule } from '../models/MerchantRule.js';
import { Transaction } from '../models/Transaction.js';
import { normalizeMerchant, processReceiptImage, suggestExpenseCategory, createPersonalizedAnalysis, forecastBudget, createSavingsRecommendations } from '../services/intelligence.js';
import { aiAdapters } from '../services/model-provider.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (request, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new Error('Receipt must be a JPEG, PNG, or WebP image.'));
      return;
    }
    callback(null, true);
  },
});
const monthQuerySchema = z.object({ month: monthSchema }).strict();
const adapters = aiAdapters();

function imageBufferMatchesType(buffer, mimeType) {
  if (mimeType === 'image/png') return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mimeType === 'image/jpeg') return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === 'image/webp') return buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

router.post('/categorize', asyncHandler(async (request, response) => {
  const parsed = categorizationInputSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Enter a description to categorize.' });
  const normalizedMerchant = normalizeMerchant(parsed.data.merchant);
  const userRule = normalizedMerchant
    ? await MerchantRule.findOne({ userId: request.user._id, normalizedMerchant }).lean()
    : null;
  const suggestion = await suggestExpenseCategory({
    ...parsed.data,
    userRule,
    requestAI: adapters.categorize,
  });
  return response.json({ suggestion });
}));

router.post('/merchant-rules', asyncHandler(async (request, response) => {
  const parsed = merchantRuleInputSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Merchant name and expense category are required.' });
  const normalizedMerchant = normalizeMerchant(parsed.data.merchant);
  if (!normalizedMerchant) return response.status(400).json({ error: 'Merchant name is invalid.' });
  const rule = await MerchantRule.findOneAndUpdate(
    { userId: request.user._id, normalizedMerchant },
    { $set: { merchant: parsed.data.merchant, category: parsed.data.category }, $setOnInsert: { userId: request.user._id, normalizedMerchant } },
    { upsert: true, new: true, runValidators: true },
  ).lean();
  return response.status(201).json({ rule: { merchant: rule.merchant, category: rule.category } });
}));

router.post('/receipt-scan', upload.single('receipt'), asyncHandler(async (request, response) => {
  if (!request.file) return response.status(400).json({ error: 'Choose a receipt image to scan.' });
  if (!imageBufferMatchesType(request.file.buffer, request.file.mimetype)) {
    return response.status(400).json({ error: 'The uploaded file content does not match a supported image format.' });
  }

  let extraction;
  try {
    extraction = await processReceiptImage(
      request.file.buffer,
      (buffer) => Tesseract.recognize(buffer, process.env.OCR_LANGUAGE || 'eng'),
    );
  } catch (error) {
    console.error('Receipt OCR failed.', error.message);
    return response.status(503).json({ error: 'Receipt scanning is unavailable. You can still add the transaction manually.' });
  }

  if (extraction.merchant) {
    const normalizedMerchant = normalizeMerchant(extraction.merchant);
    const userRule = await MerchantRule.findOne({ userId: request.user._id, normalizedMerchant }).lean();
    extraction.categorySuggestion = await suggestExpenseCategory({
      title: extraction.items.join(' ').slice(0, 120) || extraction.merchant,
      merchant: extraction.merchant,
      userRule,
      requestAI: adapters.categorize,
    });
  }
  return response.json({ extraction });
}));

router.get('/insights', asyncHandler(async (request, response) => {
  const parsed = monthQuerySchema.safeParse(request.query);
  if (!parsed.success) return response.status(400).json({ error: 'Month must use YYYY-MM format.' });
  const month = parsed.data.month;
  const start = new Date(`${month}-01T00:00:00.000Z`);
  start.setUTCMonth(start.getUTCMonth() - 3);
  const firstMonth = start.toISOString().slice(0, 7);
  const transactions = await Transaction.find({
    userId: request.user._id,
    date: { $gte: `${firstMonth}-01`, $lte: `${month}-31` },
  }).select('type category amountMinor date').lean();
  const budget = await Budget.findOne({ userId: request.user._id, month }).select('amountMinor').lean();
  const [analysis, recommendations] = await Promise.all([
    createPersonalizedAnalysis(transactions, month, adapters.analyze),
    createSavingsRecommendations(transactions, month, adapters.savings),
  ]);
  return response.json({
    analysis,
    forecast: forecastBudget(transactions, month, budget?.amountMinor),
    recommendations,
    source: 'authenticated_transactions',
  });
}));

export default router;

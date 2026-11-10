import { Router } from 'express';
import { budgetInputSchema, monthSchema } from '../domain/schemas.js';
import { Budget } from '../models/Budget.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/:month', asyncHandler(async (request, response) => {
  const parsedMonth = monthSchema.safeParse(request.params.month);
  if (!parsedMonth.success) return response.status(400).json({ error: 'Month must use YYYY-MM format.' });
  const budget = await Budget.findOne({ userId: request.user._id, month: parsedMonth.data }).lean();
  return response.json({ budget: budget ? { month: budget.month, amountMinor: budget.amountMinor } : null });
}));

router.put('/:month', asyncHandler(async (request, response) => {
  const parsedMonth = monthSchema.safeParse(request.params.month);
  const parsedBody = budgetInputSchema.safeParse(request.body);
  if (!parsedMonth.success || !parsedBody.success) return response.status(400).json({ error: 'Enter a valid month and a positive budget amount in paise.' });
  const budget = await Budget.findOneAndUpdate(
    { userId: request.user._id, month: parsedMonth.data },
    { $set: { amountMinor: parsedBody.data.amountMinor }, $setOnInsert: { userId: request.user._id, month: parsedMonth.data } },
    { upsert: true, new: true, runValidators: true },
  ).lean();
  return response.json({ budget: { month: budget.month, amountMinor: budget.amountMinor } });
}));

export default router;

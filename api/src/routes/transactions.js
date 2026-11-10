import { Router } from 'express';
import mongoose from 'mongoose';
import { transactionInputSchema } from '../domain/schemas.js';
import { Transaction, ownerFilter, transactionDTO } from '../models/Transaction.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(async (request, response) => {
  const month = typeof request.query.month === 'string' ? request.query.month : null;
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return response.status(400).json({ error: 'Month must use YYYY-MM format.' });
  }
  const filters = month ? { date: new RegExp(`^${month}`) } : {};
  const items = await Transaction.find(ownerFilter(request.user._id, filters)).sort({ date: -1, createdAt: -1 }).lean();
  return response.json({ transactions: items.map(transactionDTO) });
}));

router.post('/', asyncHandler(async (request, response) => {
  const parsed = transactionInputSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Transaction details are invalid.', details: parsed.error.flatten() });
  const transaction = await Transaction.create({ ...parsed.data, userId: request.user._id });
  return response.status(201).json({ transaction: transactionDTO(transaction) });
}));

router.delete('/:id', asyncHandler(async (request, response) => {
  if (!mongoose.isValidObjectId(request.params.id)) return response.status(400).json({ error: 'Transaction id is invalid.' });
  const deleted = await Transaction.findOneAndDelete(ownerFilter(request.user._id, { _id: request.params.id }));
  if (!deleted) return response.status(404).json({ error: 'Transaction not found.' });
  return response.status(204).end();
}));

export default router;

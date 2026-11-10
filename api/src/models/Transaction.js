import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: String, required: true, maxlength: 40 },
  amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  merchant: { type: String, default: '', trim: true, maxlength: 120 },
  notes: { type: String, default: '', trim: true, maxlength: 500 },
}, { timestamps: true, strict: 'throw' });

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, category: 1, date: -1 });

export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);

export function transactionDTO(transaction) {
  const value = transaction.toObject ? transaction.toObject() : transaction;
  return {
    id: String(value._id),
    title: value.title,
    type: value.type,
    category: value.category,
    amountMinor: value.amountMinor,
    amount: value.amountMinor / 100,
    date: value.date,
    merchant: value.merchant || '',
    notes: value.notes || '',
  };
}

export function ownerFilter(userId, filters = {}) {
  return { ...filters, userId };
}

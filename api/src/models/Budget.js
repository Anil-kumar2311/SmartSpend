import mongoose from 'mongoose';

const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
  amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
}, { timestamps: true, strict: 'throw' });

budgetSchema.index({ userId: 1, month: 1 }, { unique: true });

export const Budget = mongoose.models.Budget || mongoose.model('Budget', budgetSchema);

import mongoose from 'mongoose';

const merchantRuleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  merchant: { type: String, required: true, trim: true, maxlength: 120 },
  normalizedMerchant: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, maxlength: 40 },
}, { timestamps: true, strict: 'throw' });

merchantRuleSchema.index({ userId: 1, normalizedMerchant: 1 }, { unique: true });

export const MerchantRule = mongoose.models.MerchantRule || mongoose.model('MerchantRule', merchantRuleSchema);

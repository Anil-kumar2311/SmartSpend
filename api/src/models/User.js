import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  displayName: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
  passwordHash: { type: String, required: true, select: false },
}, { timestamps: true, strict: 'throw' });

export const User = mongoose.models.User || mongoose.model('User', userSchema);

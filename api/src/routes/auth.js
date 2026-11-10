import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { clearSessionCookie, issueSessionCookie, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
export const authPasswordSchema = z.string()
  .min(10)
  .max(128)
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be no more than 72 bytes.');
const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: authPasswordSchema,
}).strict();
const registrationSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(2).max(80),
}).strict();

function publicUser(user) {
  return { id: String(user._id), displayName: user.displayName, email: user.email };
}

router.post('/register', asyncHandler(async (request, response) => {
  const parsed = registrationSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Check the name, email, and password and try again.', details: parsed.error.flatten() });
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    const user = await User.create({ displayName: parsed.data.displayName, email: parsed.data.email, passwordHash });
    issueSessionCookie(response, user._id);
    return response.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return response.status(409).json({ error: 'An account with that email already exists.' });
    throw error;
  }
}));

router.post('/login', asyncHandler(async (request, response) => {
  const parsed = credentialsSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: 'Enter a valid email and password.' });
  const user = await User.findOne({ email: parsed.data.email }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return response.status(401).json({ error: 'Email or password is incorrect.' });
  }
  issueSessionCookie(response, user._id);
  return response.json({ user: publicUser(user) });
}));

router.post('/logout', (request, response) => {
  clearSessionCookie(response);
  return response.status(204).end();
});

router.get('/me', requireAuth, (request, response) => response.json({ user: publicUser(request.user) }));

export default router;

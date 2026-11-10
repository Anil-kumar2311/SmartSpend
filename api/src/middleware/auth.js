import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

const COOKIE_NAME = 'smartspend_session';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters.');
  return secret;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api',
    maxAge: 24 * 60 * 60 * 1000,
  };
}

export function issueSessionCookie(response, userId) {
  const token = jwt.sign({ sub: String(userId) }, getJwtSecret(), { expiresIn: '1d', issuer: 'smartspend-api' });
  response.cookie(COOKIE_NAME, token, sessionCookieOptions());
}

export function clearSessionCookie(response) {
  response.clearCookie(COOKIE_NAME, { ...sessionCookieOptions(), maxAge: undefined });
}

export async function requireAuth(request, response, next) {
  const token = request.cookies?.[COOKIE_NAME];
  if (!token) return response.status(401).json({ error: 'Authentication required.' });

  try {
    const payload = jwt.verify(token, getJwtSecret(), { issuer: 'smartspend-api' });
    const user = await User.findById(payload.sub).select('_id displayName email');
    if (!user) return response.status(401).json({ error: 'Authentication required.' });
    request.user = user;
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return response.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    return next(error);
  }
}

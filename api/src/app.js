import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import budgetRoutes from './routes/budgets.js';
import intelligenceRoutes from './routes/intelligence.js';
import transactionRoutes from './routes/transactions.js';
import { requireAuth } from './middleware/auth.js';

const app = express();
const webOrigin = process.env.WEB_ORIGIN;
if (process.env.NODE_ENV === 'production' && !process.env.WEB_ORIGIN) {
  throw new Error('WEB_ORIGIN must be configured in production.');
}
if (webOrigin) {
  let parsedOrigin;
  try {
    parsedOrigin = new URL(webOrigin);
  } catch {
    throw new Error('WEB_ORIGIN must be a valid origin URL.');
  }
  if (!['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.origin !== webOrigin) {
    throw new Error('WEB_ORIGIN must contain only the frontend origin, without a path or trailing slash.');
  }
}
const allowedOrigins = new Set([webOrigin || 'http://localhost:5173']);
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.add('http://localhost:5173');
  allowedOrigins.add('http://127.0.0.1:5173');
}

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  credentials: true,
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    const error = new Error('Origin is not allowed by CORS.');
    error.status = 403;
    return callback(error);
  },
}));
app.use('/api', (request, response, next) => {
  response.set('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 180, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/ai', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/api/health', (request, response) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  return response.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'unavailable',
    database: databaseConnected ? 'connected' : 'disconnected',
  });
});
app.use('/api/auth', authRoutes);
app.use('/api/transactions', requireAuth, transactionRoutes);
app.use('/api/budgets', requireAuth, budgetRoutes);
app.use('/api/ai', requireAuth, intelligenceRoutes);

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  if (error?.type === 'entity.parse.failed') return response.status(400).json({ error: 'Request body must be valid JSON.' });
  if (error?.type === 'entity.too.large') return response.status(413).json({ error: 'Request body is too large.' });
  if (error?.status === 403 && error?.message === 'Origin is not allowed by CORS.') {
    return response.status(403).json({ error: 'Origin is not allowed.' });
  }
  if (error?.name === 'MulterError' && error.code === 'LIMIT_FILE_SIZE') {
    return response.status(413).json({ error: 'Receipt image exceeds the 5 MB upload limit.' });
  }
  if (error?.name === 'MulterError') return response.status(400).json({ error: 'Receipt upload was rejected. Check the image and try again.' });
  if (error?.message === 'Receipt must be a JPEG, PNG, or WebP image.') return response.status(400).json({ error: error.message });
  if (error?.name === 'ValidationError') return response.status(400).json({ error: 'Submitted data did not pass validation.' });
  console.error('API request failed.', error?.message || 'Unknown error');
  return response.status(500).json({ error: 'The request could not be completed.' });
});

export default app;

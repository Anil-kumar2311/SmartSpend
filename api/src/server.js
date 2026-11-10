import mongoose from 'mongoose';
import app from './app.js';
import { getJwtSecret } from './middleware/auth.js';
import { Budget } from './models/Budget.js';
import { MerchantRule } from './models/MerchantRule.js';
import { Transaction } from './models/Transaction.js';
import { User } from './models/User.js';

const port = Number(process.env.PORT || 4000);
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) throw new Error('MONGODB_URI must be configured.');
getJwtSecret();

await mongoose.connect(mongoUri);
await Promise.all([User, Transaction, Budget, MerchantRule].map((model) => model.createIndexes()));
const server = app.listen(port, () => {
  console.log(`SmartSpend API listening on port ${port}.`);
});

async function shutdown(signal) {
  console.log(`${signal} received; closing SmartSpend API.`);
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

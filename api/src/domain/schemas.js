import { z } from 'zod';

export const EXPENSE_CATEGORIES = [
  'Food',
  'Groceries',
  'Housing',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Entertainment',
  'Travel',
  'Personal care',
  'Other',
];

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Investments',
  'Rental income',
  'Gifts',
  'Other',
];

export const ALL_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];
export const categorySchema = z.enum(ALL_CATEGORIES);
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Month must use YYYY-MM format.');
export const amountMinorSchema = z.number().int().positive().safe();
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Date must be a real calendar date.');

export const categorySuggestionSchema = z.object({
  category: categorySchema,
  confidence: z.number().min(0).max(1),
  reason: z.string().trim().min(1).max(180),
  source: z.enum(['personal_rule', 'merchant_rule', 'ai', 'fallback']),
}).strict();

export const receiptExtractionSchema = z.object({
  merchant: z.string().trim().min(1).max(120).nullable(),
  date: dateSchema.nullable(),
  amountMinor: amountMinorSchema.nullable(),
  taxMinor: z.number().int().nonnegative().safe().nullable(),
  items: z.array(z.string().trim().min(1).max(120)).max(30),
  confidence: z.object({
    merchant: z.number().min(0).max(1),
    date: z.number().min(0).max(1),
    amount: z.number().min(0).max(1),
  }).strict(),
  categorySuggestion: categorySuggestionSchema,
}).strict();

export const analysisSchema = z.object({
  insights: z.array(z.string().trim().min(1).max(180)).max(4),
}).strict();

export const savingsNarrativeSchema = z.object({
  recommendations: z.array(z.object({
    category: categorySchema,
    rationale: z.string().trim().min(1).max(180),
  }).strict()).max(4),
}).strict();

export const transactionInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  type: z.enum(['income', 'expense']),
  category: categorySchema,
  amountMinor: amountMinorSchema,
  date: dateSchema,
  merchant: z.string().trim().max(120).optional().default(''),
  notes: z.string().trim().max(500).optional().default(''),
}).strict().refine((value) => {
  return value.type === 'expense'
    ? EXPENSE_CATEGORIES.includes(value.category)
    : INCOME_CATEGORIES.includes(value.category);
}, { message: 'Category is not valid for this transaction type.', path: ['category'] });

export const budgetInputSchema = z.object({
  amountMinor: z.number().int().positive().safe(),
}).strict();

export const categorizationInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  merchant: z.string().trim().max(120).optional().default(''),
}).strict();

export const merchantRuleInputSchema = z.object({
  merchant: z.string().trim().min(2).max(120),
  category: z.enum(EXPENSE_CATEGORIES),
}).strict();

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildYearlyMonthlyReport } from './finance.js';

test('yearly monthly report groups saved income and expenses by month in minor units', () => {
  const report = buildYearlyMonthlyReport([
    { date: '2026-01-03', type: 'income', amountMinor: 200000 },
    { date: '2026-01-05', type: 'expense', amountMinor: 12550 },
    { date: '2026-01-10', type: 'expense', amountMinor: 2450 },
    { date: '2026-12-01', type: 'income', amountMinor: 30000 },
    { date: '2025-01-03', type: 'expense', amountMinor: 99999 },
  ], '2026');

  assert.equal(report.length, 12);
  assert.deepEqual(report[0], {
    month: '2026-01',
    label: 'January',
    incomeMinor: 200000,
    expenseMinor: 15000,
    netMinor: 185000,
    transactionCount: 3,
  });
  assert.deepEqual(report[11], {
    month: '2026-12',
    label: 'December',
    incomeMinor: 30000,
    expenseMinor: 0,
    netMinor: 30000,
    transactionCount: 1,
  });
});

test('yearly monthly report returns twelve zeroed months when no saved transactions match', () => {
  const report = buildYearlyMonthlyReport([], '2026');

  assert.equal(report.length, 12);
  assert.ok(report.every((month) => (
    month.incomeMinor === 0
    && month.expenseMinor === 0
    && month.netMinor === 0
    && month.transactionCount === 0
  )));
});

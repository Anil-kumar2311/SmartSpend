export function buildYearlyMonthlyReport(transactions, year) {
  const rows = Array.from({ length: 12 }, (_, index) => {
    const monthNumber = String(index + 1).padStart(2, '0');
    const month = `${year}-${monthNumber}`;
    const label = new Date(Date.UTC(Number(year), index, 1)).toLocaleDateString('en-IN', {
      month: 'long',
      timeZone: 'UTC',
    });

    return {
      month,
      label,
      incomeMinor: 0,
      expenseMinor: 0,
      netMinor: 0,
      transactionCount: 0,
    };
  });

  transactions.forEach((transaction) => {
    if (!transaction.date.startsWith(`${year}-`)) return;
    const monthIndex = Number(transaction.date.slice(5, 7)) - 1;
    const row = rows[monthIndex];
    if (!row) return;

    if (transaction.type === 'income') row.incomeMinor += transaction.amountMinor;
    else if (transaction.type === 'expense') row.expenseMinor += transaction.amountMinor;
    else return;

    row.transactionCount += 1;
    row.netMinor = row.incomeMinor - row.expenseMinor;
  });

  return rows;
}

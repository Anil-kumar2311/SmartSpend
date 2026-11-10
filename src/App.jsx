import { useEffect, useMemo, useState } from 'react';
import { apiRequest, toTransactionInput } from './api';
import { buildYearlyMonthlyReport } from './finance';
const THEME_KEY = 'expense-tracker-theme';
const EXPENSE_CATEGORIES = ['Food', 'Groceries', 'Housing', 'Transport', 'Shopping', 'Bills', 'Health', 'Entertainment', 'Travel', 'Personal care', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Investments', 'Rental income', 'Gifts', 'Other'];
const CATEGORY_COLORS = ['#397fbd', '#68a9e3', '#24537f', '#91bde5', '#55718e', '#b6d5f1', '#728ba6', '#a9b8c8'];
const CURRENCY = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const icons = {
  logo: <><path d="M4 13.2 9.2 8l3.2 3.2L20 3.5" /><path d="M14.8 3.5H20v5.2" /><path d="M4 18.5h16" /></>,
  dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="4" rx="1.5" /><rect x="13.5" y="9.5" width="7" height="11" rx="1.5" /><rect x="3.5" y="12.5" width="7" height="8" rx="1.5" /></>,
  transactions: <><path d="M7 4.5h10a2 2 0 0 1 2 2v13H5v-13a2 2 0 0 1 2-2Z" /><path d="M8.5 9h7M8.5 13h7M8.5 17h4" /><path d="M9 4.5V3h6v1.5" /></>,
  analytics: <><path d="M4 19.5h16" /><path d="M6.5 16v-4M11 16V7M15.5 16v-7M20 16V4" /></>,
  brain: <><path d="M12 18V5" /><path d="M12 5a4 4 0 0 0-7.5 2 4 4 0 0 0 .4 7.8A3.5 3.5 0 0 0 12 18" /><path d="M12 5a4 4 0 0 1 7.5 2 4 4 0 0 1-.4 7.8A3.5 3.5 0 0 1 12 18" /><path d="M8 9h.01M16 9h.01M7 14h.01M17 14h.01" /></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  upload: <><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M4 16v4h16v-4" /></>,
  camera: <><path d="M4 7h3l1.5-2h7L17 7h3v12H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 0 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V2a1.7 1.7 0 0 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2 2.9Z" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.2 4.2" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
  moon: <path d="M20.2 15.1A8.3 8.3 0 0 1 8.9 3.8 8.5 8.5 0 1 0 20.2 15.1Z" />,
  arrowUp: <><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></>,
  arrowDown: <><path d="M12 5v14" /><path d="m18 13-6 6-6-6" /></>,
  arrowRight: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  trash: <><path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M7.5 3v4M16.5 3v4M3.5 10h17" /></>,
  wallet: <><path d="M4 6.5h15a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2h13" /><path d="M16 13h5M16 13a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z" /></>,
  spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
  check: <path d="m5 12 4 4L19 6" />,
};

function Icon({ name, size = 20, className = '' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[name] || icons.spark}
    </svg>
  );
}

function localDateValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function storedTheme() {
  try {
    const theme = localStorage.getItem(THEME_KEY);
    return theme === 'light' || theme === 'dark' ? theme : 'light';
  } catch (error) {
    console.error('Unable to load saved appearance preference.', error);
    return 'light';
  }
}

function formatCurrency(value) {
  return CURRENCY.format(Number(value) || 0);
}

function formatCurrencyMinor(value) {
  return formatCurrency(Number(value) / 100);
}

function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return 'Date unavailable';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString('en-IN', options);
}

function EmptyState({ title, description, action, onAction, compact = false }) {
  return (
    <div className={`empty-state${compact ? ' empty-state--compact' : ''}`}>
      <span className="empty-icon"><Icon name="transactions" size={21} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <button className="button button--secondary button--small" type="button" onClick={onAction}>{action}</button>}
    </div>
  );
}

function ReceiptReview({ draft, setDraft, onDiscard, onSave, saveLabel }) {
  return (
    <div className="receipt-review">
      <div className="receipt-review-heading">
        <div><strong>Review extracted details</strong><span>OCR confidence is shown per field. Correct anything that looks wrong.</span></div>
        <button aria-label="Discard receipt scan" className="icon-button" onClick={onDiscard} type="button"><Icon name="close" size={17} /></button>
      </div>
      <div className="receipt-fields">
        <label className="form-field"><span>Merchant · {Math.round(draft.confidence.merchant * 100)}% confidence</span><input onChange={(event) => setDraft((current) => ({ ...current, merchant: event.target.value || null }))} value={draft.merchant || ''} /></label>
        <label className="form-field"><span>Amount · {Math.round(draft.confidence.amount * 100)}% confidence</span><div className="amount-input"><span>₹</span><input min="0.01" onChange={(event) => setDraft((current) => ({ ...current, amountMinor: event.target.value ? Math.round(Number(event.target.value) * 100) : null }))} step="0.01" type="number" value={draft.amountMinor ? (draft.amountMinor / 100).toFixed(2) : ''} /></div></label>
        <label className="form-field"><span>Date · {Math.round(draft.confidence.date * 100)}% confidence</span><input max={localDateValue()} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value || null }))} type="date" value={draft.date || ''} /></label>
        <label className="form-field"><span>Category</span><select onChange={(event) => setDraft((current) => ({ ...current, categorySuggestion: { ...current.categorySuggestion, category: event.target.value } }))} value={draft.categorySuggestion.category}>{EXPENSE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
      </div>
      {draft.items.length > 0 && <p className="receipt-items"><strong>Recognized lines:</strong> {draft.items.join(' · ')}</p>}
      <button className="button button--primary" disabled={!draft.amountMinor} onClick={onSave} type="button">{saveLabel}</button>
    </div>
  );
}

function Skeleton({ className = '' }) {
  return <span aria-hidden="true" className={`skeleton ${className}`} />;
}

function TransactionRow({ transaction, onRemove, compact = false }) {
  const isIncome = transaction.type === 'income';
  return (
    <div className={`transaction-row${compact ? ' transaction-row--compact' : ''}`}>
      <span className={`transaction-avatar ${isIncome ? 'transaction-avatar--income' : ''}`}>
        <Icon name={isIncome ? 'arrowDown' : 'arrowUp'} size={17} />
      </span>
      <div className="transaction-description">
        <strong>{transaction.title}</strong>
        <span>{transaction.category} <i aria-hidden="true">·</i> {formatDate(transaction.date)}</span>
      </div>
      <strong className={`transaction-amount ${isIncome ? 'text-positive' : ''}`}>
        {isIncome ? '+' : '−'}{formatCurrencyMinor(transaction.amountMinor)}
      </strong>
      {onRemove && (
        <button
          aria-label={`Remove ${transaction.title}`}
          className="icon-button transaction-delete"
          onClick={() => onRemove(transaction.id)}
          title="Remove transaction"
          type="button"
        >
          <Icon name="trash" size={17} />
        </button>
      )}
    </div>
  );
}

function CashflowChart({ groups, loading }) {
  if (loading) {
    return <div className="chart-skeleton"><Skeleton /><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>;
  }
  if (!groups.some((group) => group.incomeMinor || group.expenseMinor)) {
    return <EmptyState compact title="No cash flow yet" description="Add a transaction to see your income and spending trend." />;
  }

  const max = Math.max(1, ...groups.flatMap((group) => [group.incomeMinor, group.expenseMinor]));
  return (
    <div className="cashflow-chart" role="img" aria-label="Weekly income and expense comparison for the selected month">
      <div className="chart-grid" aria-hidden="true"><span /><span /><span /><span /></div>
      <div className="chart-columns">
        {groups.map((group) => (
          <div className="chart-column" key={group.label}>
            <div className="chart-bars">
              <span className="chart-bar chart-bar--income" style={{ height: `${Math.max(group.incomeMinor ? 4 : 0, (group.incomeMinor / max) * 100)}%` }} title={`Income ${formatCurrencyMinor(group.incomeMinor)}`} />
              <span className="chart-bar chart-bar--expense" style={{ height: `${Math.max(group.expenseMinor ? 4 : 0, (group.expenseMinor / max) * 100)}%` }} title={`Expenses ${formatCurrencyMinor(group.expenseMinor)}`} />
            </div>
            <span className="chart-label">{group.label}</span>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span><i className="legend-dot legend-dot--income" /> Income</span>
        <span><i className="legend-dot legend-dot--expense" /> Expenses</span>
      </div>
    </div>
  );
}

function CategoryChart({ categories, loading }) {
  if (loading) {
    return <div className="category-skeleton"><Skeleton className="skeleton-ring" /><div><Skeleton /><Skeleton /><Skeleton /></div></div>;
  }
  if (!categories.length) {
    return <EmptyState compact title="Nothing to break down" description="Your category insights will show here after your first expense." />;
  }

  const total = categories.reduce((sum, item) => sum + item.amountMinor, 0);
  let start = 0;
  const stops = categories.map((item, index) => {
    const end = start + (item.amountMinor / total) * 100;
    const stop = `${CATEGORY_COLORS[index % CATEGORY_COLORS.length]} ${start}% ${end}%`;
    start = end;
    return stop;
  }).join(', ');

  return (
    <div className="category-chart">
      <div className="donut-wrap">
        <div className="donut" role="img" aria-label={`Total spending ${formatCurrencyMinor(total)} across ${categories.length} categories`} style={{ background: `conic-gradient(${stops})` }}>
          <div className="donut-hole">
            <span>Total spent</span>
            <strong>{formatCurrencyMinor(total)}</strong>
          </div>
        </div>
      </div>
      <ul className="category-legend">
        {categories.slice(0, 5).map((item, index) => (
          <li key={item.category}>
            <span><i className="legend-dot" style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />{item.category}</span>
            <strong>{formatCurrencyMinor(item.amountMinor)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function App() {
  const [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ displayName: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [theme, setTheme] = useState(storedTheme);
  const [page, setPage] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState(localDateValue().slice(0, 7));
  const [reportYear, setReportYear] = useState(localDateValue().slice(0, 4));
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [form, setForm] = useState({
    title: '',
    amount: '',
    type: 'expense',
    category: 'Food',
    date: localDateValue(),
    merchant: '',
  });
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [transactionRevision, setTransactionRevision] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [categorySuggestion, setCategorySuggestion] = useState(null);
  const [rememberingMerchant, setRememberingMerchant] = useState(false);
  const [intelligence, setIntelligence] = useState(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [intelligenceError, setIntelligenceError] = useState('');
  const [budgetDraft, setBudgetDraft] = useState('');
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptDraft, setReceiptDraft] = useState(null);

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      try {
        const { user: sessionUser } = await apiRequest('/auth/me');
        if (!active) return;
        const { transactions: savedTransactions } = await apiRequest('/transactions');
        if (!active) return;
        setUser(sessionUser);
        setTransactions(savedTransactions);
        setIsHydrated(true);
      } catch (error) {
        if (!active) return;
        setIsHydrated(true);
        if (error.status !== 401) {
          setAuthError('Could not connect to SmartSpend right now. Start the API and try again.');
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    };
    loadSession();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      console.error('Unable to save appearance preference.', error);
    }
  }, [theme]);

  useEffect(() => {
    if (!user || page !== 'insights') return undefined;
    const controller = new AbortController();
    setIntelligenceLoading(true);
    setIntelligenceError('');
    apiRequest(`/ai/insights?month=${encodeURIComponent(selectedMonth)}`, { signal: controller.signal })
      .then((result) => {
        setIntelligence(result);
        setBudgetDraft(result.forecast.budgetMinor ? (result.forecast.budgetMinor / 100).toFixed(2) : '');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setIntelligenceError(error.message || 'Smart insights could not be loaded.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIntelligenceLoading(false);
      });
    return () => controller.abort();
  }, [user, page, selectedMonth, transactionRevision]);

  useEffect(() => {
    if (!user || !isFormOpen || form.type !== 'expense' || form.title.trim().length < 2) {
      setCategorySuggestion(null);
      return undefined;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      apiRequest('/ai/categorize', {
        method: 'POST',
        signal: controller.signal,
        body: JSON.stringify({ title: form.title, merchant: form.merchant }),
      })
        .then(({ suggestion }) => setCategorySuggestion(suggestion))
        .catch((error) => {
          if (error.name !== 'AbortError') console.warn('Category suggestion is unavailable.', error.message);
        });
    }, 350);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [user, isFormOpen, form.title, form.merchant, form.type]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!isFormOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsFormOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormOpen]);

  const monthTransactions = useMemo(
    () => transactions.filter((item) => item.date.startsWith(selectedMonth)),
    [transactions, selectedMonth],
  );

  const availableReportYears = useMemo(() => [...new Set([
    localDateValue().slice(0, 4),
    ...transactions.map((item) => item.date.slice(0, 4)),
  ])].sort((a, b) => b.localeCompare(a)), [transactions]);

  const yearlyMonthlyReport = useMemo(
    () => buildYearlyMonthlyReport(transactions, reportYear),
    [transactions, reportYear],
  );

  const yearlyTotals = useMemo(() => yearlyMonthlyReport.reduce((totals, month) => ({
    incomeMinor: totals.incomeMinor + month.incomeMinor,
    expenseMinor: totals.expenseMinor + month.expenseMinor,
    netMinor: totals.netMinor + month.netMinor,
    transactionCount: totals.transactionCount + month.transactionCount,
  }), { incomeMinor: 0, expenseMinor: 0, netMinor: 0, transactionCount: 0 }), [yearlyMonthlyReport]);

  const totals = useMemo(() => monthTransactions.reduce((sum, item) => {
    if (item.type === 'income') sum.incomeMinor += item.amountMinor;
    else sum.expenseMinor += item.amountMinor;
    sum.balanceMinor = sum.incomeMinor - sum.expenseMinor;
    return sum;
  }, { incomeMinor: 0, expenseMinor: 0, balanceMinor: 0 }), [monthTransactions]);

  const categoryTotals = useMemo(() => {
    const grouped = new Map();
    monthTransactions.filter((item) => item.type === 'expense').forEach((item) => {
      grouped.set(item.category, (grouped.get(item.category) || 0) + item.amountMinor);
    });
    return [...grouped.entries()]
      .map(([category, amountMinor]) => ({ category, amountMinor }))
      .sort((a, b) => b.amountMinor - a.amountMinor);
  }, [monthTransactions]);

  const cashflowGroups = useMemo(() => {
    const groups = Array.from({ length: 5 }, (_, index) => ({
      label: `Week ${index + 1}`,
      incomeMinor: 0,
      expenseMinor: 0,
    }));
    monthTransactions.forEach((item) => {
      const day = Number(item.date.slice(8, 10));
      if (!Number.isFinite(day) || day < 1) return;
      const group = groups[Math.min(Math.ceil(day / 7), 5) - 1];
      group[item.type === 'income' ? 'incomeMinor' : 'expenseMinor'] += item.amountMinor;
    });
    return groups;
  }, [monthTransactions]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...transactions]
      .filter((item) => typeFilter === 'all' || item.type === typeFilter)
      .filter((item) => !query || `${item.title} ${item.category}`.toLowerCase().includes(query))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, search, typeFilter]);

  const largestExpense = useMemo(
    () => monthTransactions.filter((item) => item.type === 'expense').reduce((largest, item) => Math.max(largest, item.amountMinor), 0),
    [monthTransactions],
  );

  const averageDailySpend = useMemo(() => {
    const daysWithExpenses = new Set(monthTransactions.filter((item) => item.type === 'expense').map((item) => item.date)).size;
    return daysWithExpenses ? Math.round(totals.expenseMinor / daysWithExpenses) : 0;
  }, [monthTransactions, totals.expenseMinor]);

  const showToast = (message, type = 'success') => {
    setToast({ id: Date.now() + Math.random(), type, message });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name === 'type') {
      const options = value === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      setCategorySuggestion(null);
      setCategoryTouched(false);
      setForm((current) => ({ ...current, type: value, category: options.includes(current.category) ? current.category : options[0] }));
      return;
    }
    setForm((current) => {
      return { ...current, [name]: value };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const title = form.title.trim();
    const amount = Number(form.amount);

    if (!title || !Number.isFinite(amount) || amount <= 0 || !form.date) {
      showToast('Add a title, a valid amount, and a date before saving.', 'error');
      return;
    }

    const transactionInput = {
      title,
      amount,
      type: form.type,
      category: form.category,
      date: form.date,
      merchant: form.merchant.trim(),
    };

    try {
      const { transaction } = await apiRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify(toTransactionInput(transactionInput)),
      });
      setTransactions((current) => [transaction, ...current]);
      setTransactionRevision((revision) => revision + 1);
      setSelectedMonth(form.date.slice(0, 7));
      setForm({ title: '', amount: '', type: 'expense', category: 'Food', date: localDateValue(), merchant: '' });
      setCategorySuggestion(null);
      setCategoryTouched(false);
      setIsFormOpen(false);
      showToast(`${form.type === 'income' ? 'Income' : 'Expense'} added.`);
    } catch (error) {
      showToast(error.message || 'The transaction could not be saved.', 'error');
    }
  };

  const removeTransaction = async (id) => {
    const removed = transactions.find((item) => item.id === id);
    if (!removed) return;
    try {
      await apiRequest(`/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' });
      setTransactions((current) => current.filter((item) => item.id !== id));
      setTransactionRevision((revision) => revision + 1);
      showToast('Transaction removed.');
    } catch (error) {
      showToast(error.message || 'The transaction could not be removed.', 'error');
    }
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError('');
    setAuthSubmitting(true);
    const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';
    const body = authMode === 'register'
      ? authForm
      : { email: authForm.email, password: authForm.password };
    try {
      const { user: authenticatedUser } = await apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body) });
      const { transactions: savedTransactions } = await apiRequest('/transactions');
      setUser(authenticatedUser);
      setTransactions(savedTransactions);
      setAuthForm({ displayName: '', email: '', password: '' });
      setAuthError('');
      setIsHydrated(true);
    } catch (error) {
      setAuthError(error.message || 'Sign in failed. Please try again.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
      setUser(null);
      setTransactions([]);
      setIntelligence(null);
      setPage('dashboard');
      setAuthError('');
      setAuthMode('login');
    } catch (error) {
      showToast(error.message || 'Could not sign out.', 'error');
    }
  };

  const rememberMerchantCategory = async () => {
    if (!form.merchant.trim()) return;
    setRememberingMerchant(true);
    try {
      await apiRequest('/ai/merchant-rules', {
        method: 'POST',
        body: JSON.stringify({ merchant: form.merchant, category: form.category }),
      });
      showToast(`Saved ${form.category} for ${form.merchant}.`);
    } catch (error) {
      showToast(error.message || 'The merchant preference could not be saved.', 'error');
    } finally {
      setRememberingMerchant(false);
    }
  };

  const saveBudget = async (event) => {
    event.preventDefault();
    const amount = Number(budgetDraft);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast('Enter a monthly budget greater than zero.', 'error');
      return;
    }
    setBudgetSaving(true);
    try {
      await apiRequest(`/budgets/${encodeURIComponent(selectedMonth)}`, {
        method: 'PUT',
        body: JSON.stringify({ amountMinor: Math.round(amount * 100) }),
      });
      const result = await apiRequest(`/ai/insights?month=${encodeURIComponent(selectedMonth)}`);
      setIntelligence(result);
      setBudgetDraft((result.forecast.budgetMinor / 100).toFixed(2));
      showToast('Monthly budget updated.');
    } catch (error) {
      showToast(error.message || 'Budget could not be saved.', 'error');
    } finally {
      setBudgetSaving(false);
    }
  };

  const scanReceipt = async (event) => {
    event?.preventDefault();
    if (!receiptFile) {
      showToast('Choose a receipt image first.', 'error');
      return;
    }
    setReceiptBusy(true);
    const formData = new FormData();
    formData.append('receipt', receiptFile);
    try {
      const { extraction } = await apiRequest('/ai/receipt-scan', { method: 'POST', body: formData });
      setReceiptDraft(extraction);
      showToast('Receipt scanned. Review the extracted details before saving.');
    } catch (error) {
      showToast(error.message || 'Receipt scanning failed. You can add the transaction manually.', 'error');
    } finally {
      setReceiptBusy(false);
    }
  };

  const saveReceiptTransaction = async (closeForm = false) => {
    if (!receiptDraft?.amountMinor || !receiptDraft.categorySuggestion?.category) {
      showToast('A receipt amount could not be confirmed. Add the transaction manually.', 'error');
      return;
    }
    const transactionInput = {
      title: receiptDraft.merchant || 'Receipt purchase',
      type: 'expense',
      category: receiptDraft.categorySuggestion.category,
      amountMinor: receiptDraft.amountMinor,
      date: receiptDraft.date || localDateValue(),
      merchant: receiptDraft.merchant || '',
    };
    try {
      const { transaction } = await apiRequest('/transactions', { method: 'POST', body: JSON.stringify(transactionInput) });
      setTransactions((current) => [transaction, ...current]);
      setTransactionRevision((revision) => revision + 1);
      setSelectedMonth(transaction.date.slice(0, 7));
      setReceiptDraft(null);
      setReceiptFile(null);
      if (closeForm) setIsFormOpen(false);
      showToast('Receipt transaction saved.');
    } catch (error) {
      showToast(error.message || 'The receipt transaction could not be saved.', 'error');
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'transactions', label: 'Transactions', icon: 'transactions' },
    { id: 'analytics', label: 'Analytics', icon: 'analytics' },
    { id: 'insights', label: 'AI insights', icon: 'brain' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const pageMeta = {
    dashboard: ['Good to see you', 'Here’s your financial snapshot. Your insights are based on saved transactions.'],
    transactions: ['Transactions', 'Keep track of the money coming in and going out.'],
    analytics: ['Analytics', 'A clearer view of your financial activity, based on your records.'],
    insights: ['Smart insights', 'Personalized analysis and forecasts from your authenticated transaction history.'],
    settings: ['Settings', 'Make SmartSpend feel like your own.'],
  };

  const monthLabel = new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  if (authLoading) {
    return (
      <div className="auth-shell" data-theme={theme}>
        <div className="auth-loading"><span className="brand-mark"><Icon name="logo" size={23} /></span><Skeleton /><Skeleton /></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-shell" data-theme={theme}>
        <div className="auth-decoration"><span className="auth-orbit auth-orbit--one" /><span className="auth-orbit auth-orbit--two" /><div className="auth-promise"><span className="brand-mark"><Icon name="logo" size={24} /></span><strong>Clarity for your<br />money decisions.</strong><p>Private, personal finance intelligence built around your own transaction history.</p></div></div>
        <main className="auth-main">
          <div className="auth-card">
            <a className="brand auth-brand" href="#login"><span className="brand-mark"><Icon name="logo" size={22} /></span><span className="brand-name">smartspend<span>AI</span></span></a>
            <p className="eyebrow">{authMode === 'login' ? 'Welcome back' : 'Get started'}</p>
            <h1>{authMode === 'login' ? 'Sign in to SmartSpend' : 'Create your account'}</h1>
            <p className="auth-subtitle">Your financial data is private to your account and used only to power your insights.</p>
            {authError && <div className="auth-error" role="alert">{authError}</div>}
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'register' && <label className="form-field"><span>Your name</span><input autoComplete="name" maxLength="80" minLength="2" onChange={(event) => setAuthForm((current) => ({ ...current, displayName: event.target.value }))} required value={authForm.displayName} /></label>}
              <label className="form-field"><span>Email address</span><input autoComplete="email" onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))} required type="email" value={authForm.email} /></label>
              <label className="form-field"><span>Password <small>at least 10 characters</small></span><input autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} minLength="10" onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))} required type="password" value={authForm.password} /></label>
              <button className="button button--primary auth-submit" disabled={authSubmitting} type="submit">{authSubmitting ? 'Please wait…' : authMode === 'login' ? 'Sign in' : 'Create account'}<Icon name="arrowRight" size={17} /></button>
            </form>
            <p className="auth-switch">{authMode === 'login' ? 'New to SmartSpend?' : 'Already have an account?'} <button onClick={() => { setAuthMode((current) => current === 'login' ? 'register' : 'login'); setAuthError(''); }} type="button">{authMode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
            <p className="auth-security"><Icon name="wallet" size={15} />Encrypted session · Your transaction data stays yours</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell" data-theme={theme}>
      <aside className="sidebar">
        <a className="brand" href="#dashboard" onClick={() => setPage('dashboard')}>
          <span className="brand-mark"><Icon name="logo" size={23} /></span>
          <span className="brand-name">smartspend<span>AI</span></span>
        </a>
        <div className="sidebar-label">Workspace</div>
        <nav aria-label="Main navigation" className="side-nav">
          {navItems.map((item) => (
            <button
              aria-current={page === item.id ? 'page' : undefined}
              className={`nav-item${page === item.id ? ' nav-item--active' : ''}`}
              key={item.id}
              onClick={() => setPage(item.id)}
              type="button"
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
              {page === item.id && <i aria-hidden="true" className="nav-indicator" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="privacy-card">
            <span className="privacy-icon"><Icon name="wallet" size={17} /></span>
            <div><strong>Your data, your control</strong><span>Scoped to your signed-in account</span></div>
          </div>
          <div className="profile-chip">
            <span className="profile-avatar">{user.displayName.slice(0, 1).toUpperCase()}</span>
            <span><strong>{user.displayName}</strong><small>{user.email}</small></span>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark"><Icon name="logo" size={21} /></span>
            <span className="brand-name">smartspend<span>AI</span></span>
          </div>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>{pageMeta[page][0]}</strong></div>
          <div className="topbar-actions">
            <button
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              className="icon-button theme-toggle"
              onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              type="button"
            >
              <Icon name={theme === 'light' ? 'moon' : 'sun'} size={19} />
            </button>
            <button className="button button--primary top-add-button" onClick={() => setIsFormOpen(true)} type="button">
              <Icon name="plus" size={18} /><span>Add transaction</span>
            </button>
          </div>
        </header>

        <main className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">{page === 'dashboard' ? 'Your money, in focus' : 'SmartSpend AI'}</p>
              <h1>{pageMeta[page][0]}{page === 'dashboard' && <span className="heading-period">.</span>}</h1>
              <p className="page-subtitle">{pageMeta[page][1]}</p>
            </div>
            {(page === 'dashboard' || page === 'insights') && (
              <label className="month-picker">
                <Icon name="calendar" size={17} />
                <span className="visually-hidden">Select month</span>
                <input aria-label="Select month" max={localDateValue().slice(0, 7)} onChange={(event) => setSelectedMonth(event.target.value)} type="month" value={selectedMonth} />
              </label>
            )}
          </div>

          {!isHydrated ? (
            <div className="dashboard-skeleton" aria-label="Loading saved transactions">
              <div className="stat-grid">{[1, 2, 3].map((item) => <div className="skeleton-stat" key={item}><Skeleton /><Skeleton /><Skeleton /></div>)}</div>
              <div className="content-grid"><div className="skeleton-panel"><Skeleton /><Skeleton className="skeleton-chart" /></div><div className="skeleton-panel"><Skeleton /><Skeleton className="skeleton-chart" /></div></div>
              <div className="skeleton-panel"><Skeleton /><Skeleton className="skeleton-row" /><Skeleton className="skeleton-row" /><Skeleton className="skeleton-row" /></div>
            </div>
          ) : (
            <>
              {page === 'dashboard' && (
                <div className="dashboard-page">
                  <section aria-label={`Financial summary for ${monthLabel}`} className="stat-grid">
                    <article className="stat-card stat-card--balance">
                      <div className="stat-card-top"><span className="stat-icon"><Icon name="wallet" size={19} /></span><span className="stat-label">Net balance</span></div>
                      <strong className="stat-value">{formatCurrencyMinor(totals.balanceMinor)}</strong>
                      <span className="stat-caption">{monthLabel} · income less expenses</span>
                    </article>
                    <article className="stat-card">
                      <div className="stat-card-top"><span className="stat-icon stat-icon--positive"><Icon name="arrowDown" size={19} /></span><span className="stat-label">Income</span></div>
                      <strong className="stat-value">{formatCurrencyMinor(totals.incomeMinor)}</strong>
                      <span className="stat-caption">{monthLabel} · recorded income</span>
                    </article>
                    <article className="stat-card">
                      <div className="stat-card-top"><span className="stat-icon stat-icon--negative"><Icon name="arrowUp" size={19} /></span><span className="stat-label">Expenses</span></div>
                      <strong className="stat-value">{formatCurrencyMinor(totals.expenseMinor)}</strong>
                      <span className="stat-caption">{monthLabel} · recorded spending</span>
                    </article>
                  </section>

                  <section className="content-grid">
                    <article className="panel chart-panel">
                      <div className="panel-heading">
                        <div><h2>Cash flow</h2><p>Income and expenses by week</p></div>
                        <span className="panel-period">{monthLabel}</span>
                      </div>
                      <CashflowChart groups={cashflowGroups} loading={!isHydrated} />
                    </article>
                    <article className="panel category-panel">
                      <div className="panel-heading">
                        <div><h2>Spending breakdown</h2><p>Expenses by category</p></div>
                        <span className="panel-icon"><Icon name="analytics" size={18} /></span>
                      </div>
                      <CategoryChart categories={categoryTotals} loading={!isHydrated} />
                    </article>
                  </section>

                  <section className="panel transactions-panel">
                    <div className="panel-heading">
                      <div><h2>Recent transactions</h2><p>Your latest recorded activity</p></div>
                      {transactions.length > 0 && <button className="text-button" onClick={() => setPage('transactions')} type="button">View all <Icon name="arrowRight" size={16} /></button>}
                    </div>
                    {transactions.length === 0 ? (
                      <EmptyState title="Your money story starts here" description="Add your first income or expense to see your balance, trends, and category insights." action="Add a transaction" onAction={() => setIsFormOpen(true)} />
                    ) : (
                      <div className="transaction-list">
                        {monthTransactions.length === 0 ? (
                          <EmptyState compact title={`No activity in ${monthLabel}`} description="Choose another month or add a transaction for this period." action="Add transaction" onAction={() => setIsFormOpen(true)} />
                        ) : monthTransactions.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((item) => <TransactionRow key={item.id} transaction={item} onRemove={removeTransaction} />)}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {page === 'transactions' && (
                <section className="panel page-panel">
                  <div className="list-toolbar">
                    <div className="search-field">
                      <Icon name="search" size={18} />
                      <input aria-label="Search transactions" onChange={(event) => setSearch(event.target.value)} placeholder="Search title or category" value={search} />
                    </div>
                    <div className="filter-group" aria-label="Filter transaction type">
                      {['all', 'income', 'expense'].map((filter) => (
                        <button aria-pressed={typeFilter === filter} className={`filter-button${typeFilter === filter ? ' filter-button--active' : ''}`} key={filter} onClick={() => setTypeFilter(filter)} type="button">
                          {filter[0].toUpperCase() + filter.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="table-heading"><span>Transaction</span><span>Category</span><span>Date</span><span className="align-right">Amount</span><span /></div>
                  {filteredTransactions.length === 0 ? (
                    <EmptyState title={transactions.length ? 'No matching transactions' : 'No transactions yet'} description={transactions.length ? 'Try another search or filter to find a record.' : 'Add income or expenses to build your transaction history.'} action={!transactions.length ? 'Add a transaction' : undefined} onAction={() => setIsFormOpen(true)} />
                  ) : (
                    <div className="transaction-table">
                      {filteredTransactions.map((item) => (
                        <div className="table-row" key={item.id}>
                          <div className="table-title"><span className={`transaction-avatar ${item.type === 'income' ? 'transaction-avatar--income' : ''}`}><Icon name={item.type === 'income' ? 'arrowDown' : 'arrowUp'} size={17} /></span><strong>{item.title}</strong></div>
                          <span className="table-category">{item.category}</span>
                          <span className="table-date">{formatDate(item.date)}</span>
                          <strong className={`table-amount align-right ${item.type === 'income' ? 'text-positive' : ''}`}>{item.type === 'income' ? '+' : '−'}{formatCurrencyMinor(item.amountMinor)}</strong>
                          <button aria-label={`Remove ${item.title}`} className="icon-button transaction-delete" onClick={() => removeTransaction(item.id)} title="Remove transaction" type="button"><Icon name="trash" size={17} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="list-footer">{filteredTransactions.length} {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}</div>
                </section>
              )}

              {page === 'analytics' && (
                <div className="analytics-page">
                  <section className="panel annual-report">
                    <div className="panel-heading annual-report-heading">
                      <div><h2>Yearly monthly report</h2><p>Monthly totals from your saved transactions</p></div>
                      <label className="year-picker">
                        <span className="visually-hidden">Report year</span>
                        <select aria-label="Report year" onChange={(event) => { setReportYear(event.target.value); setSelectedMonth(`${event.target.value}-${selectedMonth.slice(5)}`); }} value={reportYear}>
                          {availableReportYears.map((year) => <option key={year} value={year}>{year}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="analytics-stat-grid annual-summary">
                      <article className="stat-card"><span className="stat-label">Year income</span><strong className="stat-value">{formatCurrencyMinor(yearlyTotals.incomeMinor)}</strong><span className="stat-caption">{reportYear} · saved transactions</span></article>
                      <article className="stat-card"><span className="stat-label">Year expenses</span><strong className="stat-value">{formatCurrencyMinor(yearlyTotals.expenseMinor)}</strong><span className="stat-caption">{reportYear} · saved transactions</span></article>
                      <article className="stat-card"><span className="stat-label">Net cash flow</span><strong className="stat-value">{formatCurrencyMinor(yearlyTotals.netMinor)}</strong><span className="stat-caption">{yearlyTotals.transactionCount} recorded transactions</span></article>
                    </div>
                    <div className="annual-table-scroll">
                      <table className="annual-table">
                        <thead><tr><th scope="col">Month</th><th scope="col">Income</th><th scope="col">Expenses</th><th scope="col">Net</th><th scope="col">Transactions</th></tr></thead>
                        <tbody>{yearlyMonthlyReport.map((month) => (
                          <tr key={month.month}>
                            <th scope="row"><button aria-pressed={selectedMonth === month.month} className="report-month-link" onClick={() => setSelectedMonth(month.month)} type="button">{month.label}</button></th>
                            <td>{formatCurrencyMinor(month.incomeMinor)}</td>
                            <td>{formatCurrencyMinor(month.expenseMinor)}</td>
                            <td>{formatCurrencyMinor(month.netMinor)}</td>
                            <td>{month.transactionCount}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <p className="annual-report-note">Select a month to view its detailed spending charts below. Only your saved transactions are included.</p>
                  </section>
                  <section className="analytics-stat-grid">
                    <article className="stat-card"><span className="stat-label">Total spending</span><strong className="stat-value">{formatCurrencyMinor(totals.expenseMinor)}</strong><span className="stat-caption">{monthLabel}</span></article>
                    <article className="stat-card"><span className="stat-label">Average spend day</span><strong className="stat-value">{formatCurrencyMinor(averageDailySpend)}</strong><span className="stat-caption">Average across days with expenses</span></article>
                    <article className="stat-card"><span className="stat-label">Largest expense</span><strong className="stat-value">{formatCurrencyMinor(largestExpense)}</strong><span className="stat-caption">Single recorded expense</span></article>
                  </section>
                  <section className="content-grid">
                    <article className="panel chart-panel"><div className="panel-heading"><div><h2>Cash flow</h2><p>Weekly income and expenses</p></div><span className="panel-period">{monthLabel}</span></div><CashflowChart groups={cashflowGroups} loading={false} /></article>
                    <article className="panel category-panel"><div className="panel-heading"><div><h2>Category breakdown</h2><p>Where your expenses are recorded</p></div></div><CategoryChart categories={categoryTotals} loading={false} /></article>
                  </section>
                  <div className="analytics-note"><Icon name="spark" size={17} /><span>Insights are calculated from your authenticated transaction history. No sample transactions are included.</span></div>
                </div>
              )}

              {page === 'insights' && (
                <div className="intelligence-page">
                  {intelligenceError && <div className="auth-error" role="alert">{intelligenceError}</div>}
                  {intelligenceLoading ? (
                    <div className="dashboard-skeleton">
                      <div className="analytics-stat-grid">{[1, 2, 3].map((item) => <div className="skeleton-stat" key={item}><Skeleton /><Skeleton /><Skeleton /></div>)}</div>
                      <div className="skeleton-panel"><Skeleton /><Skeleton className="skeleton-row" /><Skeleton className="skeleton-row" /></div>
                    </div>
                  ) : intelligence && (
                    <>
                      <section className="panel intelligence-overview">
                        <div className="panel-heading"><div><h2>Personal spending analysis</h2><p>Calculated from your transactions for {monthLabel}</p></div><span className="insight-badge"><Icon name="brain" size={15} />Private insights</span></div>
                        {intelligence.analysis.insights.length ? (
                          <ul className="insight-list">{intelligence.analysis.insights.map((insight) => <li key={insight}><span className="insight-bullet"><Icon name="spark" size={15} /></span>{insight}</li>)}</ul>
                        ) : (
                          <EmptyState compact title="More history, better insights" description="Add an expense to start seeing patterns in your actual spending." />
                        )}
                        <div className="analysis-facts">
                          <div><span>Recorded expenses</span><strong>{intelligence.analysis.summary.expenseCount}</strong></div>
                          <div><span>Top category</span><strong>{intelligence.analysis.summary.topCategory || 'Not enough data'}</strong></div>
                          <div><span>Change vs. previous month</span><strong>{intelligence.analysis.summary.changePercent === null ? 'Not enough history' : `${intelligence.analysis.summary.changePercent > 0 ? '+' : ''}${intelligence.analysis.summary.changePercent}%`}</strong></div>
                        </div>
                      </section>

                      <section className="content-grid">
                        <article className="panel forecast-panel">
                          <div className="panel-heading"><div><h2>Monthly budget forecast</h2><p>Projection from recorded spending and recent history</p></div><span className={`forecast-status forecast-status--${intelligence.forecast.status}`}>{intelligence.forecast.status === 'at_risk' ? 'Above budget' : intelligence.forecast.status === 'on_track' ? 'On track' : 'Needs history'}</span></div>
                          <div className="forecast-figures">
                            <div><span>Current spend</span><strong>{formatCurrency(intelligence.forecast.currentSpentMinor / 100)}</strong></div>
                            <div><span>Projected month</span><strong>{intelligence.forecast.projectedExpenseMinor === null ? 'Not available' : formatCurrency(intelligence.forecast.projectedExpenseMinor / 100)}</strong></div>
                          </div>
                          <p className="forecast-explanation">{intelligence.forecast.projectionBasis === 'current_month_run_rate'
                            ? `Run-rate projection across ${intelligence.forecast.daysElapsed} elapsed days. This is an estimate based on recorded transactions, not a guarantee.`
                            : intelligence.forecast.projectionBasis === 'historical_average'
                              ? 'Using your recorded average from the previous three months because this month has no expense activity yet.'
                              : intelligence.forecast.projectionBasis === 'completed_month'
                                ? 'This month is complete; projection equals recorded spending.'
                                : 'A forecast will appear when there is current or historical expense data.'}</p>
                          <form className="budget-form" onSubmit={saveBudget}>
                            <label className="form-field"><span>Set this month’s budget <small>INR</small></span><div className="amount-input"><span>₹</span><input min="0.01" onChange={(event) => setBudgetDraft(event.target.value)} placeholder="Enter your budget" step="0.01" type="number" value={budgetDraft} /></div></label>
                            <button className="button button--secondary" disabled={budgetSaving} type="submit">{budgetSaving ? 'Saving…' : 'Save budget'}</button>
                          </form>
                        </article>

                        <article className="panel recommendation-panel">
                          <div className="panel-heading"><div><h2>Savings opportunities</h2><p>Based on observed category trends</p></div><span className="panel-icon"><Icon name="spark" size={18} /></span></div>
                          {intelligence.recommendations.length ? (
                            <div className="recommendation-list">{intelligence.recommendations.map((recommendation) => (
                              <div className="recommendation-card" key={recommendation.category}>
                                <span className="recommendation-icon"><Icon name="arrowDown" size={17} /></span>
                                <div><strong>{recommendation.category}</strong><p>{recommendation.rationale}</p><small>Potential reduction based on recorded trend; not guaranteed.</small></div>
                                <b>{formatCurrency(recommendation.potentialSavingsMinor / 100)}</b>
                              </div>
                            ))}</div>
                          ) : (
                            <EmptyState compact title="No savings pattern yet" description="Recommendations appear after enough month-to-month category history is available." />
                          )}
                        </article>
                      </section>

                      <section className="panel receipt-panel">
                        <div className="panel-heading"><div><h2>Receipt scanner</h2><p>Extract details for review; nothing is saved until you confirm.</p></div><span className="panel-icon"><Icon name="camera" size={18} /></span></div>
                        <form className="receipt-upload" onSubmit={scanReceipt}>
                          <label className="receipt-file"><Icon name="upload" size={19} /><span>{receiptFile ? receiptFile.name : 'Choose a receipt photo'}</span><small>JPEG, PNG or WebP · up to 5 MB</small><input accept="image/jpeg,image/png,image/webp" onChange={(event) => { setReceiptFile(event.target.files?.[0] || null); setReceiptDraft(null); }} type="file" /></label>
                          <button className="button button--primary" disabled={!receiptFile || receiptBusy} type="submit"><Icon name="spark" size={16} />{receiptBusy ? 'Scanning…' : 'Scan receipt'}</button>
                        </form>
                        {receiptDraft && <ReceiptReview draft={receiptDraft} onDiscard={() => setReceiptDraft(null)} onSave={() => saveReceiptTransaction()} saveLabel="Confirm and add expense" setDraft={setReceiptDraft} />}
                      </section>
                      <div className="analytics-note"><Icon name="spark" size={17} /><span>Money values and forecasts are calculated by the server from your account records. AI copy is optional, validated, and never supplies transaction totals.</span></div>
                    </>
                  )}
                </div>
              )}

              {page === 'settings' && (
                <section className="settings-page">
                  <article className="panel settings-card">
                    <div className="settings-card-heading"><span className="settings-icon"><Icon name="sun" size={20} /></span><div><h2>Appearance</h2><p>Choose the look that works best for you.</p></div></div>
                    <div className="theme-options" role="group" aria-label="Choose appearance theme">
                      {[
                        { id: 'light', label: 'Light', icon: 'sun', description: 'Bright and clear' },
                        { id: 'dark', label: 'Dark', icon: 'moon', description: 'Easy on the eyes' },
                      ].map((option) => (
                        <button aria-pressed={theme === option.id} className={`theme-option${theme === option.id ? ' theme-option--selected' : ''}`} key={option.id} onClick={() => setTheme(option.id)} type="button">
                          <span className="theme-option-icon"><Icon name={option.icon} size={19} /></span>
                          <span><strong>{option.label}</strong><small>{option.description}</small></span>
                          {theme === option.id && <span className="theme-check"><Icon name="check" size={15} /></span>}
                        </button>
                      ))}
                    </div>
                  </article>
                  <article className="panel settings-card">
                    <div className="settings-card-heading"><span className="settings-icon settings-icon--green"><Icon name="wallet" size={20} /></span><div><h2>Your data</h2><p>Your transactions are stored in your private account.</p></div></div>
                    <div className="settings-info-row"><span>Currency display</span><strong>Indian Rupee (INR)</strong></div>
                    <div className="settings-info-row"><span>Saved transactions</span><strong>{transactions.length}</strong></div>
                    <div className="settings-info-row"><span>Signed in as</span><strong>{user.email}</strong></div>
                    <button className="button button--secondary settings-logout" onClick={handleLogout} type="button"><Icon name="logout" size={16} />Sign out</button>
                  </article>
                  <p className="settings-disclaimer">AI services receive only the minimum context needed. Financial totals and forecasts are computed from your own account data.</p>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      <nav aria-label="Mobile navigation" className="mobile-nav">
        {navItems.slice(0, 2).map((item) => (
          <button aria-current={page === item.id ? 'page' : undefined} className={`mobile-nav-item${page === item.id ? ' mobile-nav-item--active' : ''}`} key={item.id} onClick={() => setPage(item.id)} type="button">
            <Icon name={item.icon} size={20} /><span>{item.label}</span>
          </button>
        ))}
        <button aria-label="Add transaction" className="mobile-add-button" onClick={() => setIsFormOpen(true)} type="button"><Icon name="plus" size={22} /></button>
        {navItems.slice(2).map((item) => (
          <button aria-current={page === item.id ? 'page' : undefined} className={`mobile-nav-item${page === item.id ? ' mobile-nav-item--active' : ''}`} key={item.id} onClick={() => setPage(item.id)} type="button">
            <Icon name={item.icon} size={20} /><span>{item.label}</span>
          </button>
        ))}
      </nav>

      {isFormOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsFormOpen(false); }} role="presentation">
          <section aria-labelledby="transaction-modal-title" aria-modal="true" className="transaction-modal" role="dialog">
            <div className="modal-heading">
              <div><span className="eyebrow">Transaction details</span><h2 id="transaction-modal-title">Add a transaction</h2></div>
              <button aria-label="Close dialog" className="icon-button" onClick={() => setIsFormOpen(false)} type="button"><Icon name="close" size={20} /></button>
            </div>
            <form className="transaction-form" onSubmit={handleSubmit}>
              <div className="type-switch" role="group" aria-label="Transaction type">
                {['expense', 'income'].map((type) => (
                  <button aria-pressed={form.type === type} className={`type-switch-option${form.type === type ? ' type-switch-option--active' : ''}`} key={type} onClick={() => { setCategorySuggestion(null); setCategoryTouched(false); setForm((current) => ({ ...current, type, category: type === 'income' ? 'Salary' : 'Food' })); }} type="button">
                    <Icon name={type === 'income' ? 'arrowDown' : 'arrowUp'} size={17} />{type === 'income' ? 'Income' : 'Expense'}
                  </button>
                ))}
              </div>
              <label className="form-field"><span>Description</span><input autoFocus maxLength="80" name="title" onChange={handleInputChange} placeholder="What was it for?" required value={form.title} /></label>
              <div className="receipt-inline">
                <label className="receipt-file"><Icon name="camera" size={18} /><span>{receiptFile ? receiptFile.name : 'Add details from a receipt'}</span><small>JPEG, PNG or WebP · up to 5 MB</small><input accept="image/jpeg,image/png,image/webp" onChange={(event) => { setReceiptFile(event.target.files?.[0] || null); setReceiptDraft(null); }} type="file" /></label>
                <button className="button button--secondary" disabled={!receiptFile || receiptBusy} onClick={() => scanReceipt()} type="button">{receiptBusy ? 'Scanning…' : 'Scan receipt'}</button>
              </div>
              {receiptDraft && <ReceiptReview draft={receiptDraft} onDiscard={() => setReceiptDraft(null)} onSave={() => saveReceiptTransaction(true)} saveLabel="Use receipt and add expense" setDraft={setReceiptDraft} />}
              {form.type === 'expense' && (
                <>
                  <label className="form-field"><span>Merchant <small>optional</small></span><input maxLength="120" name="merchant" onChange={handleInputChange} placeholder="e.g. Swiggy, Uber, local store" value={form.merchant} /></label>
                  {categorySuggestion && (
                    <div className="category-suggestion">
                      <div><Icon name="spark" size={16} /><span>Suggested: <strong>{categorySuggestion.category}</strong><small>{Math.round(categorySuggestion.confidence * 100)}% confidence · {categorySuggestion.reason}</small></span></div>
                      <button className="button button--secondary button--small" onClick={() => { setCategoryTouched(false); setForm((current) => ({ ...current, category: categorySuggestion.category })); }} type="button">Use suggestion</button>
                    </div>
                  )}
                </>
              )}
              <label className="form-field"><span>Amount <small>INR</small></span><div className="amount-input"><span>₹</span><input min="0.01" name="amount" onChange={handleInputChange} placeholder="0.00" required step="0.01" type="number" value={form.amount} /></div></label>
              <div className="form-row">
                <label className="form-field"><span>Category</span><select name="category" onChange={(event) => { setCategoryTouched(true); setForm((current) => ({ ...current, category: event.target.value })); }} value={form.category}>{(form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
                <label className="form-field"><span>Date</span><input max={localDateValue()} name="date" onChange={handleInputChange} required type="date" value={form.date} /></label>
              </div>
              {form.type === 'expense' && categoryTouched && form.merchant.trim() && categorySuggestion && form.category !== categorySuggestion.category && (
                <button className="remember-rule-button" disabled={rememberingMerchant} onClick={rememberMerchantCategory} type="button">
                  {rememberingMerchant ? 'Saving preference…' : `Remember ${form.category} for ${form.merchant}`}
                </button>
              )}
              <div className="modal-actions"><button className="button button--secondary" onClick={() => setIsFormOpen(false)} type="button">Cancel</button><button className="button button--primary" type="submit"><Icon name="plus" size={17} />Save transaction</button></div>
            </form>
          </section>
        </div>
      )}

      {toast && <div aria-live="polite" className={`toast toast--${toast.type}`} key={toast.id} role={toast.type === 'error' ? 'alert' : 'status'}><span className="toast-icon"><Icon name={toast.type === 'error' ? 'close' : 'check'} size={16} /></span>{toast.message}</div>}
    </div>
  );
}

export default App;

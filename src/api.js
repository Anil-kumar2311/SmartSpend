const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed with status ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

export function toTransactionInput(transaction) {
  return {
    title: transaction.title,
    type: transaction.type,
    category: transaction.category,
    amountMinor: transaction.amountMinor ?? Math.round(Number(transaction.amount) * 100),
    date: transaction.date,
    merchant: transaction.merchant || '',
    notes: transaction.notes || '',
  };
}

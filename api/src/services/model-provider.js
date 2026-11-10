export async function requestModelJson({ system, user, fetchImpl = fetch, timeoutMs = 15000 }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(user) }],
      }),
    });
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }

  if (!response.ok) {
    clearTimeout(timeout);
    throw new Error(`AI provider returned HTTP ${response.status}.`);
  }
  let payload;
  try {
    payload = await response.json();
  } finally {
    clearTimeout(timeout);
  }
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('AI provider returned no structured content.');
  try {
    return JSON.parse(content);
  } catch {
    throw new Error('AI provider returned malformed JSON.');
  }
}

export function aiAdapters() {
  return {
    categorize: (expense) => requestModelJson({
      system: 'Categorize the expense into one of the allowed categories: Food, Groceries, Housing, Transport, Shopping, Bills, Health, Entertainment, Travel, Personal care, Other. Return JSON with category, confidence from 0 to 1, and a short reason. Never return other keys.',
      user: expense,
    }),
    analyze: (summary) => requestModelJson({
      system: 'Write up to four concise qualitative personal spending insights based only on the supplied server-calculated summary. Do not invent facts and do not write any digits, percentages, currency values, or amounts. Return JSON: {"insights":["..."]}.',
      user: summary,
    }),
    savings: (categories) => requestModelJson({
      system: 'For each supplied expense category, write a cautious, practical qualitative rationale based only on its supplied history. Do not write digits, percentages, currency values, or amounts; do not promise savings. Return JSON: {"recommendations":[{"category":"allowed supplied category","rationale":"..."}]}.',
      user: categories,
    }),
  };
}

const TOKEN_KEY = 'sha_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function api(path, { method = 'GET', body, headers } = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({ error: 'Bad server response.' }));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const AuthApi = {
  register: (body) => api('/api/auth/register', { method: 'POST', body }),
  login: (body) => api('/api/auth/login', { method: 'POST', body }),
  me: () => api('/api/auth/me'),
  logout: () => api('/api/auth/logout', { method: 'POST' }),
  changePassword: (body) => api('/api/auth/change-password', { method: 'POST', body }),
};

export const BusinessApi = {
  get: () => api('/api/business'),
  create: (body) => api('/api/business', { method: 'POST', body }),
  update: (body) => api('/api/business', { method: 'PUT', body }),
};

export const ProductApi = {
  list: () => api('/api/products'),
  create: (body) => api('/api/products', { method: 'POST', body }),
  bulk: (products) => api('/api/products/bulk', { method: 'POST', body: { products } }),
  update: (id, body) => api(`/api/products/${id}`, { method: 'PUT', body }),
  remove: (id) => api(`/api/products/${id}`, { method: 'DELETE' }),
  samples: () => api('/api/products/samples'),
};

export const ChatApi = {
  send: (message, confirm = false) => api('/api/chat', { method: 'POST', body: { message, confirm } }),
  history: () => api('/api/chat/history'),
};

export const RecordApi = {
  sales: (period) => api(`/api/sales${period ? `?period=${period}` : ''}`),
  expenses: (period) => api(`/api/expenses${period ? `?period=${period}` : ''}`),
  purchases: (period) => api(`/api/purchases${period ? `?period=${period}` : ''}`),
  createSale: (body) => api('/api/sales', { method: 'POST', body }),
  createExpense: (body) => api('/api/expenses', { method: 'POST', body }),
  createPurchase: (body) => api('/api/purchases', { method: 'POST', body }),
  createWithdrawal: (body) => api('/api/withdrawals', { method: 'POST', body }),
};

export const ReportApi = {
  summary: (period) => api(`/api/reports/summary?period=${period}`),
  top: (period) => api(`/api/reports/top-products?period=${period}`),
  lowStock: () => api('/api/reports/low-stock'),
  insights: () => api('/api/reports/insights'),
  lender: () => api('/api/reports/lender-summary'),
  charts: (period) => api(`/api/reports/charts?period=${period}`),
};

export const PlanApi = {
  upgrade: () => api('/api/plan/upgrade', { method: 'POST' }),
};

export const DemoApi = {
  reset: () => api('/api/demo/reset', { method: 'POST' }),
};

export function money(n) {
  const v = Number(n);
  return `$${(Number.isFinite(v) ? v : 0).toFixed(2)}`;
}

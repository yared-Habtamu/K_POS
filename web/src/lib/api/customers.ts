const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path: string, token?: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
    method: opts.method || 'GET',
    body: opts.body,
  });
  if (!res.ok) {
    // prefer JSON error messages when available
    let bodyText = '';
    try {
      const j = await res.clone().json();
      bodyText = j && j.message ? j.message : JSON.stringify(j);
    } catch (_) {
      try {
        bodyText = await res.text();
      } catch (__) {
        bodyText = String(res.statusText || 'Unknown error');
      }
    }
    throw new Error(`Request failed ${res.status}: ${bodyText}`);
  }
  return res.json();
}

export async function createCustomer(payload: { name: string; phoneNumber: string; city?: string; martId?: string }, token?: string) {
  return request('/api/customers', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}

export async function fetchCustomers(params: { martId?: string } = {}, token?: string) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  const suffix = qs ? `?${qs}` : '';
  return request(`/api/customers${suffix}`, token);
}

export default { createCustomer, fetchCustomers };

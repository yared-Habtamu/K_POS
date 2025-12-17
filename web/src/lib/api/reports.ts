import type { UserRole } from '@/types';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path: string, token?: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed ${res.status}: ${text}`);
  }
  return res.json();
}

export async function fetchSummary(params: { range?: string; start?: string; end?: string; martId?: string }, token?: string) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request(`/api/reports/summary?${qs}`, token);
}

export async function fetchDaily(params: { martId?: string; date?: string }, token?: string) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request(`/api/reports/daily?${qs}`, token);
}

export async function fetchMartReport(params: { martId: string; range?: string; start?: string; end?: string }, token?: string) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  return request(`/api/reports/mart?${qs}`, token);
}

export async function fetchTodaysSales(params: { martId?: string } = {}, token?: string) {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  const suffix = qs ? `?${qs}` : '';
  return request(`/api/reports/today-sales${suffix}`, token);
}

export type Role = UserRole | 'system_admin';

export default { fetchSummary, fetchDaily, fetchMartReport, fetchTodaysSales };

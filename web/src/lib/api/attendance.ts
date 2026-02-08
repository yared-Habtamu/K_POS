const API_BASE = import.meta.env.VITE_API_URL || '';

export type AttendanceApiRecord = {
  _id?: string;
  id?: string;
  employeeId?: string;
  employeeName?: string;
  dateYmd?: string;
  clockIn?: string;
  clockOut?: string;
  durationMinutes?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

async function request<T>(
  path: string,
  opts: {
    method?: string;
    token?: string;
    body?: unknown;
  } = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method || 'GET',
    headers: {
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request failed ${res.status}: ${text || res.statusText}`);
  }

  // some endpoints may return empty body; default to null
  const txt = await res.text();
  return (txt ? JSON.parse(txt) : null) as T;
}

export async function fetchAttendance(
  params: { employeeId?: string; dateYmd?: string; martId?: string } = {},
  token?: string,
): Promise<AttendanceApiRecord[]> {
  const cleaned: Record<string, string> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (typeof v === 'string' && v.trim() !== '') cleaned[k] = v;
  });
  const qs = new URLSearchParams(cleaned).toString();
  const suffix = qs ? `?${qs}` : '';
  return request<AttendanceApiRecord[]>(`/api/attendance${suffix}`, { token });
}

export async function createAttendance(
  body: {
    employeeId?: string;
    employeeName?: string;
    dateYmd: string;
    clockIn: string;
    clockOut?: string | null;
    notes?: string | null;
    martId?: string;
  },
  token?: string,
): Promise<AttendanceApiRecord> {
  const payload: any = { ...body };
  if (payload.clockOut == null || payload.clockOut === '') delete payload.clockOut;
  if (payload.notes == null || payload.notes === '') delete payload.notes;
  return request<AttendanceApiRecord>('/api/attendance', {
    method: 'POST',
    token,
    body: payload,
  });
}

export async function updateAttendance(
  id: string,
  body: {
    employeeId?: string | null;
    employeeName?: string | null;
    clockIn?: string | null;
    clockOut?: string | null;
    notes?: string | null;
  },
  token?: string,
): Promise<AttendanceApiRecord> {
  const payload: any = { ...body };
  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined) delete payload[k];
  });
  return request<AttendanceApiRecord>(`/api/attendance/${id}`, {
    method: 'PUT',
    token,
    body: payload,
  });
}

export async function deleteAttendance(id: string, token?: string): Promise<void> {
  await request(`/api/attendance/${id}`, { method: 'DELETE', token });
}

export default { fetchAttendance, createAttendance, updateAttendance, deleteAttendance };

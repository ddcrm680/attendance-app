const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('attendance_token');
}

export function setToken(token: string) {
  localStorage.setItem('attendance_token', token);
}

export function clearToken() {
  localStorage.removeItem('attendance_token');
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data as T;
}

export type Employee = {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  mobile: string;
  role: 'super_admin' | 'hr_admin' | 'employee';
  department?: { id: number; name: string } | null;
  office?: { id: number; name: string; latitude: string; longitude: string; radius: number } | null;
  status: string;
};

export type Attendance = {
  id: number;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  working_minutes: number;
  overtime_minutes: number;
  late_minutes: number;
};

export function login(identifier: string, password: string) {
  return apiFetch<{ token: string; employee: Employee }>('/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
}

export function logout() {
  return apiFetch('/logout', { method: 'POST' });
}

export function me() {
  return apiFetch<Employee>('/me');
}

export function checkIn(payload: { latitude: number; longitude: number; accuracy?: number }) {
  return apiFetch<{ message: string; attendance: Attendance }>('/attendance/check-in', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function checkOut(payload: { latitude: number; longitude: number; accuracy?: number }) {
  return apiFetch<{ message: string; attendance: Attendance }>('/attendance/check-out', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function todayAttendance() {
  return apiFetch<Attendance | null>('/attendance/today');
}

export function attendanceHistory() {
  return apiFetch<{ data: Attendance[] }>('/attendance/history');
}

export function updateLocation(payload: { latitude: number; longitude: number; accuracy?: number }) {
  return apiFetch('/location/update', { method: 'POST', body: JSON.stringify(payload) });
}

export function adminDashboard() {
  return apiFetch<{
    date: string;
    total_employees: number;
    present_today: number;
    absent_today: number;
    late_today: number;
    currently_working: number;
    checked_out: number;
    average_working_minutes: number;
  }>('/admin/dashboard');
}

export function adminEmployees() {
  return apiFetch<{ data: Employee[] }>('/admin/employees');
}

export function adminOffices() {
  return apiFetch<
    Array<{ id: number; name: string; address: string; latitude: string; longitude: string; radius: number; employees_count: number }>
  >('/admin/offices');
}

export function createOffice(payload: {
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radius: number;
}) {
  return apiFetch('/admin/offices', { method: 'POST', body: JSON.stringify(payload) });
}

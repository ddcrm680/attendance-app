const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("attendance_token");
}

export function setToken(token: string) {
  localStorage.setItem("attendance_token", token);
}

export function clearToken() {
  localStorage.removeItem("attendance_token");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      Accept: "application/json",
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
  role: "super_admin" | "hr_admin" | "employee";
  designation?: string | null;
  joining_date?: string | null;
  department?: { id: number; name: string } | null;
  office?: {
    id: number;
    name: string;
    latitude: string;
    longitude: string;
    radius: number;
  } | null;
  status: "active" | "inactive" | "suspended";
  wfh_eligible?: boolean;
};

export type Department = {
  id: number;
  name: string;
  status: "active" | "inactive";
  employees_count?: number;
};

export type Office = {
  id: number;
  name: string;
  address: string | null;
  latitude: string;
  longitude: string;
  radius: number;
  status: "active" | "inactive";
  employees_count?: number;
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
  early_departure_minutes?: number;
  mode?: "office" | "wfh";
  office?: { id: number; name: string; address?: string | null } | null;
  employee_id?: number;
  employee?: {
    id: number;
    name: string;
    employee_code: string;
    department?: { name: string } | null;
  };
  check_in_latitude?: string | null;
  check_in_longitude?: string | null;
  check_in_accuracy?: string | null;
  check_out_latitude?: string | null;
  check_out_longitude?: string | null;
  check_out_accuracy?: string | null;
  location_logs?: Array<{
    latitude: string;
    longitude: string;
    accuracy: string;
    recorded_at: string;
  }>;
};

export type LiveEmployee = {
  employee_id: number;
  name: string;
  employee_code: string;
  office: string | null;
  attendance_id: number;
  check_in: string;
  status: "working";
  last_location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    recorded_at: string;
  } | null;
};
export type LeaveType = { id: number; name: string; reason_required: boolean };
export type LeaveRequest = {
  id: number;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: string;
  leave_type?: LeaveType;
};

export function login(identifier: string, password: string) {
  return apiFetch<{ token: string; employee: Employee }>("/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
}

export function logout() {
  return apiFetch("/logout", { method: "POST" });
}

export function me() {
  return apiFetch<Employee>("/me");
}

export function checkIn(payload: {
  latitude: number;
  longitude: number;
  accuracy: number;
  positionTimestamp: number;
  photo: File;
  mode?: "office" | "wfh";
}) {
  const body = new FormData();
  body.append("latitude", String(payload.latitude));
  body.append("longitude", String(payload.longitude));
  body.append("accuracy", String(payload.accuracy));
  body.append("position_timestamp", String(payload.positionTimestamp));
  body.append("photo", payload.photo);
  body.append("mode", payload.mode ?? "office");
  return apiFetch<{ message: string; attendance: Attendance }>(
    "/attendance/check-in",
    {
      method: "POST",
      body,
    },
  );
}

export function checkOut(payload: {
  latitude: number;
  longitude: number;
  accuracy: number;
  positionTimestamp: number;
  photo: File;
}) {
  const body = new FormData();
  body.append("latitude", String(payload.latitude));
  body.append("longitude", String(payload.longitude));
  body.append("accuracy", String(payload.accuracy));
  body.append("position_timestamp", String(payload.positionTimestamp));
  body.append("photo", payload.photo);
  return apiFetch<{ message: string; attendance: Attendance }>(
    "/attendance/check-out",
    {
      method: "POST",
      body,
    },
  );
}

export function todayAttendance() {
  return apiFetch<Attendance | null>("/attendance/today");
}

export function attendanceHistory(
  params: { from?: string; to?: string; page?: number } = {},
) {
  const q = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return apiFetch<{
    data: Attendance[];
    current_page: number;
    last_page: number;
  }>(`/attendance/history${q ? `?${q}` : ""}`);
}
export function attendanceDetail(id: number) {
  return apiFetch<Attendance>(`/attendance/${id}`);
}

export function updateLocation(payload: {
  latitude: number;
  longitude: number;
  accuracy: number;
  positionTimestamp: number;
  attendanceId: number;
}) {
  return apiFetch("/location/update", {
    method: "POST",
    body: JSON.stringify({
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracy: payload.accuracy,
      position_timestamp: payload.positionTimestamp,
      attendance_id: payload.attendanceId,
    }),
  });
}

export function trackingStatus() {
  return apiFetch<{
    active: boolean;
    attendance_id: number | null;
    tracking_interval_seconds: number | null;
  }>("/location/tracking-status");
}

export function adminLiveEmployees() {
  return apiFetch<LiveEmployee[]>("/admin/live-employees");
}
export function leaveTypes() {
  return apiFetch<LeaveType[]>("/leave-types");
}
export function myLeaves() {
  return apiFetch<{ data: LeaveRequest[] }>("/leaves");
}
export function createLeave(payload: {
  leave_type_id: number;
  start_date: string;
  end_date: string;
  reason?: string;
}) {
  return apiFetch<LeaveRequest>("/leaves", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export function cancelLeave(id: number) {
  return apiFetch<LeaveRequest>(`/leaves/${id}/cancel`, { method: "POST" });
}
export type CalendarOverview = {
  date: string;
  status: "working_day" | "week_off" | "holiday" | "leave";
  holidays: Array<{
    id: number;
    name: string;
    holiday_date: string;
    active: boolean;
  }>;
};
export function calendarOverview() {
  return apiFetch<CalendarOverview>("/calendar");
}
export type WfhRequest = {
  id: number;
  attendance_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at?: string | null;
};
export function myWfhRequests() {
  return apiFetch<{ data: WfhRequest[] }>("/wfh-requests");
}
export function createWfhRequest(payload: {
  attendance_date: string;
  reason?: string;
}) {
  return apiFetch<WfhRequest>("/wfh-requests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function adminDashboard() {
  return apiFetch<{
    date: string;
    total_employees: number;
    present_today: number;
    absent_today: number;
    late_today: number;
    on_leave: number;
    currently_working: number;
    checked_out: number;
    average_working_minutes: number;
  }>("/admin/dashboard");
}
export function adminDashboardCharts() {
  return apiFetch<{
    daily: Array<{
      date: string;
      total: number;
      present: number;
      late: number;
    }>;
    departments: Array<{ name: string; total: number }>;
  }>("/admin/dashboard/charts");
}
export type WhatsAppLog = {
  id: number;
  notification_type: string;
  status: "queued" | "processing" | "sent" | "failed";
  provider: string;
  provider_message_id?: string | null;
  error_message?: string | null;
  attempts: number;
  created_at: string;
  sent_at?: string | null;
  attendance?: Attendance & {
    employee?: { name: string; employee_code: string };
  };
};
export type WhatsAppSettings = {
  enabled: boolean;
  provider: string;
  attendance_notifications: Record<string, boolean>;
  attendance_recipient_configured: boolean;
  daily_report_recipient_configured: boolean;
  rate_per_minute: number;
};
export function adminWhatsAppLogs(
  params: Record<string, string | number | undefined> = {},
) {
  const q = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return apiFetch<{
    data: WhatsAppLog[];
    current_page: number;
    last_page: number;
  }>(`/admin/whatsapp/logs${q ? `?${q}` : ""}`);
}
export function adminWhatsAppSettings() {
  return apiFetch<WhatsAppSettings>("/admin/whatsapp/settings");
}
export function triggerDailyWhatsAppSummary(date?: string) {
  return apiFetch<{ message: string; log_id: number }>(
    "/admin/whatsapp/daily-summary",
    { method: "POST", body: JSON.stringify(date ? { date } : {}) },
  );
}
export type AuditLog = {
  id: number;
  action: string;
  resource_type: string;
  resource_id: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor?: { id: number; name: string; employee_code: string } | null;
  employee?: { id: number; name: string; employee_code: string } | null;
};
export function adminAuditLogs(
  params: Record<string, string | number | undefined> = {},
) {
  const q = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return apiFetch<{
    data: AuditLog[];
    current_page: number;
    last_page: number;
  }>(`/admin/audit-logs${q ? `?${q}` : ""}`);
}
export function adminAuditLog(id: number) {
  return apiFetch<AuditLog>(`/admin/audit-logs/${id}`);
}
export function adminAttendanceDetail(id: number) {
  return apiFetch<Attendance>(`/admin/attendance/${id}`);
}
export function adminAttendance(
  params: Record<string, string | number | undefined> = {},
) {
  const q = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return apiFetch<{
    data: Attendance[];
    current_page: number;
    last_page: number;
  }>(`/admin/attendance${q ? `?${q}` : ""}`);
}

export async function downloadAdminReport(
  format: "csv" | "xlsx" | "pdf",
  params: Record<string, string | number | undefined> = {},
) {
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)]),
  ).toString();
  const response = await fetch(
    `${API_URL}/admin/reports/export/${format}${query ? `?${query}` : ""}`,
    {
      headers: {
        Accept:
          format === "pdf"
            ? "application/pdf"
            : format === "xlsx"
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              : "text/csv",
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
    },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? `Export failed (${response.status})`);
  }
  return response.blob();
}

export function adminEmployees(
  params: Record<string, string | number | undefined> = {},
) {
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)]),
  ).toString();

  return apiFetch<{
    data: Employee[];
    current_page: number;
    last_page: number;
  }>(`/admin/employees${query ? `?${query}` : ""}`);
}

export function adminOffices() {
  return apiFetch<Office[]>("/admin/offices");
}

export function createOffice(payload: {
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radius: number;
  status?: "active" | "inactive";
}) {
  return apiFetch("/admin/offices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOffice(
  id: number,
  payload: {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    status?: Office["status"];
  },
) {
  return apiFetch<Office>(`/admin/offices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteOffice(id: number) {
  return apiFetch(`/admin/offices/${id}`, { method: "DELETE" });
}

export function adminDepartments(
  params: Record<string, string | number | undefined> = {},
) {
  const query = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)]),
  ).toString();

  return apiFetch<{
    data: Department[];
    current_page: number;
    last_page: number;
  }>(`/admin/departments${query ? `?${query}` : ""}`);
}

export function createDepartment(payload: {
  name: string;
  status?: "active" | "inactive";
}) {
  return apiFetch<Department>("/admin/departments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateDepartment(
  id: number,
  payload: Partial<Pick<Department, "name" | "status">>,
) {
  return apiFetch<Department>(`/admin/departments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteDepartment(id: number) {
  return apiFetch(`/admin/departments/${id}`, { method: "DELETE" });
}

export function createEmployee(payload: {
  employee_code: string;
  name: string;
  email: string;
  mobile: string;
  password: string;
  role: Employee["role"];
  department_id?: number;
  office_id?: number;
  designation?: string;
  joining_date?: string;
  status?: Employee["status"];
}) {
  return apiFetch<Employee>("/admin/employees", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateEmployee(
  id: number,
  payload: {
    name?: string;
    email?: string;
    mobile?: string;
    password?: string;
    role?: Employee["role"];
    department_id?: number | null;
    office_id?: number | null;
    designation?: string | null;
    status?: Employee["status"];
  },
) {
  return apiFetch<Employee>(`/admin/employees/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteEmployee(id: number) {
  return apiFetch(`/admin/employees/${id}`, { method: "DELETE" });
}
export function updateWfhEligibility(id: number, wfh_eligible: boolean) {
  return apiFetch<Employee>(`/admin/employees/${id}/wfh-eligibility`, {
    method: "PATCH",
    body: JSON.stringify({ wfh_eligible }),
  });
}

export type AdminLeaveRequest = LeaveRequest & {
  employee?: Pick<Employee, "id" | "name" | "employee_code">;
};
export function adminLeaves(
  params: Record<string, string | number | undefined> = {},
) {
  const q = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)]),
  ).toString();
  return apiFetch<{
    data: AdminLeaveRequest[];
    current_page: number;
    last_page: number;
  }>(`/admin/leaves${q ? `?${q}` : ""}`);
}
export function reviewLeave(id: number, status: "approved" | "rejected") {
  return apiFetch<AdminLeaveRequest>(`/admin/leaves/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
export type Holiday = {
  id: number;
  name: string;
  holiday_date: string;
  active: boolean;
};
export function adminHolidays() {
  return apiFetch<Holiday[]>("/admin/holidays");
}
export function createHoliday(payload: {
  name: string;
  holiday_date: string;
  active?: boolean;
}) {
  return apiFetch<Holiday>("/admin/holidays", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export function updateHoliday(id: number, payload: Partial<Holiday>) {
  return apiFetch<Holiday>(`/admin/holidays/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
export function deleteHoliday(id: number) {
  return apiFetch(`/admin/holidays/${id}`, { method: "DELETE" });
}
export type AdminWfhRequest = WfhRequest & {
  employee?: Pick<Employee, "id" | "name" | "employee_code">;
};
export function adminWfhRequests(
  params: Record<string, string | number | undefined> = {},
) {
  const q = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)]),
  ).toString();
  return apiFetch<{
    data: AdminWfhRequest[];
    current_page: number;
    last_page: number;
  }>(`/admin/wfh-requests${q ? `?${q}` : ""}`);
}
export function reviewWfhRequest(id: number, status: "approved" | "rejected") {
  return apiFetch<AdminWfhRequest>(`/admin/wfh-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

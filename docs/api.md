# API

The API is served from the backend /api prefix. Login is public; all other endpoints below require Authorization: Bearer <token> from Sanctum unless noted.

## Authentication

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | /login | Public; login throttle | Authenticate with email/mobile and password. |
| GET | /me | Authenticated | Return the current employee account. |
| POST | /logout | Authenticated | Revoke the current token. |

## Employee attendance and location

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | /attendance/check-in | Authenticated employee | Server-validates mode, photo, GPS/geofence, calendar, and creates a punch. |
| POST | /attendance/check-out | Authenticated employee | Validates the open session and finalizes attendance. |
| GET | /attendance/today | Owner | Current employee’s attendance for the business date. |
| GET | /attendance/history | Owner | Paginated attendance history; supports from, to, and per_page. |
| GET | /attendance/{attendance} | Owner or authorized admin | Attendance detail. |
| GET | /attendance/{attendance}/photos/{punch} | Owner or authorized admin | Protected check_in/check_out photo response. |
| GET | /location/tracking-status | Owner | Whether the employee has an active tracking session. |
| POST | /location/update | Owner, open session | Verify and persist a location update. |
| GET | /location/current | Owner | Latest own location log. |
| GET | /location/history | Owner | Bounded own location history. |
| GET | /calendar | Authenticated employee | Today’s working/holiday/leave/week-off status and upcoming holidays. |

## Leave and WFH

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | /leave-types | Authenticated | Active leave types. |
| GET | /leaves | Owner | Own paginated leave requests. |
| POST | /leaves | Owner | Submit a validated leave request. |
| POST | /leaves/{leave}/cancel | Owner, pending request | Cancel an eligible pending request. |
| GET | /wfh-requests | Owner | Own WFH requests. |
| POST | /wfh-requests | Eligible owner | Submit a WFH request. |

## Administrative endpoints

All /admin/* endpoints require authentication, admin middleware, and relevant policy/role checks. Resource management uses standard REST methods where shown.

- GET /admin/dashboard, GET /admin/dashboard/charts, GET /admin/live-employees
- GET /admin/attendance, GET /admin/attendance/{attendance}
- GET /admin/reports/export/{csv|xlsx|pdf}
- GET /admin/whatsapp/logs, GET /admin/whatsapp/settings, POST /admin/whatsapp/daily-summary (Super Admin)
- GET /admin/audit-logs, GET /admin/audit-logs/{auditLog}
- GET /admin/leaves, PATCH /admin/leaves/{leave}
- GET/POST /admin/leave-types, PATCH /admin/leave-types/{leaveType}
- GET/POST/PATCH/DELETE /admin/holidays (show is excluded)
- GET /admin/wfh-requests, PATCH /admin/wfh-requests/{wfh}
- PATCH /admin/employees/{employee}/wfh-eligibility
- REST resources: /admin/employees, /admin/departments, /admin/offices
- GET/PUT /admin/offices/{office}/attendance-settings

Administrative responses are filtered and paginated where implemented. Never expose bearer tokens, private storage paths, or provider credentials.

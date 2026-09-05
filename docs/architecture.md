# Architecture

Attendance App is a single repository with two services:

- backend/: Laravel 11 JSON API.
- frontend/: Next.js 14/React employee and administration UI.

SQLite is the only database. Authentication uses Laravel Sanctum bearer tokens. Backend policies, ownership checks, attendance rules, GPS verification, photo validation, and server timestamps are authoritative.

## Main modules

- Attendance engine: punches, working time, late/early/overtime, calendar rules, and WFH mode.
- Location: geofence verification and open-session live location logs.
- Media: private attendance photos served through authorized API routes.
- Workforce: employees, departments, offices, leave, holidays, WFH requests, and attendance settings.
- Administration: dashboards, reports/exports, live employees, WhatsApp delivery, and audit logs.
- Privacy/operations: opt-in retention cleanup, queues, scheduler, security headers, and PWA/offline status.

The frontend handles presentation, camera/GPS prompts, navigation, and API calls. It never replaces backend authorization or validation.

Sensitive data remains private: photos use Laravel private storage, location data is ownership/role protected, and provider credentials remain server-side.

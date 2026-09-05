# Attendance Management Platform

Laravel 11 API plus a Next.js 14 employee/admin application for secure attendance, location verification, leave, WFH, reporting, and administration. The system uses SQLite, Sanctum bearer tokens, private attendance media, server-authoritative attendance/GPS rules, live tracking for open sessions, WhatsApp queue delivery, retention, and audit logs.

## Main features

- Secure Office/WFH check-in and check-out with mandatory selfie and verified GPS.
- Server-calculated working time, late/early/overtime status, calendar, leave, and holidays.
- Live location tracking during open attendance sessions.
- Employee self-service history and privacy views.
- Authorized administration, dashboards, reports, CSV/XLSX/PDF exports, WhatsApp delivery, and audit logs.

## Tech stack

- Backend: Laravel 11, PHP 8.3+, Sanctum, SQLite.
- Frontend: Next.js 14, React, TypeScript, Tailwind CSS.
- Deployment: separate backend and frontend services on Railway.

## Repository layout

This is a single repository with two deployable services:

```text
attendance-app/
  backend/   Laravel API
  frontend/  Next.js application
```

## Roles and access

The supported roles are `employee`, `hr_admin` (HR Admin), and `super_admin`.

- **Employee:** employee dashboard, secure punch-in/out, own attendance and history, own leave/WFH/calendar access, and privacy, PWA, and offline status information.
- **HR Admin:** authorized administrative screens, employee/department/office management as permitted, attendance and reporting, leave/holiday/WFH management, live locations, WhatsApp and audit access according to backend authorization, plus the HR user’s own attendance, leave, and WFH self-service. HR Admin cannot perform Super Admin-only actions.
- **Super Admin:** full authorized administrative capabilities and privileged controls, plus the Super Admin user’s own attendance, leave, and WFH self-service.

Backend authentication, authorization, and ownership policies are authoritative. Frontend role visibility is a usability aid, not a security boundary.

## Local setup

Backend (PHP 8.3+ and Composer):

```bash
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Frontend (Node.js):

```bash
cd frontend
npm install
copy .env.local.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_API_URL` only to the API base URL, for example `http://localhost:8000/api`. Do not place backend secrets in frontend environment variables.

### Local demo data

`DatabaseSeeder` creates realistic deterministic scenarios for multiple departments and offices, multiple roles, WFH-eligible and non-WFH-eligible employees, pending/approved/rejected leave, pending/approved/rejected WFH requests, active/inactive holidays, and representative historical attendance records. It intentionally does not create private photo fixtures, fake location logs, WhatsApp credentials, or open attendance sessions.

The local/demo accounts all use `password123`: `admin@example.com` (Super Admin), `hr@example.com` (HR Admin), `alice.office@example.com` (office employee), `rohan.wfh@example.com` (WFH-eligible employee), `meera.sales@example.com` (non-WFH employee), `kabir.ops@example.com` (WFH-eligible employee), and `inactive.demo@example.com` (inactive employee). These credentials are for local demo data only; never use them outside local development.

## Operations

- SQLite is the supported database. The Railway backend service must use persistent storage at `/data/database.sqlite`.
- Attendance photos use the non-public `local` disk rooted at `storage/app/private`; access is through authenticated, authorized API routes only.
- Production should set `APP_DEBUG=false`, a real `APP_KEY`, exact `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, `SANCTUM_STATEFUL_DOMAINS`, and `SESSION_SECURE_COOKIE=true`.
- Run migrations with `php artisan migrate --force` and seed only intentionally with `php artisan db:seed`.
- When WhatsApp is enabled, use `QUEUE_CONNECTION=database` and run `php artisan queue:work`. Configure only server-side `WHATSAPP_*` variables from `.env.production.example`.
- Run the scheduler every minute in deployment infrastructure (`php artisan schedule:run`). It registers the daily WhatsApp summary and the opt-in privacy retention cleanup.
- Retention cleanup is disabled by default. Approve values for `ATTENDANCE_PHOTO_RETENTION_DAYS` and `LOCATION_LOG_RETENTION_DAYS`, set `PRIVACY_RETENTION_ENABLED=true`, then use `php artisan privacy:cleanup`.

## Testing

Run the backend suite with vendor/bin/phpunit --do-not-cache-result. Check the frontend with npx tsc --noEmit and build it with npm run build.

## Documentation

- [Architecture](docs/architecture.md)
- [API reference](docs/api.md)
- [Application flows](docs/flows.md)
- [Development guide](docs/development.md)
- [Railway deployment](docs/deployment.md)

## Browser behavior

Camera and location permissions are requested only during relevant attendance workflows. Live location tracking runs only for an open authorized attendance session and stops after punch-out; browsers cannot guarantee tracking after the app or browser is closed. The PWA has an offline fallback, but attendance punches are never queued locally or replayed later because server timestamps are authoritative.

## Deployment notes

Deploy this repository to Railway as two services with separate root directories:

- **Backend service:** root directory `backend/`. Railway uses `backend/nixpacks.toml` to build Laravel, cache config/routes, create `/data/database.sqlite`, and run migrations. Attach a persistent Railway volume mounted at `/data`.
- **Frontend service:** root directory `frontend/`. Railway builds and serves the Next.js application. Set `NEXT_PUBLIC_API_URL` to the deployed backend API URL, for example `https://your-backend.up.railway.app/api`.

Configure `backend/.env.production.example` with the actual Railway frontend and backend domains, including `APP_URL`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, and `SANCTUM_STATEFUL_DOMAINS`. Do not commit WhatsApp credentials, application keys, or user credentials.

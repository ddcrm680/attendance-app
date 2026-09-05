# Attendance and live-location tracking

Laravel 11 API plus a Next.js 14 employee/admin application. The system uses SQLite, Sanctum bearer tokens, private attendance media, server-authoritative attendance/GPS rules, live tracking for open sessions, leave/WFH/calendar support, reporting, WhatsApp queue delivery, retention, and audit logs.

## Repository layout

This is a single repository with two deployable services:

```text
attendance-app/
  backend/   Laravel API
  frontend/  Next.js application
```

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

The seeded local/demo accounts are `admin@example.com` / `password123` and `raj.kumar@example.com` / `password123`. Replace or remove them outside local/demo environments.

## Operations

- SQLite is the supported database. The Railway backend service must use persistent storage at `/data/database.sqlite`.
- Attendance photos use the non-public `local` disk rooted at `storage/app/private`; access is through authenticated, authorized API routes only.
- Production should set `APP_DEBUG=false`, a real `APP_KEY`, exact `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, `SANCTUM_STATEFUL_DOMAINS`, and `SESSION_SECURE_COOKIE=true`.
- Run migrations with `php artisan migrate --force` and seed only intentionally with `php artisan db:seed`.
- When WhatsApp is enabled, use `QUEUE_CONNECTION=database` and run `php artisan queue:work`. Configure only server-side `WHATSAPP_*` variables from `.env.production.example`.
- Run the scheduler every minute in deployment infrastructure (`php artisan schedule:run`). It registers the daily WhatsApp summary and the opt-in privacy retention cleanup.
- Retention cleanup is disabled by default. Approve values for `ATTENDANCE_PHOTO_RETENTION_DAYS` and `LOCATION_LOG_RETENTION_DAYS`, set `PRIVACY_RETENTION_ENABLED=true`, then use `php artisan privacy:cleanup`.

## Browser behavior

Camera and location permissions are requested only during relevant attendance workflows. Live location tracking runs only for an open authorized attendance session and stops after punch-out; browsers cannot guarantee tracking after the app or browser is closed. The PWA has an offline fallback, but attendance punches are never queued locally or replayed later because server timestamps are authoritative.

## Deployment notes

Deploy this repository to Railway as two services with separate root directories:

- **Backend service:** root directory `backend/`. Railway uses `backend/nixpacks.toml` to build Laravel, cache config/routes, create `/data/database.sqlite`, and run migrations. Attach a persistent Railway volume mounted at `/data`.
- **Frontend service:** root directory `frontend/`. Railway builds and serves the Next.js application. Set `NEXT_PUBLIC_API_URL` to the deployed backend API URL, for example `https://your-backend.up.railway.app/api`.

Configure `backend/.env.production.example` with the actual Railway frontend and backend domains, including `APP_URL`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, and `SANCTUM_STATEFUL_DOMAINS`. Do not commit WhatsApp credentials, application keys, or user credentials.

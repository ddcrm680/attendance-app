# Employee attendance & live location tracking

Core working build: authentication, GPS check-in/check-out with server-side
geofence validation, live location tracking during work hours, attendance
history, and a basic admin panel (employee list, office/geofence
management, live-headcount dashboard).

This is the **core scope**, not the full spec. Not included in this build:
WhatsApp integration, leave management, holidays, PDF/Excel export, audit
logs table wiring, and the PWA manifest/service worker. The database schema
and API are structured so those can be added without breaking anything
here — see "Extending this" at the bottom.

## Stack

- **Backend**: Laravel 11, PHP 8.3+, MySQL 8, Sanctum token auth
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS

## Project layout

```
backend/    Laravel API — includes artisan, public/index.php, nixpacks.toml
frontend/   Next.js app (employee + admin UI) — includes vercel.json
```

## Deploying (Railway + Vercel)

This repo now includes the config both platforms need to build automatically
— you don't hand-configure a build command in either dashboard. What you
still have to do yourself (no way around this — it needs your accounts):

1. **Push to GitHub.** Two repos is simplest: `attendance-backend` (contents
   of `backend/`) and `attendance-frontend` (contents of `frontend/`).

2. **Backend — Railway.**
   - New Project → Deploy from GitHub repo → pick `attendance-backend`.
     Railway reads `nixpacks.toml` automatically and knows how to build a
     PHP app; no manual build command needed.
   - Add a MySQL database: "+ New" → Database → MySQL. Railway wires the
     connection variables (`MYSQLHOST`, `MYSQLPORT`, etc.) automatically.
   - Go to your backend service → Variables → paste in the contents of
     `.env.production.example`, replacing the placeholder domains with your
     real Vercel URL once you have it (step 3 gives you that URL — you'll
     come back and update `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`,
     `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` after step 3).
   - Generate an app key locally and paste it in as `APP_KEY`:
     `php artisan key:generate --show` (needs a local PHP + this codebase
     copied into a fresh `composer create-project laravel/laravel` — see
     "Running the backend locally" below for why).
   - Deploy. `nixpacks.toml`'s start command runs `php artisan migrate --force`
     on every deploy, so your schema is always current — no separate
     migration step. Railway gives you a public URL like
     `attendance-backend-production.up.railway.app`.

3. **Frontend — Vercel.**
   - Import `attendance-frontend` as a new project. Vercel reads
     `vercel.json` and auto-detects Next.js — no build config needed.
   - Set the environment variable `NEXT_PUBLIC_API_URL` to
     `https://<your-railway-url>/api`.
   - Deploy. Vercel gives you a live link immediately, e.g.
     `attendance-frontend.vercel.app`.

4. **Close the loop.** Go back to Railway's Variables tab and set
   `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`, `FRONTEND_URL`, and
   `CORS_ALLOWED_ORIGINS` to your actual Vercel domain from step 3, then
   redeploy the backend so CORS/Sanctum trust your frontend's origin.

5. **Seed data.** Railway's dashboard has a "Shell" tab on your service —
   run `php artisan db:seed` there once, to get the sample admin/employee
   logins from `DatabaseSeeder`.

Total manual work: creating two GitHub repos, clicking "New Project" twice,
and pasting env vars. Everything else — build steps, migrations on deploy —
is automated by `nixpacks.toml` and `vercel.json`.

## Running the backend locally

This repo ships a complete Laravel app — `artisan`, `public/index.php`,
`config/`, models, controllers, migrations, routes. The only thing missing
is `vendor/` (PHP dependencies), which Composer generates and which isn't
committed to source control by convention.

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate

# Set your MySQL credentials in .env, then:
php artisan migrate --seed

php artisan serve
# API now live at http://localhost:8000/api
```

Seeded login (from `DatabaseSeeder`):

| Role  | Identifier             | Password    |
|-------|-------------------------|-------------|
| Admin | admin@example.com       | password123 |
| Employee | raj.kumar@example.com | password123 |

## Running the frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
# edit .env.local if your API isn't on localhost:8000
npm run dev
# App now live at http://localhost:3000
```

Open `http://localhost:3000/login`. Employee accounts land on
`/dashboard` (check-in/out); admin accounts land on `/admin`.

**GPS note**: browsers only expose `navigator.geolocation` on secure
contexts (`https://` or `localhost`). It'll work fine on `localhost:3000`
in dev; for a real deployment you need HTTPS.

## How the geofence check actually works

1. Frontend calls `navigator.geolocation.getCurrentPosition()` to get
   lat/lng/accuracy.
2. It POSTs that to `/api/attendance/check-in`.
3. The backend (`GeofenceService`) recomputes the Haversine distance
   between the employee's assigned office and the submitted coordinates —
   **the frontend's read of "inside/outside" is never trusted**, matching
   the spec's requirement that the backend perform final geofence
   validation.
4. If accuracy is worse than the configured threshold, or the distance
   exceeds the office's radius, the check-in is rejected with a clear
   error.

## Extending this

- **WhatsApp**: add a `whatsapp_logs` migration + a `WhatsAppService` that
  wraps the Business Cloud API, then call it from `AttendanceController`
  after a successful check-in/out.
- **Leave management / holidays**: add `leaves` and `holidays` tables
  (already specced in the original doc) and factor absence calculation in
  `DashboardController::stats()` to account for them.
- **Exports**: add `maatwebsite/excel` and `barryvdh/laravel-dompdf` for
  Excel/CSV/PDF report generation off the `Attendance` query in
  `AttendanceController::history`.
- **PWA**: add a `manifest.json` + service worker registration in the
  Next.js app; note browsers can't guarantee background location tracking
  once the tab/app is closed — the spec calls this out explicitly, and any
  PWA implementation should surface that limitation to the user rather
  than promise continuous tracking.

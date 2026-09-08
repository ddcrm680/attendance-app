# Railway deployment

The repository deploys as two Railway services:

- Backend service: root directory backend/, running Laravel.
- Frontend service: root directory frontend/, running Next.js.

## Backend configuration

Attach a persistent Railway volume mounted at /data and set:

    DB_CONNECTION=sqlite
    DB_DATABASE=/data/database.sqlite
    APP_ENV=production
    APP_DEBUG=false
    APP_KEY=<generated secret>
    APP_URL=https://<backend-service>.up.railway.app
    FRONTEND_URL=https://<frontend-service>.up.railway.app
    CORS_ALLOWED_ORIGINS=https://<frontend-service>.up.railway.app
    SANCTUM_STATEFUL_DOMAINS=<frontend-service>.up.railway.app
    SESSION_SECURE_COOKIE=true

Use the remaining server-side values from backend/.env.production.example, including queue, WhatsApp, and opt-in retention settings. Never expose those values to Next.js.

## Frontend configuration

Set NEXT_PUBLIC_API_URL=https://<backend-service>.up.railway.app/api in the frontend service.

## Queue and scheduler

When WhatsApp delivery is enabled, configure the queue and run a worker with php artisan queue:work. Run php artisan schedule:run every minute through Railway scheduling/infrastructure. The scheduler includes the daily WhatsApp summary and opt-in privacy cleanup.

The Phase A WhatsApp foundation keeps delivery disabled by default, takes the Meta Graph API version from `WHATSAPP_GRAPH_API_VERSION` (default `v25.0`), and supports provider-side template payload construction for a later phase. A `sent` log means that Meta accepted the API request; delivery/read reconciliation requires the deferred webhook phase. Real Meta credentials and approved template names are intentionally not stored in this repository.

## Storage and verification

Attendance photos use private Laravel storage and must not be published as unrestricted URLs. Ensure the backend storage is writable and persistent according to the deployment’s storage policy.

After deployment:

1. Confirm the backend API URL and frontend can reach it.
2. Run php artisan migrate --force.
3. Verify Sanctum login, RBAC, a protected attendance request, and private photo authorization.
4. Confirm queue worker and scheduler processes are running.
5. Check SQLite writes remain on /data/database.sqlite across a service restart.

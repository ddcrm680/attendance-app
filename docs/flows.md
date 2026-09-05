# Application flows

## Login

1. The user submits email/mobile and password to POST /api/login.
2. The backend authenticates and returns a Sanctum bearer token and account data.
3. The frontend stores the token for API requests and routes by the returned role.

## Employee check-in

1. The employee chooses Office or an eligible/approved WFH mode.
2. The frontend requests GPS and opens the fresh-selfie camera flow.
3. The employee previews and confirms the photo.
4. The backend validates the server date, calendar, mode/eligibility, photo, GPS accuracy, and assigned active-office geofence.
5. The attendance transaction stores the punch and verified data.
6. Live tracking starts only after a successful open attendance session.

## Employee check-out

1. The employee starts check-out and captures a fresh selfie and location.
2. The backend finds the employee’s open session and revalidates photo/GPS.
3. The attendance engine stores the server-authoritative check-out and calculates duration, late/early/overtime, and status.
4. Tracking is stopped in the client and the backend rejects later updates for the closed session.

## Leave

1. An employee submits a leave type, date range, and optional reason.
2. The backend rejects invalid, overlapping, or unauthorized requests.
3. HR/Admin reviews and approves or rejects within policy scope.
4. Approved leave is reflected by the calendar and attendance rules.

## WFH

1. An eligible employee submits a date-specific WFH request.
2. HR/Admin reviews it when approval is configured.
3. An approved request permits WFH attendance according to office settings for GPS, photo, and tracking.
4. Ineligible employees and direct API attempts are rejected server-side.

## Administration

Authorized administrators use dashboard metrics, filtered attendance reports, protected photos/location details, CSV/XLSX/PDF exports, live employee locations, WhatsApp delivery controls, and paginated audit logs. Each operation remains policy-protected on the backend.

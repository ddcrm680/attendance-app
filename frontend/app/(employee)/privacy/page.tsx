export default function PrivacyPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Privacy and permissions</h1>
        <p className="mt-1 text-sm text-gray-600">
          Permissions are requested only when they are needed for attendance.
        </p>
      </div>
      <div className="space-y-3 rounded-xl border bg-white p-4 text-sm text-gray-700">
        <p>
          <b>Camera:</b> a fresh selfie is required when you punch in or out.
          Photos are stored privately and available only to you and authorised
          administrators.
        </p>
        <p>
          <b>Location:</b> GPS is requested during a punch to verify the
          applicable attendance rules. Do not grant it unless you are marking
          attendance.
        </p>
        <p>
          <b>Live tracking:</b> after a successful authorised check-in, the
          browser may send location updates until you punch out. Tracking stops
          on punch-out and may stop if you close the app/browser, revoke
          permission, lose GPS, or lose network access.
        </p>
        <p>
          <b>Retention:</b> attendance photos and closed-session location
          records are retained according to your organisation’s configured
          retention policy, then safely removed.
        </p>
      </div>
    </section>
  );
}

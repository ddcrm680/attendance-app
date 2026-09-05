export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 p-6">
      <h1 className="text-xl font-semibold">You’re offline</h1>
      <p className="text-sm text-gray-600">
        Reconnect to view live attendance data or submit a punch. For security,
        attendance punches are never stored locally for later submission.
      </p>
    </main>
  );
}

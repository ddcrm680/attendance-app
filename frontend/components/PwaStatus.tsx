"use client";

import { useEffect, useState } from "react";

export default function PwaStatus() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    if ("serviceWorker" in navigator && window.isSecureContext)
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, []);
  return online ? null : (
    <div
      role="status"
      className="fixed inset-x-3 top-3 z-[60] rounded-xl border border-[color-mix(in_srgb,var(--warning)_35%,var(--line))] bg-[var(--warning-soft)] px-3 py-2 text-center text-sm font-semibold text-[var(--warning)] shadow-lg sm:inset-x-auto sm:right-4 sm:max-w-md"
    >
      You’re offline. Attendance cannot be submitted until you reconnect; no
      punch has been saved.
    </div>
  );
}

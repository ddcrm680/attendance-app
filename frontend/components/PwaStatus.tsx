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
      className="fixed inset-x-0 top-0 z-[60] bg-amber-500 px-3 py-2 text-center text-sm font-medium text-amber-950"
    >
      You’re offline. Attendance cannot be submitted until you reconnect; no
      punch has been saved.
    </div>
  );
}

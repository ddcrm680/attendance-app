"use client";

import { useEffect, useState } from "react";
import {
  checkIn,
  checkOut,
  me,
  todayAttendance,
  trackingStatus,
  updateLocation,
  type Attendance,
  type Employee,
} from "@/lib/api";
import SelfieCapture from "@/components/SelfieCapture";
import { useLiveLocationTracking } from "@/hooks/useLiveLocationTracking";
import { formatMode, formatStatus } from "@/lib/presentation";

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selfieAction, setSelfieAction] = useState<
    "check-in" | "check-out" | null
  >(null);
  const [trackingInterval, setTrackingInterval] = useState(60);
  const [online, setOnline] = useState(true);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [mode, setMode] = useState<"office" | "wfh">("office");

  useEffect(() => {
    setOnline(navigator.onLine);
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    me()
      .then(setCurrentUser)
      .catch(() => {});
    todayAttendance()
      .then(setAttendance)
      .catch(() => setAttendance(null));
  }, []);

  useEffect(() => {
    if (!attendance?.check_in || attendance.check_out) return;
    trackingStatus()
      .then((status) => {
        if (status.active && status.tracking_interval_seconds)
          setTrackingInterval(status.tracking_interval_seconds);
      })
      .catch(() => {});
  }, [attendance]);

  const tracking = useLiveLocationTracking({
    enabled: Boolean(
      attendance?.id && attendance.check_in && !attendance.check_out,
    ),
    intervalSeconds: trackingInterval,
    onPosition: async (position) => {
      if (!attendance?.id) return;
      await updateLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        positionTimestamp: position.timestamp,
        attendanceId: attendance.id,
      });
    },
  });

  function getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(new Error("Geolocation is not supported on this device."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        resolve,
        (error) => {
          const message =
            error.code === error.PERMISSION_DENIED
              ? "Location permission was denied. Allow location access and try again."
              : error.code === error.TIMEOUT
                ? "Location request timed out. Move to an open area and try again."
                : "Your location is unavailable. Check GPS and try again.";
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    });
  }

  async function submitPunch(action: "check-in" | "check-out", photo: File) {
    if (!navigator.onLine)
      throw new Error(
        "You are offline. Reconnect before submitting attendance; this punch has not been saved.",
      );
    setMessage(null);
    setBusy(true);
    try {
      const pos = await getPosition();
      const { latitude, longitude, accuracy } = pos.coords;
      const res =
        action === "check-in"
          ? await checkIn({
              latitude,
              longitude,
              accuracy,
              positionTimestamp: pos.timestamp,
              photo,
              mode,
            })
          : await checkOut({
              latitude,
              longitude,
              accuracy,
              positionTimestamp: pos.timestamp,
              photo,
            });
      setAttendance(res.attendance);
      setMessage(res.message);
      setSelfieAction(null);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to verify your location. Please enable GPS and try again.";
      setMessage(msg);
      throw new Error(msg);
    } finally {
      setBusy(false);
    }
  }

  const hasCheckedIn = !!attendance?.check_in;
  const hasCheckedOut = !!attendance?.check_out;

  return (
    <div className="space-y-5">
      <section className="attendance-panel px-5 py-6 sm:px-6">
        <p className="text-sm font-medium text-blue-600">Daily attendance</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
          Attendance
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Record your daily attendance with location and photo verification.
        </p>
      </section>

      {!hasCheckedIn && currentUser?.wfh_available && (
        <section className="attendance-panel p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-900">Attendance mode</h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setMode("office")}
              aria-pressed={mode === "office"}
              className={`attendance-mode-option ${mode === "office" ? "attendance-mode-option-active" : ""}`}
            >
              <span className="attendance-mode-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 20h16M6 20V6.5A1.5 1.5 0 0 1 7.5 5h9A1.5 1.5 0 0 1 18 6.5V20M9 9h1m4 0h1M9 13h1m4 0h1" />
                </svg>
              </span>
              <span className="block text-sm font-semibold text-gray-900">Office</span>
              {mode === "office" && <span className="attendance-selected-mark">✓</span>}
            </button>
            <button
              type="button"
              onClick={() => setMode("wfh")}
              aria-pressed={mode === "wfh"}
              className={`attendance-mode-option ${mode === "wfh" ? "attendance-mode-option-active" : ""}`}
            >
              <span className="attendance-mode-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9Z" />
                </svg>
              </span>
              <span className="block text-sm font-semibold text-gray-900">Work from home</span>
              {mode === "wfh" && <span className="attendance-selected-mark">✓</span>}
            </button>
          </div>

        </section>
      )}

      {attendance?.check_in && !attendance.check_out && (
        <div
          className={`rounded-xl border p-3 text-sm ${tracking.state === "active" ? "border-green-200 bg-green-50 text-green-800" : tracking.state === "degraded" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-gray-200 bg-white text-gray-700"}`}
        >
          <p className="font-medium">
            {tracking.state === "active"
              ? "Live Location Tracking Active"
              : tracking.state === "degraded"
                ? "Live location tracking needs attention"
                : "Starting live location tracking…"}
          </p>
          <p className="mt-1 text-xs">
            Tracking runs only during this authorized working session and stops
            after punch-out. It cannot continue after this browser/app is
            closed.
          </p>
          {tracking.error && <p className="mt-1 text-xs">{tracking.error}</p>}
        </div>
      )}

      {!online && (
        <p
          role="alert"
          className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          Reconnect before punching in or out. Attendance is not stored for
          delayed submission.
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <button
          onClick={() => {
            setMessage(null);
            setSelfieAction("check-in");
          }}
          disabled={busy || hasCheckedIn || !online}
          className="attendance-action attendance-action-primary attendance-punch-primary w-full rounded-2xl py-4 text-base font-semibold text-white disabled:opacity-40"
        >
          <span aria-hidden="true">➤</span> Check in
        </button>

        <button
          onClick={() => {
            setMessage(null);
            setSelfieAction("check-out");
          }}
          disabled={busy || !hasCheckedIn || hasCheckedOut || !online}
          className="attendance-action attendance-action-secondary attendance-punch-secondary w-full rounded-2xl py-4 text-base font-semibold text-gray-900 disabled:opacity-40"
        >
          <span aria-hidden="true">□</span> Check out
        </button>
      </div>

      {message && (
        <p className="attendance-feedback" role="status">{message}</p>
      )}

      {selfieAction && (
        <SelfieCapture
          title={selfieAction === "check-in" ? "Punch in" : "Punch out"}
          submitting={busy}
          onCancel={() => setSelfieAction(null)}
          onConfirm={(photo) => submitPunch(selfieAction, photo)}
        />
      )}

      <section className="attendance-panel p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Today</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900">Today&apos;s attendance</h2>
          </div>
          {attendance && (
            <span className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
              {formatMode(attendance.mode)}
            </span>
          )}
        </div>
        {attendance ? (
          <div className="attendance-summary-grid mt-4">
            <div>
              <p>Check-in</p>
              <strong>{formatTime(attendance.check_in)}</strong>
            </div>
            <div>
              <p>Check-out</p>
              <strong>{formatTime(attendance.check_out)}</strong>
            </div>
            <div>
              <p>Status</p>
              <strong>{formatStatus(attendance.status)}</strong>
            </div>
          </div>
        ) : (
          <div className="attendance-empty-state mt-4">
              <span aria-hidden="true">✓</span>
              <div>
                <p className="font-semibold text-gray-900">Not yet checked in</p>
                <p className="mt-1 text-sm text-gray-600">Have a productive day!</p>
              </div>
          </div>
        )}
      </section>
    </div>
  );
}

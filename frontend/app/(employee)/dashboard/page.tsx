"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  type ApiFieldErrors,
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
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApiFieldErrors | null>(null);
  const [selfieAction, setSelfieAction] = useState<
    "check-in" | "check-out" | null
  >(null);
  const [trackingInterval, setTrackingInterval] = useState(60);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [online, setOnline] = useState(true);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [mode, setMode] = useState<"office" | "wfh">("office");
  const punchInFlight = useRef(false);

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

  const loadAttendance = useCallback(() => {
    setAttendanceLoading(true);
    setAttendanceError(null);
    todayAttendance()
      .then(setAttendance)
      .catch((error) =>
        setAttendanceError(
          error instanceof Error ? error.message : "Unable to load today’s attendance.",
        ),
      )
      .finally(() => setAttendanceLoading(false));
  }, []);

  useEffect(() => {
    me()
      .then(setCurrentUser)
      .catch(() => {});
    loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    if (!attendance?.check_in || attendance.check_out) {
      setTrackingEnabled(false);
      return;
    }
    trackingStatus()
      .then((status) => {
        setTrackingEnabled(status.active);
        if (status.active && status.tracking_interval_seconds)
          setTrackingInterval(status.tracking_interval_seconds);
      })
      .catch(() => setTrackingEnabled(false));
  }, [attendance]);

  const tracking = useLiveLocationTracking({
    enabled: Boolean(trackingEnabled && attendance?.id && attendance.check_in && !attendance.check_out),
    intervalSeconds: trackingInterval,
    onPosition: async (position) => {
      if (!attendance?.id) return;
      try {
        await updateLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          positionTimestamp: position.timestamp,
          attendanceId: attendance.id,
        });
      } catch (error) {
        const terminalTrackingError = error instanceof ApiError && (
          [403, 409].includes(error.status)
          || (error.status === 422 && (
            error.code === "tracking_office_unavailable"
            || Boolean(error.fieldErrors?.office)
          ))
        );
        if (terminalTrackingError) {
          setTrackingEnabled(false);
          const status = await trackingStatus().catch(() => null);
          setTrackingEnabled(Boolean(status?.active));
        }
        throw error;
      }
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

  function requirementsFor(action: "check-in" | "check-out") {
    const modeForAction = action === "check-in" ? mode : attendance?.mode;
    const isWfh = modeForAction === "wfh";

    return {
      photo: !isWfh || currentUser?.wfh_photo_required !== false,
      location: !isWfh || currentUser?.wfh_gps_required !== false,
    };
  }

  async function submitPunch(action: "check-in" | "check-out", photo?: File) {
    if (punchInFlight.current) return;
    if (!navigator.onLine)
      throw new Error(
        "You are offline. Reconnect before submitting attendance; this punch has not been saved.",
      );
    punchInFlight.current = true;
    setMessage(null);
    setFieldErrors(null);
    setBusy(true);
    try {
      const requirements = requirementsFor(action);
      const pos = requirements.location ? await getPosition() : undefined;
      const res =
        action === "check-in"
          ? await checkIn({
              latitude: pos?.coords.latitude,
              longitude: pos?.coords.longitude,
              accuracy: pos?.coords.accuracy,
              positionTimestamp: pos?.timestamp,
              photo,
              mode,
            })
          : await checkOut({
              latitude: pos?.coords.latitude,
              longitude: pos?.coords.longitude,
              accuracy: pos?.coords.accuracy,
              positionTimestamp: pos?.timestamp,
              photo,
              mode: attendance?.mode,
            });
      setAttendance(res.attendance);
      setAttendanceError(null);
      setMessage(res.message);
      setSelfieAction(null);
    } catch (err) {
      if (err instanceof ApiError) setFieldErrors(err.fieldErrors ?? null);
      const msg =
        err instanceof Error
          ? err.message
          : "Unable to verify your location. Please enable GPS and try again.";
      setMessage(msg);
      throw new Error(msg);
    } finally {
      punchInFlight.current = false;
      setBusy(false);
    }
  }

  const hasCheckedIn = !!attendance?.check_in;
  const hasCheckedOut = !!attendance?.check_out;

  function startPunch(action: "check-in" | "check-out") {
    setMessage(null);
    setFieldErrors(null);
    if (requirementsFor(action).photo) {
      setSelfieAction(action);
      return;
    }
    void submitPunch(action);
  }

  return (
    <div className="attendance-page app-page">
      <section className="attendance-panel attendance-header px-4 py-4 sm:px-5">
        <p className="app-eyebrow mb-2">Employee workspace</p>
        <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
          Daily attendance
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Check in and check out for today.
        </p>
      </section>

      {!hasCheckedIn && currentUser?.wfh_available && (
        <section className="attendance-panel attendance-mode-panel p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-gray-900">Attendance mode</h2>
            <span className="text-[11px] font-medium text-gray-500">Select one</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-2.5">
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
          className={`app-feedback text-sm ${tracking.state === "active" ? "app-feedback-success" : tracking.state === "degraded" ? "border-amber-200 bg-amber-50 text-amber-800" : "app-surface text-gray-700"}`}
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
          className="app-feedback border-amber-200 bg-amber-50 text-amber-800"
        >
          Reconnect before punching in or out. Attendance is not stored for
          delayed submission.
        </p>
      )}

      <div className="attendance-actions grid gap-2.5 sm:grid-cols-2">
        <button
          onClick={() => {
            startPunch("check-in");
          }}
          disabled={busy || attendanceLoading || Boolean(attendanceError) || hasCheckedIn || !online}
          className="attendance-action attendance-action-primary attendance-punch-primary w-full rounded-xl py-3 text-base font-semibold text-white disabled:opacity-40"
        >
          <span aria-hidden="true">➤</span> Check in
        </button>

        <button
          onClick={() => {
            startPunch("check-out");
          }}
          disabled={busy || attendanceLoading || Boolean(attendanceError) || !hasCheckedIn || hasCheckedOut || !online}
          className="attendance-action attendance-action-secondary attendance-punch-secondary w-full rounded-xl py-3 text-base font-semibold text-gray-900 disabled:opacity-40"
        >
          <span aria-hidden="true">□</span> Check out
        </button>
      </div>

      {message && (
        <p className="attendance-feedback" role="status">{message}</p>
      )}

      {fieldErrors && (
        <div role="alert" className="app-feedback app-feedback-error text-sm">
          {Object.values(fieldErrors).flat().map((error) => <p key={error}>{error}</p>)}
        </div>
      )}

      {attendanceError && (
        <div role="alert" className="app-feedback app-feedback-error text-sm">
          {attendanceError}{" "}
          <button type="button" className="underline" onClick={loadAttendance}>
            Retry
          </button>
        </div>
      )}

      {selfieAction && (
        <SelfieCapture
          title={selfieAction === "check-in" ? "Punch in" : "Punch out"}
          submitting={busy}
          onCancel={() => setSelfieAction(null)}
          onConfirm={(photo) => submitPunch(selfieAction, photo)}
        />
      )}

      <section className="attendance-panel attendance-today p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Today</p>
            <h2 className="mt-1 text-base font-semibold text-gray-900 sm:text-lg">Today&apos;s attendance</h2>
          </div>
          {attendance && (
            <span className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
              {formatMode(attendance.mode)}
            </span>
          )}
        </div>
        {attendanceLoading ? (
          <p className="mt-3 text-sm text-gray-500" role="status">Loading today’s attendance…</p>
        ) : attendance ? (
          <div className="attendance-summary-grid mt-3">
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
        ) : !attendanceError ? (
          <div className="attendance-empty-state mt-3">
              <span aria-hidden="true">✓</span>
              <div>
                <p className="font-semibold text-gray-900">Not yet checked in</p>
                <p className="mt-1 text-sm text-gray-600">Have a productive day!</p>
              </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

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
import LocationStatus from "@/components/LocationStatus";
import SelfieCapture from "@/components/SelfieCapture";
import { useLiveLocationTracking } from "@/hooks/useLiveLocationTracking";
import { formatDuration, formatMode, formatStatus } from "@/lib/presentation";

type GeoState = {
  status: "idle" | "detecting" | "verified" | "outside" | "error";
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  errorMessage?: string;
};

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
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
    setGeo({ status: "detecting" });
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
      setGeo({ status: "verified", latitude, longitude, accuracy });

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
      setGeo((prev) => ({
        ...prev,
        status: msg.includes("outside") ? "outside" : "error",
        errorMessage: msg,
      }));
      setMessage(msg);
      throw new Error(msg);
    } finally {
      setBusy(false);
    }
  }

  const hasCheckedIn = !!attendance?.check_in;
  const hasCheckedOut = !!attendance?.check_out;

  return (
    <div className="space-y-4">
      <LocationStatus
        status={geo.status}
        latitude={geo.latitude}
        longitude={geo.longitude}
        accuracy={geo.accuracy}
        errorMessage={geo.errorMessage}
      />

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

      <button
        onClick={() => {
          setMessage(null);
          setSelfieAction("check-in");
        }}
        disabled={busy || hasCheckedIn || !online}
        className="attendance-action attendance-action-primary w-full rounded-xl bg-gray-900 py-4 text-base font-medium text-white disabled:opacity-40"
      >
        Check in
      </button>

      {!hasCheckedIn && currentUser?.wfh_eligible && (
        <label className="block text-sm text-gray-700">
          Attendance mode
          <select
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as "office" | "wfh")
            }
            className="mt-1 w-full rounded-xl border border-gray-300 bg-white p-3"
          >
            <option value="office">Office</option>
            <option value="wfh">
              Work from home (approval required where configured)
            </option>
          </select>
        </label>
      )}

      <button
        onClick={() => {
          setMessage(null);
          setSelfieAction("check-out");
        }}
        disabled={busy || !hasCheckedIn || hasCheckedOut || !online}
        className="attendance-action attendance-action-secondary w-full rounded-xl border border-gray-300 bg-white py-4 text-base font-medium text-gray-900 disabled:opacity-40"
      >
        Check out
      </button>

      {message && (
        <p className="text-center text-sm text-gray-600">{message}</p>
      )}

      {selfieAction && (
        <SelfieCapture
          title={selfieAction === "check-in" ? "Punch in" : "Punch out"}
          submitting={busy}
          onCancel={() => setSelfieAction(null)}
          onConfirm={(photo) => submitPunch(selfieAction, photo)}
        />
      )}

      {attendance && (
        <div className="rounded-xl bg-green-50 p-4">
          <p className="mb-2 text-sm font-medium text-green-800">
            Today&apos;s attendance
          </p>
          <div className="space-y-1 text-sm text-gray-700">
            <p>Check-in: {formatTime(attendance.check_in)}</p>
            <p>Check-out: {formatTime(attendance.check_out)}</p>
            {attendance.working_minutes > 0 && (
              <p>Working hours: {formatDuration(attendance.working_minutes)}</p>
            )}
            <p>Status: {formatStatus(attendance.status)}</p>
            <p>Mode: {formatMode(attendance.mode)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

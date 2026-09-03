'use client';

import { useEffect, useState } from 'react';
import { checkIn, checkOut, todayAttendance, updateLocation, type Attendance } from '@/lib/api';
import LocationStatus from '@/components/LocationStatus';

type GeoState = {
  status: 'idle' | 'detecting' | 'verified' | 'outside' | 'error';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  errorMessage?: string;
};

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export default function DashboardPage() {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  useEffect(() => {
    todayAttendance()
      .then(setAttendance)
      .catch(() => setAttendance(null));
  }, []);

  // Live tracking: once checked in and not yet checked out, ping the backend
  // periodically with watchPosition, matching the spec's tracking interval.
  useEffect(() => {
    const isTracking = attendance?.check_in && !attendance.check_out;

    if (isTracking && watchId === null && 'geolocation' in navigator) {
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          updateLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }).catch(() => {
            // best-effort background ping; surface nothing to the user
          });
        },
        () => {},
        { enableHighAccuracy: true },
      );
      setWatchId(id);
    }

    if (!isTracking && watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [attendance, watchId]);

  function getPosition(): Promise<GeolocationPosition> {
    setGeo({ status: 'detecting' });
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation is not supported on this device.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    });
  }

  async function handleCheckIn() {
    setMessage(null);
    setBusy(true);
    try {
      const pos = await getPosition();
      const { latitude, longitude, accuracy } = pos.coords;
      setGeo({ status: 'verified', latitude, longitude, accuracy });

      const res = await checkIn({ latitude, longitude, accuracy });
      setAttendance(res.attendance);
      setMessage(res.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to verify your location. Please enable GPS and try again.';
      setGeo((prev) => ({ ...prev, status: msg.includes('outside') ? 'outside' : 'error', errorMessage: msg }));
      setMessage(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckOut() {
    setMessage(null);
    setBusy(true);
    try {
      const pos = await getPosition();
      const { latitude, longitude, accuracy } = pos.coords;
      setGeo({ status: 'verified', latitude, longitude, accuracy });

      const res = await checkOut({ latitude, longitude, accuracy });
      setAttendance(res.attendance);
      setMessage(res.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Try again.';
      setMessage(msg);
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

      <button
        onClick={handleCheckIn}
        disabled={busy || hasCheckedIn}
        className="w-full rounded-xl bg-gray-900 py-4 text-base font-medium text-white disabled:opacity-40"
      >
        Check in
      </button>

      <button
        onClick={handleCheckOut}
        disabled={busy || !hasCheckedIn || hasCheckedOut}
        className="w-full rounded-xl border border-gray-300 bg-white py-4 text-base font-medium text-gray-900 disabled:opacity-40"
      >
        Check out
      </button>

      {message && <p className="text-center text-sm text-gray-600">{message}</p>}

      {attendance && (
        <div className="rounded-xl bg-green-50 p-4">
          <p className="mb-2 text-sm font-medium text-green-800">Today&apos;s attendance</p>
          <div className="space-y-1 text-sm text-gray-700">
            <p>Check-in: {formatTime(attendance.check_in)}</p>
            <p>Check-out: {formatTime(attendance.check_out)}</p>
            {attendance.working_minutes > 0 && <p>Working hours: {formatDuration(attendance.working_minutes)}</p>}
            <p>Status: {attendance.status}</p>
          </div>
        </div>
      )}
    </div>
  );
}

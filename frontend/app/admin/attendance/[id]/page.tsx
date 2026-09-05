"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SecureAttendancePhoto from "@/components/SecureAttendancePhoto";
import { adminAttendanceDetail, type Attendance } from "@/lib/api";
import {
  formatDate,
  formatDuration,
  formatMode,
  formatTime,
} from "@/lib/presentation";
import StatusBadge from "@/components/StatusBadge";

export default function AdminAttendanceDetail({
  params,
}: {
  params: { id: string };
}) {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () =>
    adminAttendanceDetail(Number(params.id))
      .then(setAttendance)
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load attendance details.",
        ),
      );
  useEffect(() => {
    load();
  }, [params.id]);
  if (error)
    return (
      <div className="space-y-2 text-sm text-red-700">
        {error}
        <button onClick={load} className="block underline">
          Retry
        </button>
      </div>
    );
  if (!attendance)
    return (
      <p className="text-sm text-gray-500" role="status">
        Loading attendance details…
      </p>
    );
  const point = (
    label: string,
    latitude?: string | null,
    longitude?: string | null,
    accuracy?: string | null,
  ) => (
    <div>
      <p className="font-medium">{label}</p>
      <p className="text-sm text-gray-600">
        {latitude && longitude
          ? `${latitude}, ${longitude}`
          : "No verified location"}
        {accuracy ? ` · accuracy ${accuracy}m` : ""}
      </p>
    </div>
  );
  return (
    <div className="space-y-4 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/attendance" className="text-sm underline">
          ← Back to attendance
        </Link>
        <button
          onClick={() => window.print()}
          className="no-print rounded border px-3 py-2 text-sm"
        >
          Print
        </button>
      </div>
      <div>
        <h1 className="text-lg font-medium">Attendance detail</h1>
        <p>
          {attendance.employee?.name} · {attendance.employee?.employee_code}
        </p>
        <p className="text-sm text-gray-500">
          {attendance.office?.name ?? "No office"} ·{" "}
          {formatDate(attendance.attendance_date)}
        </p>
      </div>
      <section className="space-y-2 rounded border bg-white p-4 text-sm">
        <p>
          <b>Status:</b> <StatusBadge status={attendance.status} />{" "}
          <b className="ml-2">Mode:</b> {formatMode(attendance.mode)}
        </p>
        <p>
          <b>Working:</b> {formatDuration(attendance.working_minutes)} ·{" "}
          <b>Late:</b> {formatDuration(attendance.late_minutes)}
        </p>
        <p>
          <b>Early departure:</b>{" "}
          {formatDuration(attendance.early_departure_minutes)} ·{" "}
          <b>Overtime:</b> {formatDuration(attendance.overtime_minutes)}
        </p>
        <p>
          <b>Check-in:</b> {formatTime(attendance.check_in)} · <b>Check-out:</b>{" "}
          {formatTime(attendance.check_out)}
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded border bg-white p-4">
          {point(
            "Punch in",
            attendance.check_in_latitude,
            attendance.check_in_longitude,
            attendance.check_in_accuracy,
          )}
          {attendance.check_in && (
            <SecureAttendancePhoto
              attendanceId={attendance.id}
              punch="check_in"
              alt="Punch-in selfie"
            />
          )}
        </div>
        <div className="rounded border bg-white p-4">
          {point(
            "Punch out",
            attendance.check_out_latitude,
            attendance.check_out_longitude,
            attendance.check_out_accuracy,
          )}
          {attendance.check_out && (
            <SecureAttendancePhoto
              attendanceId={attendance.id}
              punch="check_out"
              alt="Punch-out selfie"
            />
          )}
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SecureAttendancePhoto from "@/components/SecureAttendancePhoto";
import { attendanceDetail, type Attendance } from "@/lib/api";
import {
  formatDate,
  formatDuration,
  formatMode,
  formatStatus,
  formatTime,
} from "@/lib/presentation";

export default function AttendanceDetail({
  params,
}: {
  params: { id: string };
}) {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () =>
    attendanceDetail(Number(params.id))
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
  return (
    <div className="space-y-4">
      <Link href="/history" className="text-sm underline">
        ← Back to attendance history
      </Link>
      <div>
        <h1 className="text-lg font-medium">Attendance detail</h1>
        <p className="text-sm text-gray-500">
          {formatDate(attendance.attendance_date)} ·{" "}
          {formatStatus(attendance.status)}
        </p>
      </div>
      <section className="space-y-2 rounded-xl border bg-white p-4 text-sm">
        <p>
          <b>Mode:</b> {formatMode(attendance.mode)}
        </p>
        <p>
          <b>Office:</b> {attendance.office?.name ?? "—"}
        </p>
        <p>
          <b>Check-in:</b> {formatTime(attendance.check_in)}{" "}
          <b className="ml-2">Check-out:</b> {formatTime(attendance.check_out)}
        </p>
        <p>
          <b>Working:</b> {formatDuration(attendance.working_minutes)}
        </p>
        <p>
          <b>Late:</b> {formatDuration(attendance.late_minutes)}{" "}
          <b className="ml-2">Early departure:</b>{" "}
          {formatDuration(attendance.early_departure_minutes)}
        </p>
        <p>
          <b>Overtime:</b> {formatDuration(attendance.overtime_minutes)}
        </p>
        <p>
          <b>GPS accuracy:</b>{" "}
          {attendance.check_in_accuracy
            ? `${attendance.check_in_accuracy}m at check-in`
            : "Not required"}
        </p>
      </section>
      <section className="grid grid-cols-2 gap-3">
        {attendance.check_in && (
          <SecureAttendancePhoto
            attendanceId={attendance.id}
            punch="check_in"
            alt="Verified punch-in selfie"
          />
        )}
        {attendance.check_out && (
          <SecureAttendancePhoto
            attendanceId={attendance.id}
            punch="check_out"
            alt="Verified punch-out selfie"
          />
        )}
      </section>
    </div>
  );
}

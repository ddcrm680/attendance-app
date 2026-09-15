"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AttendanceDetailRecord from "@/components/AttendanceDetailRecord";
import AppLoading from "@/components/AppLoading";
import PageHeader from "@/components/PageHeader";
import { adminAttendanceDetail, type Attendance } from "@/lib/api";
import { formatDate, formatMode } from "@/lib/presentation";

export default function AdminAttendanceDetail({ params }: { params: { id: string } }) {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () =>
    adminAttendanceDetail(Number(params.id))
      .then(setAttendance)
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load attendance details.",
        ),
      );

  useEffect(() => {
    load();
  }, [params.id]);

  if (error) {
    return (
      <div role="alert" className="app-feedback app-feedback-error">
        {error}{" "}
        <button type="button" className="attendance-detail-retry" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  if (!attendance) return <AppLoading message="Loading attendance details…" />;

  return (
    <div className="attendance-detail-page print:p-0">
      <div className="attendance-detail-actions">
        <Link href="/admin/attendance" className="attendance-detail-back">
          ← Back to attendance
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="app-secondary-action no-print"
        >
          Print
        </button>
      </div>
      <PageHeader
        eyebrow="Attendance record"
        title="Attendance detail"
        description={`${attendance.employee?.name ?? "Employee"} · ${attendance.employee?.employee_code ?? "—"}`}
      />
      <p className="attendance-detail-admin-context">
        {attendance.office?.name ?? "No office"} · {formatDate(attendance.attendance_date)} ·{" "}
        {formatMode(attendance.mode)}
      </p>
      <AttendanceDetailRecord attendance={attendance} photoAltPrefix="Employee" />
    </div>
  );
}

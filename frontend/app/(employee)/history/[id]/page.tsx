"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AttendanceDetailRecord from "@/components/AttendanceDetailRecord";
import AppLoading from "@/components/AppLoading";
import PageHeader from "@/components/PageHeader";
import { attendanceDetail, type Attendance } from "@/lib/api";
import { formatDate, formatMode } from "@/lib/presentation";

export default function AttendanceDetail({ params }: { params: { id: string } }) {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () =>
    attendanceDetail(Number(params.id))
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
    <div className="attendance-detail-page">
      <Link href="/history" className="attendance-detail-back">
        ← Back to attendance history
      </Link>
      <PageHeader
        eyebrow="Your attendance record"
        title="Attendance detail"
        description={`${formatDate(attendance.attendance_date)} · ${formatMode(attendance.mode)} · ${attendance.office?.name ?? "No office"}`}
      />
      <AttendanceDetailRecord attendance={attendance} photoAltPrefix="Verified" />
    </div>
  );
}

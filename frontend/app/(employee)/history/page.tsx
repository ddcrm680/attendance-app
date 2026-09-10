"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { attendanceHistory, type Attendance } from "@/lib/api";
import {
  formatDate,
  formatDuration,
  formatMode,
  formatTime,
} from "@/lib/presentation";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";
export default function HistoryPage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [last, setLast] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    attendanceHistory({ from, to, page })
      .then((r) => {
        setRecords(r.data);
        setLast(r.last_page);
      })
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Unable to load attendance history.",
        ),
      )
      .finally(() => setLoading(false));
  }, [from, to, page]);
  useEffect(() => {
    load();
  }, [load]);
  return (
    <div className="app-page">
      <PageHeader
        title="Attendance history"
        description="Your verified attendance records."
      />
      <div className="app-card grid grid-cols-2 gap-3 p-3 sm:p-4">
        <label className="text-xs">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="app-form-control mt-1"
          />
        </label>
        <label className="text-xs">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="app-form-control mt-1"
          />
        </label>
      </div>
      {loading && <p className="text-sm text-gray-500">Loading attendance…</p>}
      {error && (
        <div className="app-feedback app-feedback-error">
          {error}
          <button onClick={load} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}
      {!loading && !error && !records.length && (
        <p className="app-empty-state text-sm">
          No attendance records for this period.
        </p>
      )}
      <div className="space-y-2">
        {records.map((r) => (
          <Link
            href={`/history/${r.id}`}
            key={r.id}
            className="app-card block p-4 transition-transform hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex justify-between">
              <b>{formatDate(r.attendance_date)}</b>
              <StatusBadge status={r.status} />
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {formatMode(r.mode)} · {formatTime(r.check_in)} –{" "}
              {formatTime(r.check_out)}
            </p>
            <p className="text-xs text-gray-500">
              {r.working_minutes
                ? `Working ${formatDuration(r.working_minutes)}`
                : "Open session"}
              {r.late_minutes
                ? ` · Late ${formatDuration(r.late_minutes)}`
                : ""}
              {r.overtime_minutes
                ? ` · Overtime ${formatDuration(r.overtime_minutes)}`
                : ""}
            </p>
          </Link>
        ))}
      </div>
      {last > 1 && (
        <div className="flex justify-between">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="app-secondary-action rounded px-3 py-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm">
            Page {page} of {last}
          </span>
          <button
            disabled={page === last}
            onClick={() => setPage(page + 1)}
            className="app-secondary-action rounded px-3 py-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

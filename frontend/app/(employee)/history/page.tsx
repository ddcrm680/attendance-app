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
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-medium">Attendance history</h1>
        <p className="text-sm text-gray-500">
          Your verified attendance records.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded border p-2"
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
            className="mt-1 w-full rounded border p-2"
          />
        </label>
      </div>
      {loading && <p className="text-sm text-gray-500">Loading attendance…</p>}
      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={load} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}
      {!loading && !error && !records.length && (
        <p className="rounded border border-dashed p-5 text-sm text-gray-500">
          No attendance records for this period.
        </p>
      )}
      <div className="space-y-2">
        {records.map((r) => (
          <Link
            href={`/history/${r.id}`}
            key={r.id}
            className="block rounded-xl border bg-white p-4"
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
            className="rounded border px-3 py-2 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm">
            Page {page} of {last}
          </span>
          <button
            disabled={page === last}
            onClick={() => setPage(page + 1)}
            className="rounded border px-3 py-2 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

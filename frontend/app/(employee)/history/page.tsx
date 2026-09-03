'use client';

import { useEffect, useState } from 'react';
import { attendanceHistory, type Attendance } from '@/lib/api';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'short' });
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

const statusColor: Record<string, string> = {
  present: 'bg-green-100 text-green-800',
  late: 'bg-amber-100 text-amber-800',
  half_day: 'bg-orange-100 text-orange-800',
  absent: 'bg-red-100 text-red-800',
  work_from_home: 'bg-blue-100 text-blue-800',
};

export default function HistoryPage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    attendanceHistory()
      .then((res) => setRecords(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (records.length === 0) return <p className="text-sm text-gray-500">No attendance records yet.</p>;

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <div key={record.id} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">{formatDate(record.attendance_date)}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[record.status] ?? 'bg-gray-100 text-gray-700'}`}>
              {record.status.replace('_', ' ')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
            <span>Check-in: {formatTime(record.check_in)}</span>
            <span>Check-out: {formatTime(record.check_out)}</span>
            {record.working_minutes > 0 && <span>Hours: {formatDuration(record.working_minutes)}</span>}
            {record.late_minutes > 0 && <span>Late by: {record.late_minutes}m</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

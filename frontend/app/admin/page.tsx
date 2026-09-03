'use client';

import { useEffect, useState } from 'react';
import { adminDashboard } from '@/lib/api';
import StatCard from '@/components/StatCard';

type Stats = Awaited<ReturnType<typeof adminDashboard>>;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminDashboard()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!stats) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div>
      <h1 className="mb-4 text-lg font-medium">Today — {stats.date}</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total employees" value={stats.total_employees} />
        <StatCard label="Present today" value={stats.present_today} />
        <StatCard label="Absent today" value={stats.absent_today} />
        <StatCard label="Late today" value={stats.late_today} />
        <StatCard label="Currently working" value={stats.currently_working} />
        <StatCard label="Checked out" value={stats.checked_out} />
        <StatCard label="Avg working minutes" value={stats.average_working_minutes} />
      </div>
    </div>
  );
}

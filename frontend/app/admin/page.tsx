"use client";

import { useEffect, useState } from "react";
import { adminDashboard, adminDashboardCharts } from "@/lib/api";
import StatCard from "@/components/StatCard";
import { formatDate, formatDuration } from "@/lib/presentation";

type Stats = Awaited<ReturnType<typeof adminDashboard>>;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [charts, setCharts] = useState<Awaited<
    ReturnType<typeof adminDashboardCharts>
  > | null>(null);

  useEffect(() => {
    adminDashboard()
      .then(setStats)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard",
        ),
      );
    adminDashboardCharts()
      .then(setCharts)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load charts"),
      );
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
        <StatCard label="On leave" value={stats.on_leave} />
        <StatCard label="Currently working" value={stats.currently_working} />
        <StatCard label="Checked out" value={stats.checked_out} />
        <StatCard
          label="Avg working hours"
          value={formatDuration(stats.average_working_minutes)}
        />
      </div>
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-medium">Daily attendance (30 days)</h2>
          {charts?.daily.length ? (
            <div className="space-y-1">
              {charts.daily.slice(-10).map((d) => (
                <div key={d.date} className="flex items-center gap-2 text-xs">
                  <span className="w-20">{formatDate(d.date)}</span>
                  <div
                    className="h-3 bg-green-500"
                    style={{ width: `${Math.min(100, d.present * 8)}%` }}
                  />
                  <span>
                    {d.present}/{d.total} · late {d.late}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No attendance data yet.</p>
          )}
        </div>
        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 font-medium">Department attendance</h2>
          {charts?.departments.length ? (
            <div className="space-y-2">
              {charts.departments.map((d) => (
                <div key={d.name} className="text-sm">
                  <div className="flex justify-between">
                    <span>{d.name}</span>
                    <span>{d.total}</span>
                  </div>
                  <div
                    className="mt-1 h-2 bg-blue-500"
                    style={{ width: `${Math.min(100, d.total * 8)}%` }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No department data yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

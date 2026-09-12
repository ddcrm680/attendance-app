"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminLiveEmployees, type LiveEmployee } from "@/lib/api";
import LiveLocationMap from "@/components/LiveLocationMap";
import PageHeader from "@/components/PageHeader";

const STALE_AFTER_MS = 2 * 60 * 1000;
const formatTime = (value: string) => new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const formatCoordinates = (latitude: number, longitude: number) => `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

export default function LiveLocationsPage() {
  const [employees, setEmployees] = useState<LiveEmployee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState<number | null>(null);
  const load = useCallback(async () => {
    try { setError(null); setEmployees(await adminLiveEmployees()); setLastRefreshed(new Date()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load live locations."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); const timer = window.setInterval(load, 30000); return () => window.clearInterval(timer); }, [load]);
  const reportingCount = employees.filter((employee) => employee.last_location).length;
  const staleCount = employees.filter((employee) => !employee.last_location || Date.now() - new Date(employee.last_location.recorded_at).getTime() > STALE_AFTER_MS).length;

  return <div className="live-locations-page">
    <nav className="live-location-breadcrumbs" aria-label="Breadcrumb"><Link href="/admin">Dashboard</Link><span aria-hidden="true">›</span><span aria-current="page">Live locations</span></nav>
    <PageHeader eyebrow="Workforce tracking" title="Live employee locations" description="Employees with an open attendance session. Reported coordinates refresh every 30 seconds." actions={<button type="button" onClick={load} className="app-secondary-action live-location-refresh"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0 2 5.3M20 4v7h-7" /></svg>Refresh</button>} />
    <section className="live-location-summary" aria-label="Live location summary"><div className="stat-card"><p className="stat-card-label">Employees live</p><p className="stat-card-value">{employees.length}</p></div><div className="stat-card"><p className="stat-card-label">Reporting location</p><p className="stat-card-value">{reportingCount}</p></div><div className="stat-card"><p className="stat-card-label">Stale / unavailable</p><p className="stat-card-value">{staleCount}</p></div><div className="live-location-refresh-status app-card"><span className="live-location-pulse" aria-hidden="true" /><div><strong>Live view</strong><p>{lastRefreshed ? `Last refreshed ${formatTime(lastRefreshed.toISOString())}` : "Waiting for first refresh"}</p></div></div></section>
    {error && <p role="alert" className="app-feedback app-feedback-error">{error}</p>}
    {loading ? <div className="app-card live-location-loading" role="status">Loading live employee locations…</div> : <><LiveLocationMap employees={employees} selectedAttendanceId={selectedAttendanceId} onSelect={(employee) => setSelectedAttendanceId(employee?.attendance_id ?? null)} /><section className="live-location-list" aria-labelledby="employee-location-list-title"><div className="live-location-list-heading"><div><p className="app-eyebrow">Employee list</p><h2 id="employee-location-list-title">Open attendance sessions</h2></div><span>{employees.length} employee{employees.length === 1 ? "" : "s"}</span></div>{employees.length ? <div className="live-location-card-grid">{employees.map((employee) => <EmployeeLocationCard key={employee.attendance_id} employee={employee} selected={employee.attendance_id === selectedAttendanceId} onSelect={() => setSelectedAttendanceId(employee.attendance_id === selectedAttendanceId ? null : employee.attendance_id)} />)}</div> : <div className="app-empty-state"><strong>No employees are currently working.</strong><span>Employees appear here while they have an open attendance session.</span></div>}</section></>}
  </div>;
}

function EmployeeLocationCard({ employee, selected, onSelect }: { employee: LiveEmployee; selected: boolean; onSelect: () => void }) {
  const location = employee.last_location;
  const stale = !location || Date.now() - new Date(location.recorded_at).getTime() > STALE_AFTER_MS;
  const stateLabel = !location ? "Location unavailable" : stale ? "Location stale" : "Live";
  return <article className={`live-location-employee-card ${selected ? "live-location-employee-card-selected" : ""}`} tabIndex={0} role="button" aria-label={`Show details for ${employee.name}`} aria-pressed={selected} onClick={onSelect} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }}><div className="live-location-employee-card-top"><div><h3>{employee.name}</h3><p>{employee.employee_code}</p></div><span className={`live-location-state ${stale ? "live-location-state-stale" : "live-location-state-live"}`}><i aria-hidden="true" />{stateLabel}</span></div><dl className="live-location-details"><div><dt>Attendance</dt><dd>{employee.status}</dd></div><div><dt>Office</dt><dd>{employee.office ?? "Not available"}</dd></div><div><dt>Checked in</dt><dd>{formatTime(employee.check_in)}</dd></div><div><dt>Last updated</dt><dd>{location ? formatTime(location.recorded_at) : "No location received"}</dd></div>{location && <><div><dt>Accuracy</dt><dd>{Math.round(location.accuracy)} m</dd></div><div className="live-location-coordinates"><dt>Coordinates</dt><dd>{formatCoordinates(location.latitude, location.longitude)}</dd></div></>}</dl></article>;
}

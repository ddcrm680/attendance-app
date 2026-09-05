'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminLiveEmployees, type LiveEmployee } from '@/lib/api';
import LiveLocationMap from '@/components/LiveLocationMap';

const STALE_AFTER_MS = 2 * 60 * 1000;

export default function LiveLocationsPage() {
  const [employees, setEmployees] = useState<LiveEmployee[]>([]); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { try { setError(null); setEmployees(await adminLiveEmployees()); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load live locations.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); const timer = window.setInterval(load, 30000); return () => window.clearInterval(timer); }, [load]);
  return <div className="space-y-4"><div className="flex items-center justify-between"><div><h1 className="text-lg font-medium">Live employee locations</h1><p className="text-sm text-gray-500">Only employees with an open attendance session are shown. Refreshes every 30 seconds.</p></div><button onClick={load} className="rounded border px-3 py-2 text-sm">Refresh</button></div>{error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}{loading ? <p className="text-sm text-gray-500">Loading live locations…</p> : <><LiveLocationMap employees={employees} /><div className="space-y-2">{employees.map((employee) => { const stale = !employee.last_location || Date.now() - new Date(employee.last_location.recorded_at).getTime() > STALE_AFTER_MS; return <div key={employee.attendance_id} className="rounded-xl border bg-white p-3 text-sm"><div className="flex justify-between"><span className="font-medium">{employee.name} · {employee.employee_code}</span><span className={stale ? 'text-amber-700' : 'text-green-700'}>{stale ? 'Location stale/unavailable' : 'Live'}</span></div><p className="mt-1 text-gray-500">{employee.office ?? 'No office'} · checked in {new Date(employee.check_in).toLocaleTimeString()}</p>{employee.last_location && <p className="text-xs text-gray-500">Accuracy {Math.round(employee.last_location.accuracy)}m · updated {new Date(employee.last_location.recorded_at).toLocaleTimeString()}</p>}</div>; })}{employees.length === 0 && <p className="rounded-xl border border-dashed p-6 text-sm text-gray-500">No employees are currently working.</p>}</div></>}</div>;
}

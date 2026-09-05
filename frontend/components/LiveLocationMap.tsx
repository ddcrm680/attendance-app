'use client';

import type { LiveEmployee } from '@/lib/api';

export default function LiveLocationMap({ employees }: { employees: LiveEmployee[] }) {
  const points = employees.filter((employee) => employee.last_location);
  if (!points.length) return <div className="rounded-xl border border-dashed p-6 text-sm text-gray-500">Working employees have not sent a verified location yet.</div>;
  const lats = points.map((item) => item.last_location!.latitude); const lngs = points.map((item) => item.last_location!.longitude);
  const minLat = Math.min(...lats); const maxLat = Math.max(...lats); const minLng = Math.min(...lngs); const maxLng = Math.max(...lngs);
  const x = (lng: number) => ((lng - minLng) / (maxLng - minLng || 1)) * 88 + 6;
  const y = (lat: number) => 94 - ((lat - minLat) / (maxLat - minLat || 1)) * 88;
  return <div className="overflow-hidden rounded-xl border bg-slate-50 p-3"><p className="mb-2 text-xs text-gray-500">Verified current positions — coordinate view, refreshed periodically</p><svg viewBox="0 0 100 100" className="aspect-video w-full rounded-lg bg-slate-100" aria-label="Live employee location map">{points.map((employee) => <g key={employee.attendance_id}><circle cx={x(employee.last_location!.longitude)} cy={y(employee.last_location!.latitude)} r="2.5" className="fill-blue-600" /><text x={x(employee.last_location!.longitude) + 3} y={y(employee.last_location!.latitude) - 3} className="fill-slate-700 text-[4px]">{employee.employee_code}</text></g>)}</svg></div>;
}

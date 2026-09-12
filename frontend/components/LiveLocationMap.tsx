"use client";

import type { LiveEmployee } from "@/lib/api";
import { useLayoutEffect, useRef, useState } from "react";

type PopoverPosition = { left: number; top: number; placement: "top" | "bottom" | "left" | "right" };

export default function LiveLocationMap({ employees, selectedAttendanceId, onSelect }: { employees: LiveEmployee[]; selectedAttendanceId?: number | null; onSelect?: (employee: LiveEmployee | null) => void }) {
  const [hoveredAttendanceId, setHoveredAttendanceId] = useState<number | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const points = employees.filter((employee) => employee.last_location);

  const lats = points.map((item) => item.last_location!.latitude);
  const lngs = points.map((item) => item.last_location!.longitude);
  const minLat = Math.min(...lats); const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs); const maxLng = Math.max(...lngs);
  const x = (lng: number) => ((lng - minLng) / (maxLng - minLng || 1)) * 78 + 11;
  const y = (lat: number) => 88 - ((lat - minLat) / (maxLat - minLat || 1)) * 76;
  const activeAttendanceId = selectedAttendanceId ?? hoveredAttendanceId;
  const activeEmployee = points.find((employee) => employee.attendance_id === activeAttendanceId) ?? null;

  useLayoutEffect(() => {
    if (!activeEmployee?.last_location || !canvasRef.current || !markerRefs.current[activeEmployee.attendance_id]) {
      setPopoverPosition(null);
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const marker = markerRefs.current[activeEmployee.attendance_id];
      if (!canvas || !marker) return;
      const canvasRect = canvas.getBoundingClientRect();
      const markerRect = marker.getBoundingClientRect();
      const gap = 12;
      const width = Math.min(304, Math.max(180, canvas.clientWidth - gap * 2));
      const height = 174;
      const markerLeft = markerRect.left - canvasRect.left;
      const markerRight = markerRect.right - canvasRect.left;
      const markerTop = markerRect.top - canvasRect.top;
      const markerBottom = markerRect.bottom - canvasRect.top;
      const clampLeft = (value: number) => Math.max(gap, Math.min(value, canvas.clientWidth - width - gap));
      const clampTop = (value: number) => Math.max(gap, Math.min(value, canvas.clientHeight - height - gap));
      let placement: PopoverPosition["placement"] = "bottom";
      let left = clampLeft((markerLeft + markerRight) / 2 - width / 2);
      let top = markerBottom + gap;
      if (canvas.clientHeight - markerBottom >= height + gap) {
        placement = "bottom";
      } else if (markerTop >= height + gap) {
        placement = "top";
        top = markerTop - height - gap;
      } else if (canvas.clientWidth - markerRight >= width + gap) {
        placement = "right";
        left = markerRight + gap;
        top = clampTop((markerTop + markerBottom) / 2 - height / 2);
      } else if (markerLeft >= width + gap) {
        placement = "left";
        left = markerLeft - width - gap;
        top = clampTop((markerTop + markerBottom) / 2 - height / 2);
      } else {
        top = clampTop(top);
      }
      setPopoverPosition({ left: clampLeft(left), top: clampTop(top), placement });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeEmployee?.attendance_id, activeEmployee?.last_location?.recorded_at, points.length]);

  if (!points.length) {
    return <section className="live-location-map app-card" aria-labelledby="location-overview-title"><div className="live-location-map-heading"><div><p className="app-eyebrow">Location overview</p><h2 id="location-overview-title">No reported positions yet</h2><p>Employees with open sessions will appear here after they send a location update.</p></div></div><div className="app-empty-state">No live coordinates are available.</div></section>;
  }

  return <section className="live-location-map app-card" aria-labelledby="location-overview-title">
    <div className="live-location-map-heading"><div><p className="app-eyebrow">Location overview</p><h2 id="location-overview-title">Reported employee positions</h2><p>Relative view of reported coordinates. Street addresses are not available.</p></div><span className="live-location-map-count">{points.length} reporting</span></div>
    <div ref={canvasRef} className="live-location-canvas" role="region" aria-label={`${points.length} employee${points.length === 1 ? "" : "s"} with reported live coordinates`}>
      <div className="live-location-canvas-grid" aria-hidden="true" />
      {points.map((employee, index) => { const location = employee.last_location!; const selected = employee.attendance_id === selectedAttendanceId; return <div key={employee.attendance_id} className={`live-location-marker ${selected ? "live-location-marker-selected" : ""}`} style={{ left: `${x(location.longitude)}%`, top: `${y(location.latitude)}%` }}><button ref={(element) => { markerRefs.current[employee.attendance_id] = element; }} type="button" className="live-location-marker-button" aria-label={`Show ${employee.name}, ${employee.employee_code}`} aria-pressed={selected} onMouseEnter={() => setHoveredAttendanceId(employee.attendance_id)} onMouseLeave={() => setHoveredAttendanceId(null)} onFocus={() => setHoveredAttendanceId(employee.attendance_id)} onBlur={() => setHoveredAttendanceId(null)} onClick={() => onSelect?.(selected ? null : employee)}><span className="live-location-marker-pin" aria-hidden="true">{index + 1}</span><span className="live-location-marker-label">{employee.employee_code}</span></button></div>; })}
      {activeEmployee?.last_location && popoverPosition && <div className={`live-location-popover live-location-popover-${popoverPosition.placement}`} style={{ left: popoverPosition.left, top: popoverPosition.top }} role="status"><div className="live-location-popover-heading"><div><strong>{activeEmployee.name}</strong><small>{activeEmployee.employee_code}</small></div><button type="button" aria-label="Close location details" onClick={() => onSelect?.(null)}>×</button></div><div className="live-location-popover-status"><i aria-hidden="true" />{activeEmployee.status} · Location reported</div><dl><div><dt>Last updated</dt><dd>{new Date(activeEmployee.last_location.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</dd></div><div><dt>Accuracy</dt><dd>{Math.round(activeEmployee.last_location.accuracy)} m</dd></div><div className="live-location-popover-coordinates"><dt>Coordinates</dt><dd>{activeEmployee.last_location.latitude.toFixed(5)}, {activeEmployee.last_location.longitude.toFixed(5)}</dd></div></dl></div>}
    </div>
  </section>;
}

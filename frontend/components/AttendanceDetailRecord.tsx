"use client";

import SecureAttendancePhoto from "@/components/SecureAttendancePhoto";
import StatusBadge from "@/components/StatusBadge";
import type { Attendance } from "@/lib/api";
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatMode,
  formatOfficeDistance,
} from "@/lib/presentation";

type Props = {
  attendance: Attendance;
  photoAltPrefix: string;
};

export default function AttendanceDetailRecord({
  attendance,
  photoAltPrefix,
}: Props) {
  return (
    <>
      <section
        className="attendance-detail-summary app-card"
        aria-labelledby="attendance-summary-title"
      >
        <div className="attendance-detail-section-heading">
          <div>
            <p className="app-eyebrow">Attendance summary</p>
            <h2 id="attendance-summary-title">Record at a glance</h2>
          </div>
          <StatusBadge status={attendance.status} />
        </div>
        <dl className="attendance-detail-context-grid">
          <DetailItem label="Office" value={attendance.office?.name ?? "Not available"} />
          <DetailItem label="Attendance date" value={formatDate(attendance.attendance_date)} />
          <DetailItem label="Mode" value={formatMode(attendance.mode)} />
        </dl>
        <dl className="attendance-detail-metrics">
          <DetailItem label="Check-in" value={formatDateTime(attendance.check_in)} />
          <DetailItem
            label="Check-out"
            value={attendance.check_out ? formatDateTime(attendance.check_out) : "Not checked out"}
          />
          <DetailItem label="Working time" value={formatDuration(attendance.working_minutes)} />
          <DetailItem label="Late" value={formatDuration(attendance.late_minutes)} />
          <DetailItem
            label="Early departure"
            value={formatDuration(attendance.early_departure_minutes)}
          />
          <DetailItem label="Overtime" value={formatDuration(attendance.overtime_minutes)} />
        </dl>
      </section>

      <section className="attendance-detail-evidence" aria-labelledby="punch-evidence-title">
        <div className="attendance-detail-section-heading">
          <div>
            <p className="app-eyebrow">Punch evidence</p>
            <h2 id="punch-evidence-title">Check-in and check-out</h2>
            <p>Location and selfie evidence captured for this attendance record.</p>
          </div>
        </div>
        <div className="attendance-detail-punch-grid">
          <PunchEvidence
            attendance={attendance}
            label="Punch in"
            timestamp={attendance.check_in}
            latitude={attendance.check_in_latitude}
            longitude={attendance.check_in_longitude}
            accuracy={attendance.check_in_accuracy}
            distance={attendance.check_in_distance_meters}
            punch="check_in"
            photoAlt={`${photoAltPrefix} punch-in selfie`}
          />
          <PunchEvidence
            attendance={attendance}
            label="Punch out"
            timestamp={attendance.check_out}
            latitude={attendance.check_out_latitude}
            longitude={attendance.check_out_longitude}
            accuracy={attendance.check_out_accuracy}
            distance={attendance.check_out_distance_meters}
            punch="check_out"
            photoAlt={`${photoAltPrefix} punch-out selfie`}
          />
        </div>
      </section>
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

type PunchEvidenceProps = {
  attendance: Attendance;
  label: string;
  timestamp: string | null | undefined;
  latitude: string | null | undefined;
  longitude: string | null | undefined;
  accuracy: string | null | undefined;
  distance: string | null | undefined;
  punch: "check_in" | "check_out";
  photoAlt: string;
};

function PunchEvidence({
  attendance,
  label,
  timestamp,
  latitude,
  longitude,
  accuracy,
  distance,
  punch,
  photoAlt,
}: PunchEvidenceProps) {
  const hasLocation = Boolean(latitude && longitude);
  const unavailable = timestamp ? "Not available" : "Not available until checkout";

  return (
    <article className="attendance-detail-punch app-card">
      <div className="attendance-detail-punch-heading">
        <div>
          <p className="app-eyebrow">{label}</p>
          <h3>{timestamp ? formatDateTime(timestamp) : "Not checked out"}</h3>
        </div>
      </div>
      <dl className="attendance-detail-location-grid">
        <DetailItem
          label="Location"
          value={hasLocation ? `${latitude}, ${longitude}` : unavailable}
        />
        <DetailItem label="GPS accuracy" value={accuracy ? `${accuracy} m` : unavailable} />
        <DetailItem
          label="Distance from assigned office"
          value={timestamp ? formatOfficeDistance(distance, attendance.mode) : unavailable}
        />
      </dl>
      {timestamp && (
        <div className="attendance-detail-photo-evidence">
          <p>Selfie evidence</p>
          <SecureAttendancePhoto attendanceId={attendance.id} punch={punch} alt={photoAlt} />
        </div>
      )}
    </article>
  );
}

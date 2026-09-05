export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes))
    return "—";
  const total = Math.max(0, Math.round(minutes));
  return `${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(
    value.includes("T") ? value : `${value.slice(0, 10)}T00:00:00`,
  );
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${formatDate(value)} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatStatus(value: string | null | undefined): string {
  const labels: Record<string, string> = {
    present: "Present",
    late: "Late",
    half_day: "Half day",
    partial: "Partial attendance",
    absent: "Absent",
    work_from_home: "Work From Home",
    working: "Currently working",
    holiday: "Holiday",
    leave: "On leave",
    week_off: "Week off",
    working_day: "Working day",
  };
  return value
    ? (labels[value] ??
        value
          .replaceAll("_", " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase()))
    : "—";
}

export function formatMode(value: string | null | undefined): string {
  return value === "wfh"
    ? "Work From Home"
    : value === "office"
      ? "Office"
      : "—";
}

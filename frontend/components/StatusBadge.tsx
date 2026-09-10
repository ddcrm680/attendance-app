import { formatStatus } from "@/lib/presentation";

export default function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "present" ||
    status === "approved" ||
    status === "working" ||
    status === "active"
      ? "status-good"
      : status === "late" || status === "pending" || status === "partial"
        ? "status-warn"
        : status === "rejected" ||
            status === "absent" ||
            status === "inactive" ||
            status === "suspended"
          ? "status-bad"
          : "status-neutral";
  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {formatStatus(status)}
    </span>
  );
}

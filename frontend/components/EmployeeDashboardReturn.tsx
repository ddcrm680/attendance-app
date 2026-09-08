import Link from "next/link";
import type { Employee } from "@/lib/api";
import NavIcon from "@/components/NavIcon";

type DashboardReturn = {
  href: string;
  label: string;
};

/** Keeps privileged self-service navigation in one place. */
export function employeeDashboardReturn(
  role: Employee["role"],
): DashboardReturn | null {
  const dashboards: Partial<Record<Employee["role"], DashboardReturn>> = {
    hr_admin: { href: "/admin", label: "Back to Admin Dashboard" },
    super_admin: { href: "/admin", label: "Back to Admin Dashboard" },
  };

  return dashboards[role] ?? null;
}

export default function EmployeeDashboardReturn({
  role,
}: {
  role: Employee["role"];
}) {
  const destination = employeeDashboardReturn(role);

  if (!destination) return null;

  return (
    <Link
      href={destination.href}
      aria-label={destination.label}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
    >
      <NavIcon name="back" />
      <span className="sm:hidden">Dashboard</span>
      <span className="hidden sm:inline">{destination.label}</span>
    </Link>
  );
}

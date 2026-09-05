"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout, clearToken } from "@/lib/api";
import RoleGate from "@/components/RoleGate";
import NavIcon from "@/components/NavIcon";
import ThemeToggle from "@/components/ThemeToggle";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // ignore; clear locally regardless
    }
    clearToken();
    router.push("/login");
  }

  const links = [
    { href: "/admin", label: "Dashboard", icon: "dashboard" as const },
    { href: "/dashboard", label: "My attendance", icon: "attendance" as const },
    { href: "/leave", label: "My leave", icon: "leave" as const },
    { href: "/wfh", label: "My WFH", icon: "wfh" as const },
    {
      href: "/admin/employees",
      label: "Employees",
      icon: "employees" as const,
    },
    {
      href: "/admin/departments",
      label: "Departments",
      icon: "departments" as const,
    },
    { href: "/admin/offices", label: "Offices", icon: "offices" as const },
    { href: "/admin/leave", label: "Leave", icon: "leave" as const },
    { href: "/admin/holidays", label: "Holidays", icon: "calendar" as const },
    { href: "/admin/wfh", label: "WFH requests", icon: "wfh" as const },
    { href: "/admin/live-locations", label: "Live map", icon: "live" as const },
    {
      href: "/admin/attendance",
      label: "Attendance",
      icon: "attendance" as const,
    },
    { href: "/admin/whatsapp", label: "WhatsApp", icon: "whatsapp" as const },
    { href: "/admin/audit", label: "Audit log", icon: "audit" as const },
  ];

  return (
    <RoleGate allowed={["hr_admin", "super_admin"]} fallback="/dashboard">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="w-full border-b border-gray-200 bg-white p-4 md:w-56 md:border-b-0 md:border-r">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm font-semibold tracking-tight">
              Attendance admin
            </p>
            <ThemeToggle />
          </div>
          <nav className="flex gap-1 overflow-x-auto md:block md:space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
                  pathname === link.href
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <NavIcon name={link.icon} />
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
          <button
            onClick={handleLogout}
            className="mt-6 flex items-center gap-2 text-sm text-gray-400 hover:text-gray-900"
          >
            <NavIcon name="logout" /> Log out
          </button>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </RoleGate>
  );
}

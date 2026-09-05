"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout, clearToken } from "@/lib/api";
import RoleGate from "@/components/RoleGate";
import NavIcon from "@/components/NavIcon";
import ThemeToggle from "@/components/ThemeToggle";

export default function EmployeeLayout({
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
      // token may already be invalid; clear locally regardless
    }
    clearToken();
    router.push("/login");
  }

  const tabs = [
    { href: "/dashboard", label: "Home", icon: "home" as const },
    { href: "/history", label: "Attendance", icon: "attendance" as const },
    { href: "/leave", label: "Leave", icon: "leave" as const },
    { href: "/calendar", label: "Calendar", icon: "calendar" as const },
    { href: "/wfh", label: "WFH", icon: "wfh" as const },
    { href: "/privacy", label: "Privacy", icon: "privacy" as const },
  ];

  return (
    <RoleGate fallback="/admin">
      <div className="mx-auto min-h-screen max-w-3xl pb-20">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <span className="text-sm font-semibold tracking-tight">
            Attendance
          </span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-900"
              aria-label="Log out"
            >
              Log out
            </button>
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 mx-auto flex max-w-3xl border-t border-gray-200 bg-white">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-2 text-[11px] transition-colors ${
                pathname === tab.href
                  ? "font-medium text-gray-900"
                  : "text-gray-400"
              }`}
            >
              <NavIcon name={tab.icon} />
              <span className="truncate">{tab.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </RoleGate>
  );
}

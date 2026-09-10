"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout, clearToken } from "@/lib/api";
import RoleGate from "@/components/RoleGate";
import NavIcon from "@/components/NavIcon";
import ThemeToggle from "@/components/ThemeToggle";
import EmployeeDashboardReturn from "@/components/EmployeeDashboardReturn";
import AppBrand from "@/components/AppBrand";

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
      {(user) => (
        <div className="employee-shell">
          <header className="app-border app-surface sticky top-0 z-40 border-b">
            <div className="employee-header-inner mx-auto flex min-h-[4.5rem] max-w-6xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6">
            <AppBrand className="employee-brand" />
            <div className="employee-header-actions flex shrink-0 items-center gap-2 sm:gap-3">
              <EmployeeDashboardReturn role={user.role} />
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="hidden text-sm font-semibold text-gray-500 hover:text-gray-900 sm:block"
                aria-label="Log out"
              >
                Log out
              </button>
            </div>
            </div>
            <nav className="app-border mx-auto hidden max-w-6xl items-center gap-1 border-t px-4 py-2 md:flex">
              {tabs.map((tab) => <Link key={tab.href} href={tab.href} aria-current={pathname === tab.href ? "page" : undefined} className={`employee-desktop-nav-link flex items-center gap-2 ${pathname === tab.href ? "employee-desktop-nav-link-active" : ""}`}><NavIcon name={tab.icon} />{tab.label}</Link>)}
            </nav>
          </header>

          <main className="employee-content">{children}</main>

          <nav className="app-border app-surface employee-bottom-nav fixed bottom-0 left-0 right-0 z-40 flex border-t md:hidden">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={pathname === tab.href ? "page" : undefined}
                className={`employee-nav-link flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-col ${
                  pathname === tab.href
                    ? "employee-nav-link-active"
                    : ""
                }`}
              >
                <NavIcon name={tab.icon} />
                <span className="truncate">{tab.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </RoleGate>
  );
}

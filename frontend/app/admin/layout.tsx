"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { logout, clearToken } from "@/lib/api";
import RoleGate from "@/components/RoleGate";
import NavIcon from "@/components/NavIcon";
import ThemeToggle from "@/components/ThemeToggle";
import AppBrand from "@/components/AppBrand";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
    { href: "/admin/leave-types", label: "Leave types", icon: "leave" as const },
    { href: "/admin/holidays", label: "Holidays", icon: "calendar" as const },
    { href: "/admin/wfh", label: "WFH requests", icon: "wfh" as const },
    { href: "/admin/settings", label: "Settings", icon: "settings" as const },
    { href: "/admin/live-locations", label: "Live map", icon: "live" as const },
    {
      href: "/admin/attendance",
      label: "Attendance",
      icon: "attendance" as const,
    },
    { href: "/admin/whatsapp", label: "WhatsApp", icon: "whatsapp" as const },
    { href: "/admin/audit", label: "Audit log", icon: "audit" as const },
  ];
  const primaryLinks = links.slice(0, 4);
  const managementLinks = links.slice(4, 12);
  const operationsLinks = links.slice(12);
  const renderLink = (link: (typeof links)[number]) => (
    <Link
      key={link.href}
      href={link.href}
      onClick={() => setMobileMenuOpen(false)}
      aria-current={pathname === link.href ? "page" : undefined}
      className={`admin-nav-link ${pathname === link.href ? "admin-nav-link-active" : ""}`}
    >
      <NavIcon name={link.icon} />
      <span>{link.label}</span>
    </Link>
  );

  return (
    <RoleGate allowed={["hr_admin", "super_admin"]} fallback="/dashboard">
      <div className="app-shell md:grid md:grid-cols-[17rem_minmax(0,1fr)]">
        <header className="app-border app-surface sticky top-0 z-40 border-b px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <AppBrand workspace="admin" />
            <div className="flex items-center gap-2"><ThemeToggle />
              <div className="relative">
                <button type="button" aria-expanded={mobileMenuOpen} aria-controls="admin-mobile-navigation" onClick={() => setMobileMenuOpen((open) => !open)} className="app-secondary-action min-h-11 px-3 text-sm">Menu</button>
                {mobileMenuOpen && (
                <nav id="admin-mobile-navigation" className="app-card absolute right-0 top-12 z-50 grid w-[min(21rem,calc(100vw-2rem))] gap-1 p-2 shadow-xl">
                  {links.map(renderLink)}
                  <button onClick={() => { setMobileMenuOpen(false); handleLogout(); }} className="admin-nav-link mt-1 text-left"><NavIcon name="logout" />Log out</button>
                </nav>
                )}
              </div>
            </div>
          </div>
        </header>
        <aside className="admin-sidebar app-border hidden border-r md:sticky md:top-0 md:flex md:h-screen md:flex-col md:p-4">
          <div className="mb-7 flex items-center justify-between gap-3"><AppBrand workspace="admin" /><ThemeToggle /></div>
          <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
            <div className="grid gap-1">{primaryLinks.map(renderLink)}</div>
            <div><p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[.1em] text-gray-400">Management</p><div className="grid gap-1">{managementLinks.map(renderLink)}</div></div>
            <div><p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[.1em] text-gray-400">Operations</p><div className="grid gap-1">{operationsLinks.map(renderLink)}</div></div>
          </nav>
          <button onClick={handleLogout} className="admin-nav-link mt-4 text-left"><NavIcon name="logout" />Log out</button>
        </aside>
        <main className="app-main min-w-0">{children}</main>
      </div>
    </RoleGate>
  );
}

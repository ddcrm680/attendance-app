'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout, clearToken } from '@/lib/api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // ignore; clear locally regardless
    }
    clearToken();
    router.push('/login');
  }

  const links = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/employees', label: 'Employees' },
    { href: '/admin/offices', label: 'Offices' },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-gray-200 bg-white p-4">
        <p className="mb-6 text-sm font-medium">Attendance admin</p>
        <nav className="space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-lg px-3 py-2 text-sm ${
                pathname === link.href ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout} className="mt-6 text-sm text-gray-400">
          Log out
        </button>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

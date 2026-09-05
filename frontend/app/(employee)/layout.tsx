'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout, clearToken } from '@/lib/api';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // token may already be invalid; clear locally regardless
    }
    clearToken();
    router.push('/login');
  }

  const tabs = [
    { href: '/dashboard', label: 'Home' },
    { href: '/history', label: 'Attendance' },
    { href: '/leave', label: 'Leave' },
    { href: '/privacy', label: 'Privacy' },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-md pb-20">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <span className="text-sm font-medium">Attendance</span>
        <button onClick={handleLogout} className="text-sm text-gray-500">
          Log out
        </button>
      </header>

      <main className="p-4">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 mx-auto flex max-w-md border-t border-gray-200 bg-white">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 py-3 text-center text-sm ${
              pathname === tab.href ? 'font-medium text-gray-900' : 'text-gray-400'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

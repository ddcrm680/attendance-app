'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, setToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!identifier || !password) {
      setError('Enter your email/mobile and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(identifier, password);
      setToken(res.token);
      if (res.employee.role === 'employee') {
        router.push('/dashboard');
      } else {
        router.push('/admin');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-medium">Sign in</h1>
        <p className="mb-6 text-sm text-gray-500">Attendance and live location tracking</p>

        <label className="mb-1 block text-sm text-gray-600">Email or mobile</label>
        <input
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="you@company.com"
        />

        <label className="mb-1 block text-sm text-gray-600">Password</label>
        <input
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="********"
        />

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

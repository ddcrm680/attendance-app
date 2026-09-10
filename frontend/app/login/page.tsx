"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, setToken } from "@/lib/api";
import AppBrand from "@/components/AppBrand";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!identifier || !password) {
      setError("Enter your email/mobile and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await login(identifier, password);
      setToken(res.token);
      if (res.employee.role === "employee") {
        router.push("/dashboard");
      } else {
        router.push("/admin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,var(--accent-soft),transparent_45%)] px-4 py-8">
      <form
        onSubmit={handleSubmit}
        className="app-card w-full max-w-md p-5 sm:p-7"
      >
        <AppBrand variant="login" className="mb-6" />
        <h1 className="mb-1 text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="mb-6 text-sm text-gray-500">
          Attendance and live location tracking
        </p>

        <label className="mb-1 block text-sm text-gray-600">
          Email or mobile
        </label>
        <input
          className="app-form-control mb-4"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="you@company.com"
        />

        <label className="mb-1 block text-sm text-gray-600">Password</label>
        <input
          className="app-form-control mb-4"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="********"
        />

        {error && <p className="app-feedback app-feedback-error mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="app-primary-action w-full disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

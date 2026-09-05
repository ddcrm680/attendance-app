"use client";

import { useEffect, useState } from "react";
import { me, type Employee } from "@/lib/api";
import { useRouter } from "next/navigation";

type Props = {
  allowed?: Employee["role"][];
  fallback: string;
  children: React.ReactNode;
};

/** Client route hygiene only; every API still enforces Sanctum/RBAC. */
export default function RoleGate({ allowed, fallback, children }: Props) {
  const router = useRouter();
  const [user, setUser] = useState<Employee | null>(null);
  const allowedKey = allowed?.join("|");

  useEffect(() => {
    let mounted = true;
    me()
      .then((employee) => {
        if (!mounted) return;
        if (allowed && !allowed.includes(employee.role)) {
          router.replace(fallback);
          return;
        }
        setUser(employee);
      })
      .catch(() => router.replace("/login"));
    return () => {
      mounted = false;
    };
  }, [allowedKey, fallback, router]);

  if (!user)
    return (
      <main className="p-6 text-sm text-gray-500" role="status">
        Loading account…
      </main>
    );
  return <>{children}</>;
}

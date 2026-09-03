'use client';

import { useEffect, useState } from 'react';
import { adminEmployees, type Employee } from '@/lib/api';

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminEmployees()
      .then((res) => setEmployees(res.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load employees'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-lg font-medium">Employees</h1>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Office</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2">{emp.name}</td>
                  <td className="px-4 py-2 text-gray-500">{emp.employee_code}</td>
                  <td className="px-4 py-2 text-gray-500">{emp.department?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{emp.office?.name ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{emp.status}</td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    No employees yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

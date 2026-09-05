"use client";
import { useCallback, useEffect, useState } from "react";
import { adminLeaves, reviewLeave, type AdminLeaveRequest } from "@/lib/api";
import { formatDate, formatStatus } from "@/lib/presentation";

export default function AdminLeavePage() {
  const [items, setItems] = useState<AdminLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminLeaves({ per_page: 50 })
      .then((r) => setItems(r.data))
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Unable to load leave requests.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function review(id: number, status: "approved" | "rejected") {
    try {
      await reviewLeave(id, status);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to review request.");
    }
  }
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-lg font-medium">Leave management</h1>
        <p className="text-sm text-gray-600">
          Review requests within your administrative scope.
        </p>
      </div>
      {error && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
          {error}{" "}
          <button className="underline" onClick={load}>
            Retry
          </button>
        </p>
      )}
      {loading ? (
        <p role="status" className="text-sm text-gray-500">
          Loading leave requests…
        </p>
      ) : (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3">Employee</th>
                <th className="p-3">Type</th>
                <th className="p-3">Dates</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">
                    {item.employee?.name} ({item.employee?.employee_code})
                  </td>
                  <td className="p-3">{item.leave_type?.name}</td>
                  <td className="p-3">
                    {formatDate(item.start_date)} – {formatDate(item.end_date)}
                  </td>
                  <td className="p-3">{formatStatus(item.status)}</td>
                  <td className="p-3">
                    {item.status === "pending" && (
                      <>
                        <button
                          className="mr-3 underline"
                          onClick={() => review(item.id, "approved")}
                        >
                          Approve
                        </button>
                        <button
                          className="text-red-700 underline"
                          onClick={() => review(item.id, "rejected")}
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}{" "}
            </tbody>
          </table>
          {!items.length && (
            <p className="p-4 text-sm text-gray-500">No leave requests.</p>
          )}
        </div>
      )}
    </section>
  );
}

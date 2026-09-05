"use client";
import { useCallback, useEffect, useState } from "react";
import {
  adminWfhRequests,
  reviewWfhRequest,
  type AdminWfhRequest,
} from "@/lib/api";
import { formatDate, formatStatus } from "@/lib/presentation";

export default function AdminWfhPage() {
  const [items, setItems] = useState<AdminWfhRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminWfhRequests({ per_page: 50 })
      .then((r) => setItems(r.data))
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Unable to load WFH requests.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function review(id: number, status: "approved" | "rejected") {
    try {
      await reviewWfhRequest(id, status);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to review request.");
    }
  }
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-lg font-medium">WFH requests</h1>
        <p className="text-sm text-gray-600">
          Review employee work-from-home requests.
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
          Loading WFH requests…
        </p>
      ) : (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3">Employee</th>
                <th className="p-3">Date</th>
                <th className="p-3">Reason</th>
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
                  <td className="p-3">{formatDate(item.attendance_date)}</td>
                  <td className="p-3">{item.reason || "—"}</td>
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
              ))}
            </tbody>
          </table>
          {!items.length && (
            <p className="p-4 text-sm text-gray-500">No WFH requests.</p>
          )}
        </div>
      )}
    </section>
  );
}

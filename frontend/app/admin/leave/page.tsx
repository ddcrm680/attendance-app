"use client";
import { useCallback, useEffect, useState } from "react";
import { adminLeaves, adminLeaveTypes, reviewLeave, type AdminLeaveRequest, type AdminLeaveType } from "@/lib/api";
import { formatDate } from "@/lib/presentation";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import PaginationControls from "@/components/PaginationControls";

export default function AdminLeavePage() {
  const [items, setItems] = useState<AdminLeaveRequest[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState(""); const [leaveTypeFilter, setLeaveTypeFilter] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [types, setTypes] = useState<AdminLeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminLeaves({ page, per_page: 25, search, status: statusFilter, leave_type_id: leaveTypeFilter, from, to })
      .then((r) => { setItems(r.data); setLastPage(r.last_page); })
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Unable to load leave requests.",
        ),
      )
      .finally(() => setLoading(false));
  }, [page, search, statusFilter, leaveTypeFilter, from, to]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => { adminLeaveTypes().then(setTypes).catch(() => {}); }, []);
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
      <PageHeader
        title="Leave management"
        description="Review requests within your administrative scope."
        descriptionClassName="text-gray-600"
      />
      <div className="app-card grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-6"><input className="app-form-control lg:col-span-2" placeholder="Search employee" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><select className="app-form-select" value={leaveTypeFilter} onChange={(event) => { setLeaveTypeFilter(event.target.value); setPage(1); }}><option value="">All leave types</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select><select className="app-form-select" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option></select><input className="app-form-control" type="date" aria-label="From date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /><div className="flex gap-2"><input className="app-form-control" type="date" aria-label="To date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} /><button type="button" className="app-secondary-action" onClick={() => { setSearch(""); setStatusFilter(""); setLeaveTypeFilter(""); setFrom(""); setTo(""); setPage(1); }}>Clear</button></div></div>
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
                  <td className="p-3">
                    <StatusBadge status={item.status} />
                  </td>
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
      <PaginationControls page={page} lastPage={lastPage} loading={loading} onPageChange={setPage} label="Leave request pages" />
    </section>
  );
}

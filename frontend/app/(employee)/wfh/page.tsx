"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  createWfhRequest,
  me,
  myWfhRequests,
  type Employee,
  type WfhRequest,
} from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import PaginationControls from "@/components/PaginationControls";

function localDateInputValue(date = new Date()): string {
  const parts = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export default function WfhPage() {
  const [user, setUser] = useState<Employee | null>(null);
  const [requests, setRequests] = useState<WfhRequest[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setFieldErrors(null);
    Promise.all([me(), myWfhRequests({ page })])
      .then(([employee, response]) => {
        setUser(employee);
        setRequests(response.data);
        setLastPage(response.last_page);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load WFH status."),
      )
      .finally(() => setLoading(false));
  }, [page]);
  useEffect(() => {
    load();
  }, [load]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setFieldErrors(null);
    try {
      await createWfhRequest({
        attendance_date: date,
        reason: reason || undefined,
      });
      setMessage("WFH request submitted.");
      setDate("");
      setReason("");
      load();
    } catch (e) {
      if (e instanceof ApiError) setFieldErrors(e.fieldErrors ?? null);
      setError(
        e instanceof Error ? e.message : "Unable to submit WFH request.",
      );
    }
  }
  if (loading)
    return (
      <p className="text-sm text-gray-500" role="status">
        Loading WFH status…
      </p>
    );
  return (
    <section className="space-y-4">
      <PageHeader
        title="Work from home"
        description="Eligibility and approval are decided by the server."
      />
      {!user?.wfh_eligible ? (
        <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          WFH is not enabled for your account. Contact HR if your work
          arrangement changes.
        </p>
      ) : (
        <form
          onSubmit={submit}
          className="app-card space-y-3 p-4"
        >
          <label className="block text-sm">
            Requested date
            <input
              required
              type="date"
              min={localDateInputValue()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            />
            {fieldErrors?.attendance_date?.[0] && (
              <span className="mt-1 block text-xs text-red-700">
                {fieldErrors.attendance_date[0]}
              </span>
            )}
          </label>
          <label className="block text-sm">
            Reason (optional)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            />
            {fieldErrors?.reason?.[0] && (
              <span className="mt-1 block text-xs text-red-700">
                {fieldErrors.reason[0]}
              </span>
            )}
          </label>
          <button className="app-primary-action w-full rounded py-2 text-sm">
            Request WFH
          </button>
        </form>
      )}
      {message && (
        <p role="status" className="text-sm text-green-700">
          {message}
        </p>
      )}
      {error && (
        <div role="alert" className="text-sm text-red-700">
          {error}{" "}
          <button className="underline" onClick={load}>
            Retry
          </button>
        </div>
      )}
      <div>
        <h2 className="mb-2 text-sm font-medium">Your requests</h2>
        {requests.length ? (
          <div className="space-y-2">
            {requests.map((request) => (
              <div key={request.id} className="rounded border p-3 text-sm">
                <p className="flex items-center gap-1 font-medium">
                  <span>{request.attendance_date.slice(0, 10)} ·</span>
                  <StatusBadge status={request.status} />
                </p>
                {request.reason && (
                  <p className="text-gray-500">{request.reason}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded border border-dashed p-4 text-sm text-gray-500">
            No WFH requests yet.
          </p>
        )}
      </div>
      <PaginationControls page={page} lastPage={lastPage} loading={loading} onPageChange={setPage} label="WFH request history pages" />
    </section>
  );
}

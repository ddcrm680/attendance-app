"use client";
import { useCallback, useEffect, useState } from "react";
import {
  cancelLeave,
  createLeave,
  leaveTypes,
  myLeaves,
  type LeaveRequest,
  type LeaveType,
} from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import PaginationControls from "@/components/PaginationControls";

type Feedback = { tone: "success" | "error"; text: string };

export default function LeavePage() {
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [type, setType] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([leaveTypes(), myLeaves({ page })])
      .then(([t, l]) => {
        setTypes(t);
        setLeaves(l.data);
        setLastPage(l.last_page);
        if (t[0]) setType((v) => v || String(t[0].id));
      })
      .catch(() =>
        setFeedback({ tone: "error", text: "Unable to load leave information." }),
      ).finally(() => setLoading(false));
  }, [page]);
  useEffect(() => {
    load();
  }, [load]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    try {
      await createLeave({
        leave_type_id: Number(type),
        start_date: start,
        end_date: end,
        reason: reason || undefined,
      });
      setFeedback({ tone: "success", text: "Leave request submitted." });
      setStart("");
      setEnd("");
      setReason("");
      load();
    } catch (e) {
      setFeedback({
        tone: "error",
        text: e instanceof Error ? e.message : "Unable to submit leave.",
      });
    }
  }
  return (
    <div className="app-page">
      <PageHeader
        title="Leave"
        description="Submit and track your leave requests."
      />
      <form
        onSubmit={submit}
        className="app-card space-y-3 p-4 sm:p-5"
      >
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="app-form-select"
        >
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          required
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="app-form-control"
        />
        <input
          required
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="app-form-control"
        />
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (if applicable)"
          className="app-form-control min-h-28"
        />
        <button className="app-primary-action w-full">
          Submit request
        </button>
      </form>
      {feedback && (
        <p
          role={feedback.tone === "error" ? "alert" : "status"}
          className={`text-sm ${
            feedback.tone === "error" ? "text-red-700" : "text-green-700"
          }`}
        >
          {feedback.text}
        </p>
      )}
      <div className="space-y-2">
        {loading && <p role="status" className="text-sm text-gray-500">Loading leave requests…</p>}
        {leaves.map((l) => (
          <div key={l.id} className="app-card p-3 text-sm sm:p-4">
            <p className="flex items-center gap-1 font-medium">
              <span>{l.leave_type?.name} ·</span>
              <StatusBadge status={l.status} />
            </p>
            <p className="text-gray-500">
              {l.start_date.slice(0, 10)} to {l.end_date.slice(0, 10)}
            </p>
            {l.status === "pending" && (
              <button
                onClick={() =>
                  cancelLeave(l.id)
                    .then(load)
                    .catch((e) =>
                      setFeedback({
                        tone: "error",
                        text:
                          e instanceof Error
                            ? e.message
                            : "Unable to cancel leave.",
                      }),
                    )
                }
                className="mt-2 text-xs underline"
              >
                Cancel
              </button>
            )}
          </div>
        ))}
        {!leaves.length && (
          <p className="text-sm text-gray-500">No leave requests yet.</p>
        )}
      </div>
      <PaginationControls page={page} lastPage={lastPage} loading={loading} onPageChange={setPage} label="Leave history pages" />
    </div>
  );
}

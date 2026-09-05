"use client";
import { useEffect, useState } from "react";
import {
  cancelLeave,
  createLeave,
  leaveTypes,
  myLeaves,
  type LeaveRequest,
  type LeaveType,
} from "@/lib/api";
export default function LeavePage() {
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const load = () =>
    Promise.all([leaveTypes(), myLeaves()])
      .then(([t, l]) => {
        setTypes(t);
        setLeaves(l.data);
        if (t[0]) setType((v) => v || String(t[0].id));
      })
      .catch(() => setMessage("Unable to load leave information."));
  useEffect(() => {
    load();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createLeave({
        leave_type_id: Number(type),
        start_date: start,
        end_date: end,
        reason: reason || undefined,
      });
      setMessage("Leave request submitted.");
      setStart("");
      setEnd("");
      setReason("");
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to submit leave.");
    }
  }
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-medium">Leave</h1>
        <p className="text-sm text-gray-500">
          Submit and track your leave requests.
        </p>
      </div>
      <form
        onSubmit={submit}
        className="space-y-3 rounded-xl border bg-white p-4"
      >
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded border p-2"
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
          className="w-full rounded border p-2"
        />
        <input
          required
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="w-full rounded border p-2"
        />
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (if applicable)"
          className="w-full rounded border p-2"
        />
        <button className="w-full rounded bg-gray-900 py-2 text-white">
          Submit request
        </button>
      </form>
      {message && <p className="text-sm text-gray-600">{message}</p>}
      <div className="space-y-2">
        {leaves.map((l) => (
          <div key={l.id} className="rounded-xl border p-3 text-sm">
            <p className="font-medium">
              {l.leave_type?.name} · {l.status}
            </p>
            <p className="text-gray-500">
              {l.start_date.slice(0, 10)} to {l.end_date.slice(0, 10)}
            </p>
            {l.status === "pending" && (
              <button
                onClick={() =>
                  cancelLeave(l.id)
                    .then(load)
                    .catch((e) => setMessage(e.message))
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
    </div>
  );
}

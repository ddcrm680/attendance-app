"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createWfhRequest,
  me,
  myWfhRequests,
  type Employee,
  type WfhRequest,
} from "@/lib/api";

export default function WfhPage() {
  const [user, setUser] = useState<Employee | null>(null);
  const [requests, setRequests] = useState<WfhRequest[]>([]);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([me(), myWfhRequests()])
      .then(([employee, response]) => {
        setUser(employee);
        setRequests(response.data);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load WFH status."),
      )
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
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
      <div>
        <h1 className="text-lg font-medium">Work from home</h1>
        <p className="text-sm text-gray-500">
          Eligibility and approval are decided by the server.
        </p>
      </div>
      {!user?.wfh_eligible ? (
        <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          WFH is not enabled for your account. Contact HR if your work
          arrangement changes.
        </p>
      ) : (
        <form
          onSubmit={submit}
          className="space-y-3 rounded-xl border bg-white p-4"
        >
          <label className="block text-sm">
            Requested date
            <input
              required
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <label className="block text-sm">
            Reason (optional)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <button className="w-full rounded bg-gray-900 py-2 text-sm text-white">
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
                <p className="font-medium">
                  {request.attendance_date.slice(0, 10)} · {request.status}
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
    </section>
  );
}

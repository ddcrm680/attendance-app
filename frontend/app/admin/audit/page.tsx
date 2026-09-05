"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminAuditLog,
  adminAuditLogs,
  adminEmployees,
  type AuditLog,
  type Employee,
} from "@/lib/api";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminAuditLogs({
      from,
      to,
      actor_id: actor,
      action,
      resource_type: resourceType,
      page,
      per_page: 25,
    })
      .then((r) => {
        setLogs(r.data);
        setLastPage(r.last_page);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [from, to, actor, action, resourceType, page]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    adminEmployees({ per_page: 100 })
      .then((r) => setEmployees(r.data))
      .catch(() => undefined);
  }, []);
  async function detail(id: number) {
    try {
      setSelected(await adminAuditLog(id));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load event details.",
      );
    }
  }
  const update = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-lg font-medium">Audit log</h1>
        <p className="text-sm text-gray-600">
          Security-sensitive administrative actions. Records are append-only.
        </p>
      </div>
      <div className="grid gap-2 rounded border bg-gray-50 p-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-sm">
          From
          <input
            className="mt-1 w-full rounded border p-2"
            type="date"
            value={from}
            onChange={(e) => update(setFrom, e.target.value)}
          />
        </label>
        <label className="text-sm">
          To
          <input
            className="mt-1 w-full rounded border p-2"
            type="date"
            value={to}
            onChange={(e) => update(setTo, e.target.value)}
          />
        </label>
        <label className="text-sm">
          Actor
          <select
            className="mt-1 w-full rounded border p-2"
            value={actor}
            onChange={(e) => update(setActor, e.target.value)}
          >
            <option value="">All actors</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Action
          <input
            className="mt-1 w-full rounded border p-2"
            placeholder="employee.updated"
            value={action}
            onChange={(e) => update(setAction, e.target.value)}
          />
        </label>
        <label className="text-sm">
          Resource
          <input
            className="mt-1 w-full rounded border p-2"
            placeholder="Employee"
            value={resourceType}
            onChange={(e) => update(setResourceType, e.target.value)}
          />
        </label>
        <button
          className="self-end rounded border px-3 py-2 text-sm"
          onClick={() => {
            setFrom("");
            setTo("");
            setActor("");
            setAction("");
            setResourceType("");
            setPage(1);
          }}
        >
          Reset
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
          {error}{" "}
          <button className="underline" onClick={load}>
            Retry
          </button>
        </p>
      )}
      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full min-w-[650px] text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Action</th>
              <th className="p-3">Resource</th>
              <th className="p-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t">
                <td className="p-3">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="p-3">{log.actor?.name ?? "System"}</td>
                <td className="p-3">{log.action}</td>
                <td className="p-3">
                  {log.resource_type}
                  {log.resource_id ? ` #${log.resource_id}` : ""}
                </td>
                <td className="p-3">
                  <button className="underline" onClick={() => detail(log.id)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <p className="p-4 text-sm text-gray-500">Loading audit events…</p>
        )}
        {!loading && !logs.length && (
          <p className="p-4 text-sm text-gray-500">
            No audit events match these filters.
          </p>
        )}
      </div>
      <div className="flex justify-between">
        <button
          disabled={loading || page === 1}
          className="rounded border px-3 py-2 text-sm disabled:opacity-50"
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <span className="text-sm">
          Page {page} of {lastPage}
        </span>
        <button
          disabled={loading || page >= lastPage}
          className="rounded border px-3 py-2 text-sm disabled:opacity-50"
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
      {selected && (
        <div className="rounded border bg-white p-4 text-sm">
          <div className="flex justify-between">
            <h2 className="font-medium">{selected.action}</h2>
            <button className="underline" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <p className="mt-2">
            {selected.resource_type}
            {selected.resource_id ? ` #${selected.resource_id}` : ""}
          </p>
          <pre className="mt-3 overflow-auto rounded bg-gray-50 p-3 text-xs">
            {JSON.stringify(selected.metadata ?? {}, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}

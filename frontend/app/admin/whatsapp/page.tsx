"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminWhatsAppLogs,
  adminWhatsAppSettings,
  me,
  triggerDailyWhatsAppSummary,
  type Employee,
  type WhatsAppLog,
  type WhatsAppSettings,
} from "@/lib/api";
import PageHeader from "@/components/PageHeader";

const FAILURE_PREVIEW_LENGTH = 180;

function failurePreview(reason: string, expanded: boolean): string {
  if (expanded || reason.length <= FAILURE_PREVIEW_LENGTH) return reason;

  return `${reason.slice(0, FAILURE_PREVIEW_LENGTH).trimEnd()}…`;
}

export default function WhatsAppAdminPage() {
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [expandedFailureIds, setExpandedFailureIds] = useState<Set<number>>(
    new Set(),
  );

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      adminWhatsAppSettings(),
      adminWhatsAppLogs({ per_page: 25 }),
      me(),
    ])
      .then(([nextSettings, nextLogs, employee]) => {
        setSettings(nextSettings);
        setLogs(nextLogs.data);
        setCurrentUser(employee);
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function queueReport() {
    setNotice(null);
    setError(null);
    try {
      const result = await triggerDailyWhatsAppSummary();
      setNotice(result.message);
      load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not queue the summary.",
      );
    }
  }

  function toggleFailure(logId: number) {
    setExpandedFailureIds((current) => {
      const next = new Set(current);
      next.has(logId) ? next.delete(logId) : next.add(logId);
      return next;
    });
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="WhatsApp delivery"
        description="Credentials remain server-side. Delivery is queued and recorded here."
        descriptionClassName="text-gray-600"
      />
      {error && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}{" "}
          <button className="underline" onClick={load}>
            Retry
          </button>
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {notice}
        </p>
      )}
      {settings && (
        <div className="app-card grid max-w-3xl gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-2">
          <p>
            <b>Provider:</b> {settings.provider}
          </p>
          <p>
            <b>Delivery:</b> {settings.enabled ? "Enabled" : "Disabled"}
          </p>
          <p>
            <b>Attendance recipient:</b>{" "}
            {settings.attendance_recipient_configured
              ? "Configured"
              : "Not configured"}
          </p>
          <p>
            <b>Daily recipient:</b>{" "}
            {settings.daily_report_recipient_configured
              ? "Configured"
              : "Not configured"}
          </p>
          <p>
            <b>Rate limit:</b> {settings.rate_per_minute}/minute
          </p>
          <p>
            <b>Events:</b> Punch in · Punch out · Late · Daily summary
          </p>
        </div>
      )}
      <div className="app-border flex flex-col gap-2 sm:w-fit sm:flex-row sm:rounded-lg sm:border sm:p-1">
        {currentUser?.role === "super_admin" && (
          <button
            type="button"
            onClick={queueReport}
            disabled={!settings?.enabled}
            className="app-primary-action min-h-10 rounded px-3 py-2 text-sm disabled:opacity-50"
          >
            Queue daily summary
          </button>
        )}
        <button
          type="button"
          onClick={load}
          className="app-secondary-action min-h-10 rounded px-3 py-2 text-sm"
        >
          Refresh
        </button>
      </div>
      <div className="space-y-2 lg:hidden">
        {logs.map((log) => {
          const failureReason =
            log.status === "failed" ? log.error_message?.trim() : null;
          const isFailureExpanded = expandedFailureIds.has(log.id);
          const canExpandFailure =
            (failureReason?.length ?? 0) > FAILURE_PREVIEW_LENGTH;

          return (
            <article key={log.id} className="app-card p-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium capitalize">
                    {log.notification_type.replace("_", " ")}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {log.attendance?.employee?.name ?? "Daily summary"}
                  </p>
                </div>
                <span className="shrink-0 capitalize text-gray-700">
                  {log.status}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-gray-500">Attempts</dt>
                  <dd className="mt-0.5">{log.attempts}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Created</dt>
                  <dd className="mt-0.5">
                    {new Date(log.created_at).toLocaleString()}
                  </dd>
                </div>
                {log.provider_message_id && (
                  <div className="col-span-2">
                    <dt className="text-xs text-gray-500">Provider ID</dt>
                    <dd className="mt-0.5 break-all font-mono text-xs text-gray-600">
                      {log.provider_message_id}
                    </dd>
                  </div>
                )}
              </dl>
              {failureReason && (
                <p className="mt-3 break-words rounded bg-red-50 p-2 text-xs text-red-700">
                  <span className="font-medium">Failure reason: </span>
                  <span className="whitespace-pre-wrap">
                    {failurePreview(failureReason, isFailureExpanded)}
                  </span>
                  {canExpandFailure && (
                    <button
                      type="button"
                      aria-expanded={isFailureExpanded}
                      className="ml-1 font-medium underline"
                      onClick={() => toggleFailure(log.id)}
                    >
                      {isFailureExpanded ? "Show less" : "Read more"}
                    </button>
                  )}
                </p>
              )}
            </article>
          );
        })}
      </div>
      <div className="app-card hidden overflow-hidden lg:block">
        <div className="app-border flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-medium">Delivery records</h2>
          <p className="text-xs text-gray-500">Most recent first</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="p-3">Event</th>
              <th className="p-3">Attendance</th>
              <th className="p-3">Status</th>
              <th className="p-3">Attempts</th>
              <th className="p-3">Provider ID</th>
              <th className="p-3">Message</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const failureReason =
                log.status === "failed" ? log.error_message?.trim() : null;
              const isFailureExpanded = expandedFailureIds.has(log.id);
              const canExpandFailure =
                (failureReason?.length ?? 0) > FAILURE_PREVIEW_LENGTH;

              return (
                  <tr key={log.id} className="border-t">
                    <td className="whitespace-nowrap p-3 capitalize">
                      {log.notification_type.replace("_", " ")}
                    </td>
                    <td className="p-3">
                      {log.attendance?.employee?.name ?? "Daily summary"}
                    </td>
                    <td className="whitespace-nowrap p-3 capitalize text-gray-700">{log.status}</td>
                    <td className="whitespace-nowrap p-3">{log.attempts}</td>
                    <td className="w-56 max-w-[14rem] truncate p-3 font-mono text-xs text-gray-600" title={log.provider_message_id ?? undefined}>
                      {log.provider_message_id ?? "—"}
                    </td>
                    <td className="w-[22rem] max-w-[22rem] break-words p-3 align-top text-xs text-gray-600">
                      {failureReason ? (
                        <>
                          <span className="whitespace-pre-wrap">
                            {failurePreview(failureReason, isFailureExpanded)}
                          </span>
                          {canExpandFailure && (
                            <button
                              type="button"
                              aria-expanded={isFailureExpanded}
                              className="ml-1 font-medium text-red-700 underline"
                              onClick={() => toggleFailure(log.id)}
                            >
                              {isFailureExpanded ? "Read less" : "Read more"}
                            </button>
                          )}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap p-3 text-xs text-gray-600">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      </div>
      {!loading && !logs.length && (
        <p className="app-card p-4 text-sm text-gray-500">
          No WhatsApp delivery logs yet.
        </p>
      )}
      {loading && (
        <p className="app-card p-4 text-sm text-gray-500">
          Loading delivery logs…
        </p>
      )}
    </section>
  );
}

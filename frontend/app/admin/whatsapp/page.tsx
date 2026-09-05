'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminWhatsAppLogs, adminWhatsAppSettings, triggerDailyWhatsAppSummary, type WhatsAppLog, type WhatsAppSettings } from '@/lib/api';

export default function WhatsAppAdminPage() {
  const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    Promise.all([adminWhatsAppSettings(), adminWhatsAppLogs({ per_page: 25 })])
      .then(([nextSettings, nextLogs]) => { setSettings(nextSettings); setLogs(nextLogs.data); })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function queueReport() {
    setNotice(null); setError(null);
    try { const result = await triggerDailyWhatsAppSummary(); setNotice(result.message); load(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Could not queue the summary.'); }
  }

  return <section className="space-y-5">
    <div><h1 className="text-lg font-medium">WhatsApp delivery</h1><p className="text-sm text-gray-600">Credentials remain server-side. Delivery is queued and recorded here.</p></div>
    {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error} <button className="underline" onClick={load}>Retry</button></p>}
    {notice && <p role="status" className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
    {settings && <div className="grid gap-3 rounded border bg-white p-4 text-sm sm:grid-cols-2"><p><b>Provider:</b> {settings.provider}</p><p><b>Delivery:</b> {settings.enabled ? 'Enabled' : 'Disabled'}</p><p><b>Attendance recipient:</b> {settings.attendance_recipient_configured ? 'Configured' : 'Not configured'}</p><p><b>Daily recipient:</b> {settings.daily_report_recipient_configured ? 'Configured' : 'Not configured'}</p><p><b>Rate limit:</b> {settings.rate_per_minute}/minute</p><p><b>Events:</b> {Object.entries(settings.attendance_notifications).filter(([, enabled]) => enabled).map(([type]) => type.replace('_', ' ')).join(', ') || 'None'}</p></div>}
    <div className="flex gap-2"><button type="button" onClick={queueReport} disabled={!settings?.enabled} className="rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50">Queue daily summary</button><button type="button" onClick={load} className="rounded border px-3 py-2 text-sm">Refresh</button></div>
    <div className="overflow-x-auto rounded border bg-white"><table className="w-full min-w-[680px] text-sm"><thead className="bg-gray-50 text-left"><tr><th className="p-3">Event</th><th className="p-3">Attendance</th><th className="p-3">Status</th><th className="p-3">Attempts</th><th className="p-3">Provider ID</th><th className="p-3">Created</th></tr></thead><tbody>{logs.map(log=><tr className="border-t" key={log.id}><td className="p-3 capitalize">{log.notification_type.replace('_',' ')}</td><td className="p-3">{log.attendance?.employee?.name ?? 'Daily summary'}</td><td className="p-3 capitalize">{log.status}</td><td className="p-3">{log.attempts}</td><td className="p-3">{log.provider_message_id ?? '—'}</td><td className="p-3">{new Date(log.created_at).toLocaleString()}</td></tr>)}</tbody></table>{!loading && !logs.length && <p className="p-4 text-sm text-gray-500">No WhatsApp delivery logs yet.</p>}{loading && <p className="p-4 text-sm text-gray-500">Loading delivery logs…</p>}</div>
  </section>;
}

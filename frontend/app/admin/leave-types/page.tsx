"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminLeaveTypes,
  createAdminLeaveType,
  updateAdminLeaveType,
  type AdminLeaveType,
} from "@/lib/api";
import PageHeader from "@/components/PageHeader";

export default function AdminLeaveTypesPage() {
  const [types, setTypes] = useState<AdminLeaveType[]>([]);
  const [editing, setEditing] = useState<AdminLeaveType | null>(null);
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [reasonRequired, setReasonRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminLeaveTypes()
      .then(setTypes)
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load leave types."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function reset() {
    setEditing(null);
    setName("");
    setActive(true);
    setReasonRequired(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { name: name.trim(), active, reason_required: reasonRequired };
      if (editing) await updateAdminLeaveType(editing.id, payload);
      else await createAdminLeaveType(payload);
      reset();
      load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save leave type.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Leave types" description="Manage the leave types available to employees." />
      {error && <p role="alert" className="app-feedback app-feedback-error">{error}</p>}
      {loading ? <p role="status" className="text-sm text-gray-500">Loading leave types…</p> : (
        <div className="space-y-2">
          {types.map((type) => <article key={type.id} className="app-card flex items-center justify-between gap-3 p-3 text-sm"><div><p className="font-medium">{type.name}</p><p className="text-xs text-gray-500">{type.active ? "Active" : "Inactive"} · {type.reason_required ? "Reason required" : "Reason optional"}</p></div><button type="button" className="app-secondary-action min-h-10 rounded px-3 text-sm" onClick={() => { setEditing(type); setName(type.name); setActive(type.active); setReasonRequired(type.reason_required); }}>Edit</button></article>)}
          {!types.length && <p className="app-empty-state text-sm">No leave types yet.</p>}
        </div>
      )}
      <form onSubmit={submit} className="app-card max-w-xl space-y-3 p-4">
        <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-medium">{editing ? `Edit ${editing.name}` : "Add leave type"}</h2>{editing && <button type="button" className="text-sm underline" onClick={reset}>Cancel</button>}</div>
        <label className="block text-sm">Name<input required value={name} onChange={(event) => setName(event.target.value)} className="app-form-control mt-1" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Active</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reasonRequired} onChange={(event) => setReasonRequired(event.target.checked)} /> Require a reason</label>
        <button type="submit" disabled={saving} className="app-primary-action min-h-10 w-full rounded px-4 text-sm font-medium disabled:opacity-50">{saving ? "Saving…" : editing ? "Save leave type" : "Add leave type"}</button>
      </form>
    </section>
  );
}

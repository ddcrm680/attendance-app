"use client";
import { useCallback, useEffect, useState } from "react";
import {
  adminHolidays,
  createHoliday,
  deleteHoliday,
  updateHoliday,
  type Holiday,
} from "@/lib/api";
import PageHeader from "@/components/PageHeader";

export default function AdminHolidaysPage() {
  const [items, setItems] = useState<Holiday[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [active, setActive] = useState(true);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminHolidays()
      .then(setItems)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load holidays."),
      )
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) await updateHoliday(editing.id, { name, holiday_date: date, active });
      else await createHoliday({ name, holiday_date: date, active });
      resetForm();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create holiday.");
    }
  }
  function resetForm() {
    setEditing(null);
    setName("");
    setDate("");
    setActive(true);
  }
  async function remove(id: number) {
    try {
      await deleteHoliday(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove holiday.");
    }
  }
  return (
    <section className="space-y-5">
      <PageHeader
        title="Holidays"
        description="Manage database-backed non-working dates."
        descriptionClassName="text-gray-600"
      />
      {error && (
        <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">
          {error}{" "}
          <button className="underline" onClick={load}>
            Retry
          </button>
        </p>
      )}
      <form
        onSubmit={submit}
        className="grid gap-2 rounded border bg-gray-50 p-3 sm:grid-cols-[1fr_180px_auto]"
      >
        <input
          required
          placeholder="Holiday name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border p-2 text-sm"
        />
        <input
          required
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border p-2 text-sm"
        />
        <button className="app-primary-action rounded px-3 py-2 text-sm">
          {editing ? "Save holiday" : "Add holiday"}
        </button>
        {editing && <button type="button" className="app-secondary-action rounded px-3 py-2 text-sm" onClick={resetForm}>Cancel</button>}
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Active</label>
      </form>
      {loading ? (
        <p role="status" className="text-sm text-gray-500">
          Loading holidays…
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded border bg-white p-3 text-sm"
            >
              <span>
                <b>{item.name}</b> · {item.holiday_date.slice(0, 10)}{" "}
                {item.active ? "" : "(inactive)"}
              </span>
              <button
                type="button"
                className="mr-3 underline"
                onClick={() => { setEditing(item); setName(item.name); setDate(item.holiday_date.slice(0, 10)); setActive(item.active); }}
              >
                Edit
              </button>
              <button
                type="button"
                className="text-red-700 underline"
                onClick={() => remove(item.id)}
              >
                Remove
              </button>
            </div>
          ))}
          {!items.length && (
            <p className="rounded border border-dashed p-4 text-sm text-gray-500">
              No holidays.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

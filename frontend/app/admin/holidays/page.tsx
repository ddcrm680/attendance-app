"use client";
import { useCallback, useEffect, useState } from "react";
import {
  adminHolidays,
  createHoliday,
  deleteHoliday,
  type Holiday,
} from "@/lib/api";

export default function AdminHolidaysPage() {
  const [items, setItems] = useState<Holiday[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
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
      await createHoliday({ name, holiday_date: date });
      setName("");
      setDate("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create holiday.");
    }
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
      <div>
        <h1 className="text-lg font-medium">Holidays</h1>
        <p className="text-sm text-gray-600">
          Manage database-backed non-working dates.
        </p>
      </div>
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
        <button className="rounded bg-gray-900 px-3 py-2 text-sm text-white">
          Add holiday
        </button>
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

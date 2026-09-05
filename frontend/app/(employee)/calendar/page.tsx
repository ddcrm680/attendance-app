"use client";

import { useCallback, useEffect, useState } from "react";
import { calendarOverview, type CalendarOverview } from "@/lib/api";

export default function CalendarPage() {
  const [calendar, setCalendar] = useState<CalendarOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null);
    calendarOverview()
      .then(setCalendar)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load calendar."),
      );
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  if (error)
    return (
      <div role="alert" className="space-y-2 text-sm text-red-700">
        {error}
        <button className="block underline" onClick={load}>
          Retry
        </button>
      </div>
    );
  if (!calendar)
    return (
      <p className="text-sm text-gray-500" role="status">
        Loading calendar…
      </p>
    );
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-lg font-medium">Work calendar</h1>
        <p className="text-sm text-gray-500">
          Today&apos;s authoritative attendance eligibility and upcoming
          holidays.
        </p>
      </div>
      <div className="rounded-xl border bg-white p-4">
        <p className="text-sm text-gray-500">{calendar.date}</p>
        <p className="mt-1 text-lg font-medium capitalize">
          {calendar.status.replace("_", " ")}
        </p>
      </div>
      <div>
        <h2 className="mb-2 text-sm font-medium">Upcoming holidays</h2>
        {calendar.holidays.length ? (
          <div className="space-y-2">
            {calendar.holidays.map((holiday) => (
              <div key={holiday.id} className="rounded border p-3 text-sm">
                <p className="font-medium">{holiday.name}</p>
                <p className="text-gray-500">
                  {holiday.holiday_date.slice(0, 10)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded border border-dashed p-4 text-sm text-gray-500">
            No upcoming holidays.
          </p>
        )}
      </div>
    </section>
  );
}

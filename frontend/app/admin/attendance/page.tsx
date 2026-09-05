"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  adminAttendance,
  adminDepartments,
  adminEmployees,
  adminOffices,
  downloadAdminReport,
  type Attendance,
  type Department,
  type Employee,
  type Office,
} from "@/lib/api";
import { formatDate, formatDuration, formatMode } from "@/lib/presentation";
import StatusBadge from "@/components/StatusBadge";

const controlClass =
  "min-h-10 rounded border border-slate-300 bg-white px-3 text-sm text-slate-900";

export default function AdminAttendance() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [officeId, setOfficeId] = useState("");
  const [mode, setMode] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Attendance[]>([]);
  const [lastPage, setLastPage] = useState(1);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    adminAttendance({
      from,
      to,
      status,
      employee_id: employeeId,
      department_id: departmentId,
      office_id: officeId,
      mode,
      page,
      per_page: 25,
      sort: "attendance_date",
      direction: "desc",
    })
      .then((response) => {
        setData(response.data);
        setLastPage(response.last_page);
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [departmentId, employeeId, from, mode, officeId, page, status, to]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([
      adminEmployees({ per_page: 100 }),
      adminDepartments({ per_page: 100 }),
      adminOffices(),
    ])
      .then(([employeeResponse, departmentResponse, officeResponse]) => {
        setEmployees(employeeResponse.data);
        setDepartments(departmentResponse.data);
        setOffices(officeResponse);
      })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setOptionsLoading(false));
  }, []);

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  function resetFilters() {
    setFrom("");
    setTo("");
    setStatus("");
    setEmployeeId("");
    setDepartmentId("");
    setOfficeId("");
    setMode("");
    setPage(1);
  }

  async function exportReport(format: "csv" | "xlsx" | "pdf") {
    setExporting(format);
    setError(null);
    try {
      const blob = await downloadAdminReport(format, {
        from,
        to,
        status,
        employee_id: employeeId,
        department_id: departmentId,
        office_id: officeId,
        mode,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `attendance-report.${format === "xlsx" ? "xlsx" : format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to export report.",
      );
    } finally {
      setExporting(null);
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-lg font-medium text-slate-900">
          Attendance report
        </h1>
        <p className="text-sm text-slate-600">
          Use the filters to query attendance records on the server.
        </p>
      </div>

      <div className="grid gap-2 rounded border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-sm text-slate-700">
          From
          <input
            aria-label="Attendance from date"
            type="date"
            value={from}
            onChange={(event) => updateFilter(setFrom, event.target.value)}
            className={controlClass}
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-700">
          To
          <input
            aria-label="Attendance to date"
            type="date"
            value={to}
            onChange={(event) => updateFilter(setTo, event.target.value)}
            className={controlClass}
          />
        </label>
        <label className="grid gap-1 text-sm text-slate-700">
          Employee
          <select
            aria-label="Filter by employee"
            value={employeeId}
            disabled={optionsLoading}
            onChange={(event) =>
              updateFilter(setEmployeeId, event.target.value)
            }
            className={controlClass}
          >
            <option value="">All employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name} ({employee.employee_code})
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-slate-700">
          Department
          <select
            aria-label="Filter by department"
            value={departmentId}
            disabled={optionsLoading}
            onChange={(event) =>
              updateFilter(setDepartmentId, event.target.value)
            }
            className={controlClass}
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-slate-700">
          Office
          <select
            aria-label="Filter by office"
            value={officeId}
            disabled={optionsLoading}
            onChange={(event) => updateFilter(setOfficeId, event.target.value)}
            className={controlClass}
          >
            <option value="">All offices</option>
            {offices.map((office) => (
              <option key={office.id} value={office.id}>
                {office.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-slate-700">
          Status
          <select
            aria-label="Filter by attendance status"
            value={status}
            onChange={(event) => updateFilter(setStatus, event.target.value)}
            className={controlClass}
          >
            <option value="">All statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="half_day">Half day</option>
            <option value="partial">Partial</option>
            <option value="absent">Absent</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm text-slate-700">
          Mode
          <select
            aria-label="Filter by attendance mode"
            value={mode}
            onChange={(event) => updateFilter(setMode, event.target.value)}
            className={controlClass}
          >
            <option value="">All modes</option>
            <option value="office">Office</option>
            <option value="wfh">WFH</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={resetFilters}
            className="min-h-10 rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-100"
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Report exports">
        {(["csv", "xlsx", "pdf"] as const).map((format) => (
          <button
            key={format}
            type="button"
            disabled={Boolean(exporting)}
            onClick={() => exportReport(format)}
            className="min-h-10 rounded border border-slate-300 bg-white px-3 text-sm font-medium uppercase disabled:opacity-50"
          >
            {exporting === format ? "Exporting…" : `Export ${format}`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print min-h-10 rounded border border-slate-300 bg-white px-3 text-sm font-medium"
        >
          Print
        </button>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}{" "}
          <button type="button" className="underline" onClick={load}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-700">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Employee</th>
              <th className="p-3">Department</th>
              <th className="p-3">Office</th>
              <th className="p-3">Mode</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Working</th>
            </tr>
          </thead>
          <tbody>
            {data.map((attendance) => (
              <tr
                key={attendance.id}
                className="border-t border-slate-100 text-slate-800"
              >
                <td className="p-3">
                  <Link
                    className="underline"
                    href={`/admin/attendance/${attendance.id}`}
                  >
                    {formatDate(attendance.attendance_date)}
                  </Link>
                </td>
                <td className="p-3">
                  {attendance.employee?.name ?? attendance.employee_id}
                </td>
                <td className="p-3">
                  {attendance.employee?.department?.name ?? "—"}
                </td>
                <td className="p-3">{attendance.office?.name ?? "—"}</td>
                <td className="p-3">{formatMode(attendance.mode)}</td>
                <td className="p-3">
                  <StatusBadge status={attendance.status} />
                </td>
                <td className="p-3 text-right">
                  {formatDuration(attendance.working_minutes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !data.length ? (
          <p className="p-4 text-sm text-slate-500">
            No records match these filters.
          </p>
        ) : null}
        {loading ? (
          <p className="p-4 text-sm text-slate-500" role="status">
            Loading attendance…
          </p>
        ) : null}
      </div>

      <nav
        className="flex items-center justify-between gap-3 text-sm"
        aria-label="Attendance pages"
      >
        <button
          type="button"
          disabled={loading || page === 1}
          onClick={() => setPage((current) => current - 1)}
          className="min-h-10 rounded border px-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {page} of {lastPage}
        </span>
        <button
          type="button"
          disabled={loading || page >= lastPage}
          onClick={() => setPage((current) => current + 1)}
          className="min-h-10 rounded border px-3 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </nav>
    </section>
  );
}

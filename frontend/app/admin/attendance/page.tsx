"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { adminAttendance, adminDepartments, adminEmployees, adminOffices, downloadAdminReport, type Attendance, type Department, type Employee, type Office } from "@/lib/api";
import { formatDate, formatDuration, formatMode, formatStatus } from "@/lib/presentation";
import AppLoading from "@/components/AppLoading";
import PageHeader from "@/components/PageHeader";
import PaginationControls from "@/components/PaginationControls";
import StatusBadge from "@/components/StatusBadge";

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
    adminAttendance({ from, to, status, employee_id: employeeId, department_id: departmentId, office_id: officeId, mode, page, per_page: 25, sort: "attendance_date", direction: "desc" })
      .then((response) => { setData(response.data); setLastPage(response.last_page); })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [departmentId, employeeId, from, mode, officeId, page, status, to]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    Promise.all([adminEmployees({ per_page: 100 }), adminDepartments({ per_page: 100 }), adminOffices()])
      .then(([employeeResponse, departmentResponse, officeResponse]) => { setEmployees(employeeResponse.data); setDepartments(departmentResponse.data); setOffices(officeResponse); })
      .catch((requestError: Error) => setError(requestError.message))
      .finally(() => setOptionsLoading(false));
  }, []);

  function updateFilter(setter: (value: string) => void, value: string) { setter(value); setPage(1); }
  function resetFilters() { setFrom(""); setTo(""); setStatus(""); setEmployeeId(""); setDepartmentId(""); setOfficeId(""); setMode(""); setPage(1); }
  async function exportReport(format: "csv" | "xlsx" | "pdf") {
    setExporting(format); setError(null);
    try {
      const blob = await downloadAdminReport(format, { from, to, status, employee_id: employeeId, department_id: departmentId, office_id: officeId, mode });
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `attendance-report.${format}`; anchor.click(); URL.revokeObjectURL(url);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Unable to export report."); }
    finally { setExporting(null); }
  }

  const activeFilters = useMemo(() => {
    const employee = employees.find((item) => String(item.id) === employeeId);
    const department = departments.find((item) => String(item.id) === departmentId);
    const office = offices.find((item) => String(item.id) === officeId);
    return [from && `From: ${formatDate(from)}`, to && `To: ${formatDate(to)}`, employeeId && `Employee: ${employee?.name ?? "Selected"}`, departmentId && `Department: ${department?.name ?? "Selected"}`, officeId && `Office: ${office?.name ?? "Selected"}`, status && `Status: ${formatStatus(status)}`, mode && `Mode: ${formatMode(mode)}`].filter((item): item is string => Boolean(item));
  }, [departmentId, departments, employeeId, employees, from, mode, officeId, offices, status, to]);

  const initialLoading = loading && !data.length;

  return <section className="attendance-report-page">
    <PageHeader eyebrow="Workforce operations" title="Attendance" description="Review attendance records across employees and offices." />

    <section className="attendance-report-filters app-card" aria-labelledby="attendance-filters-title">
      <div className="attendance-report-section-heading"><div><p className="app-eyebrow">Find records</p><h2 id="attendance-filters-title">Filters</h2><p>Refine the current attendance report without leaving this page.</p></div>{activeFilters.length > 0 && <span className="attendance-report-filter-count">{activeFilters.length} active</span>}</div>
      {activeFilters.length > 0 && <div className="attendance-report-filter-chips" aria-label="Active filters">{activeFilters.map((filter) => <span key={filter}>{filter}</span>)}</div>}
      <div className="attendance-report-filter-grid">
        <FilterLabel label="From"><input aria-label="Attendance from date" type="date" value={from} onChange={(event) => updateFilter(setFrom, event.target.value)} className="app-form-control" /></FilterLabel>
        <FilterLabel label="To"><input aria-label="Attendance to date" type="date" value={to} onChange={(event) => updateFilter(setTo, event.target.value)} className="app-form-control" /></FilterLabel>
        <FilterLabel label="Employee"><select aria-label="Filter by employee" value={employeeId} disabled={optionsLoading} onChange={(event) => updateFilter(setEmployeeId, event.target.value)} className="app-form-select"><option value="">All employees</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} ({employee.employee_code})</option>)}</select></FilterLabel>
        <FilterLabel label="Department"><select aria-label="Filter by department" value={departmentId} disabled={optionsLoading} onChange={(event) => updateFilter(setDepartmentId, event.target.value)} className="app-form-select"><option value="">All departments</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></FilterLabel>
        <FilterLabel label="Office"><select aria-label="Filter by office" value={officeId} disabled={optionsLoading} onChange={(event) => updateFilter(setOfficeId, event.target.value)} className="app-form-select"><option value="">All offices</option>{offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}</select></FilterLabel>
        <FilterLabel label="Status"><select aria-label="Filter by attendance status" value={status} onChange={(event) => updateFilter(setStatus, event.target.value)} className="app-form-select"><option value="">All statuses</option><option value="present">Present</option><option value="late">Late</option><option value="half_day">Half day</option><option value="partial">Partial</option><option value="absent">Absent</option><option value="work_from_home">Work from home</option></select></FilterLabel>
        <FilterLabel label="Mode"><select aria-label="Filter by attendance mode" value={mode} onChange={(event) => updateFilter(setMode, event.target.value)} className="app-form-select"><option value="">All modes</option><option value="office">Office</option><option value="wfh">WFH</option></select></FilterLabel>
        <div className="attendance-report-filter-reset"><button type="button" onClick={resetFilters} disabled={!activeFilters.length} className="app-secondary-action">Clear filters</button></div>
      </div>
    </section>

    <section className="attendance-report-actions app-card" aria-labelledby="attendance-actions-title"><div><p className="app-eyebrow">Report actions</p><h2 id="attendance-actions-title">Export or print</h2><p>Downloads use the filters currently applied to this report.</p></div><div className="attendance-report-action-buttons" aria-label="Report exports">{(["csv", "xlsx", "pdf"] as const).map((format) => <button key={format} type="button" disabled={Boolean(exporting)} onClick={() => exportReport(format)} className="app-secondary-action">{exporting === format ? "Exporting…" : `Export ${format.toUpperCase()}`}</button>)}<button type="button" onClick={() => window.print()} className="app-secondary-action no-print">Print</button></div></section>

    {error && <div role="alert" className="app-feedback app-feedback-error">{error} <button type="button" className="attendance-report-retry" onClick={load}>Retry</button></div>}

    <section className="attendance-report-results" aria-labelledby="attendance-results-title" aria-busy={loading}>
      <div className="attendance-report-results-heading"><div><p className="app-eyebrow">Results</p><h2 id="attendance-results-title">Attendance records</h2><p>{loading && data.length ? "Updating the current results…" : `${data.length} record${data.length === 1 ? "" : "s"} on this page`}</p></div>{loading && data.length > 0 && <AppLoading variant="inline" message="Updating records…" className="attendance-report-refreshing" />}</div>
      {initialLoading ? <div className="app-table-wrap"><AppLoading variant="inline" message="Loading attendance records…" /></div> : <div className="app-table-wrap"><table className="attendance-report-table"><thead><tr><th>Date</th><th>Employee</th><th>Department</th><th>Office</th><th>Mode</th><th>Status</th><th>Working</th></tr></thead><tbody>{data.map((attendance) => <AttendanceRow key={attendance.id} attendance={attendance} />)}</tbody></table>{!data.length && <div className="attendance-report-empty app-empty-state"><strong>No attendance records found.</strong><span>{activeFilters.length ? "Try adjusting the filters or clear them to see all available records." : "Attendance records will appear here as they are recorded."}</span>{activeFilters.length > 0 && <button type="button" className="app-secondary-action" onClick={resetFilters}>Clear filters</button>}</div>}</div>}
    </section>

    <PaginationControls page={page} lastPage={lastPage} loading={loading} onPageChange={setPage} label="Attendance pages" />
  </section>;
}

function FilterLabel({ label, children }: { label: string; children: ReactNode }) { return <label><span>{label}</span>{children}</label>; }
function AttendanceRow({ attendance }: { attendance: Attendance }) {
  const detailHref = `/admin/attendance/${attendance.id}`;
  return <tr><td><Link className="attendance-report-date-link" href={detailHref}>{formatDate(attendance.attendance_date)}<span>View details</span></Link></td><td><Link className="attendance-report-employee-link" href={detailHref}><strong>{attendance.employee?.name ?? attendance.employee_id}</strong>{attendance.employee?.employee_code && <span>{attendance.employee.employee_code}</span>}</Link></td><td>{attendance.employee?.department?.name ?? "—"}</td><td>{attendance.office?.name ?? "—"}</td><td><span className="attendance-report-mode">{formatMode(attendance.mode)}</span></td><td><StatusBadge status={attendance.status} /></td><td className="attendance-report-working">{formatDuration(attendance.working_minutes)}</td></tr>;
}

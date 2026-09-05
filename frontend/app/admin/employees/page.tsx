"use client";

import { useEffect, useState } from "react";
import {
  adminDepartments,
  adminEmployees,
  adminOffices,
  me,
  createEmployee,
  deleteEmployee,
  updateEmployee,
  updateWfhEligibility,
  type Department,
  type Employee,
  type Office,
} from "@/lib/api";

const blankForm = {
  employee_code: "",
  name: "",
  email: "",
  mobile: "",
  password: "",
  role: "employee" as Employee["role"],
  department_id: "",
  office_id: "",
  designation: "",
  joining_date: "",
  status: "active" as Employee["status"],
};

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [form, setForm] = useState(blankForm);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [wfhEligible, setWfhEligible] = useState(false);

  function load() {
    setLoading(true);
    adminEmployees()
      .then((res) => setEmployees(res.data))
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to load employees",
        ),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    adminDepartments({ per_page: 100 })
      .then((res) =>
        setDepartments(
          res.data.filter((department) => department.status === "active"),
        ),
      )
      .catch(() => {});
    adminOffices()
      .then((res) =>
        setOffices(res.filter((office) => office.status === "active")),
      )
      .catch(() => {});
    me()
      .then(setCurrentUser)
      .catch(() => {});
  }, []);

  function startEdit(employee: Employee) {
    setEditing(employee);
    setForm({
      employee_code: employee.employee_code,
      name: employee.name,
      email: employee.email,
      mobile: employee.mobile,
      password: "",
      role: employee.role,
      department_id: String(employee.department?.id ?? ""),
      office_id: String(employee.office?.id ?? ""),
      designation: employee.designation ?? "",
      joining_date: employee.joining_date?.slice(0, 10) ?? "",
      status: employee.status,
    });
    setWfhEligible(Boolean(employee.wfh_eligible));
    setFormError(null);
  }

  function cancelEdit() {
    setEditing(null);
    setForm(blankForm);
    setWfhEligible(false);
    setFormError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (
      !form.name ||
      !form.email ||
      !form.mobile ||
      (!editing && (!form.employee_code || !form.password))
    ) {
      setFormError("Complete all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const common = {
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        role: form.role,
        department_id: form.department_id ? Number(form.department_id) : null,
        office_id: form.office_id ? Number(form.office_id) : null,
        designation: form.designation || null,
        status: form.status,
      };
      if (editing) {
        await updateEmployee(editing.id, {
          ...common,
          ...(form.password ? { password: form.password } : {}),
        });
        await updateWfhEligibility(editing.id, wfhEligible);
      } else
        await createEmployee({
          ...common,
          employee_code: form.employee_code,
          password: form.password,
          joining_date: form.joining_date || undefined,
          department_id: form.department_id
            ? Number(form.department_id)
            : undefined,
          office_id: form.office_id ? Number(form.office_id) : undefined,
          designation: form.designation || undefined,
        });
      cancelEdit();
      load();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unable to save employee.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(employee: Employee) {
    if (!window.confirm(`Remove ${employee.name}?`)) return;
    try {
      await deleteEmployee(employee.id);
      load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to remove employee.",
      );
    }
  }

  const canModify = (employee: Employee) =>
    currentUser?.role === "super_admin"
      ? employee.role !== "super_admin" && employee.id !== currentUser.id
      : currentUser?.role === "hr_admin" && employee.role === "employee";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-4 text-lg font-medium">Employees</h1>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Department</th>
                  <th className="px-4 py-2">Office</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Work from home</th>
                  <th className="px-4 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-4 py-2">{emp.name}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {emp.employee_code}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {emp.department?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {emp.office?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{emp.status}</td>
                    <td className="px-4 py-2 text-gray-500">
                      {emp.wfh_eligible ? "WFH eligible" : "WFH not eligible"}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      {canModify(emp) && (
                        <>
                          <button
                            onClick={() => startEdit(emp)}
                            className="mr-3 text-xs text-gray-700 underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => remove(emp)}
                            className="text-xs text-red-600 underline"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-gray-400"
                    >
                      No employees yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">
            {editing ? `Edit ${editing.name}` : "Add employee"}
          </p>
          {editing && (
            <button onClick={cancelEdit} className="text-xs underline">
              Cancel
            </button>
          )}
        </div>
        <form
          onSubmit={submit}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          {!editing && (
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Employee code *"
              value={form.employee_code}
              onChange={(e) =>
                setForm({ ...form, employee_code: e.target.value })
              }
            />
          )}
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Full name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            type="email"
            placeholder="Email *"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Mobile *"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
          />
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            type="password"
            placeholder={editing ? "New password (optional)" : "Password *"}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Designation"
            value={form.designation}
            onChange={(e) => setForm({ ...form, designation: e.target.value })}
          />
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.department_id}
            onChange={(e) =>
              setForm({ ...form, department_id: e.target.value })
            }
          >
            <option value="">No department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.office_id}
            onChange={(e) => setForm({ ...form, office_id: e.target.value })}
          >
            <option value="">No office</option>
            {offices.map((office) => (
              <option key={office.id} value={office.id}>
                {office.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as Employee["role"] })
            }
          >
            <option value="employee">Employee</option>
            {currentUser?.role === "super_admin" && (
              <>
                <option value="hr_admin">HR admin</option>
                <option value="super_admin">Super admin</option>
              </>
            )}
          </select>
          <select
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as Employee["status"] })
            }
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          {editing && (
            <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={wfhEligible}
                onChange={(e) => setWfhEligible(e.target.checked)}
              />{" "}
              WFH eligible
            </label>
          )}
          {!editing && (
            <input
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              type="date"
              value={form.joining_date}
              onChange={(e) =>
                setForm({ ...form, joining_date: e.target.value })
              }
            />
          )}
          {formError && (
            <p className="text-sm text-red-600 md:col-span-2">{formError}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 md:col-span-2"
          >
            {submitting
              ? "Saving…"
              : editing
                ? "Save employee"
                : "Add employee"}
          </button>
        </form>
      </div>
    </div>
  );
}

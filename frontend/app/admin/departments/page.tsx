'use client';

import { useEffect, useState } from 'react';
import { adminDepartments, createDepartment, deleteDepartment, updateDepartment, type Department } from '@/lib/api';

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [editing, setEditing] = useState<Department | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    adminDepartments({ per_page: 100 })
      .then((response) => setDepartments(response.data))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load departments.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function resetForm() { setEditing(null); setName(''); setStatus('active'); setError(null); }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) { setError('Enter a department name.'); return; }
    setSubmitting(true); setError(null);
    try {
      if (editing) await updateDepartment(editing.id, { name: name.trim(), status });
      else await createDepartment({ name: name.trim(), status });
      resetForm(); load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to save department.'); }
    finally { setSubmitting(false); }
  }

  async function remove(department: Department) {
    if (!window.confirm(`Remove ${department.name}?`)) return;
    try { await deleteDepartment(department.id); load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to remove department.'); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-4 text-lg font-medium">Departments</h1>
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {!loading && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Employees</th><th className="px-4 py-2">Status</th><th className="px-4 py-2"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {departments.map((department) => <tr key={department.id} className="border-b border-gray-100 last:border-0"><td className="px-4 py-2 font-medium">{department.name}</td><td className="px-4 py-2 text-gray-500">{department.employees_count ?? 0}</td><td className="px-4 py-2 text-gray-500">{department.status}</td><td className="px-4 py-2 text-right"><button onClick={() => { setEditing(department); setName(department.name); setStatus(department.status); setError(null); }} className="mr-3 text-xs underline">Edit</button><button onClick={() => remove(department)} className="text-xs text-red-600 underline">Remove</button></td></tr>)}
                {departments.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">No departments yet.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="max-w-md rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex justify-between"><p className="text-sm font-medium">{editing ? 'Edit department' : 'Add department'}</p>{editing && <button onClick={resetForm} className="text-xs underline">Cancel</button>}</div>
        <form onSubmit={submit} className="space-y-3">
          <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Department name" value={name} onChange={(event) => setName(event.target.value)} />
          <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value as 'active' | 'inactive')}><option value="active">Active</option><option value="inactive">Inactive</option></select>
          <button type="submit" disabled={submitting} className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{submitting ? 'Saving…' : editing ? 'Save department' : 'Add department'}</button>
        </form>
      </div>
    </div>
  );
}

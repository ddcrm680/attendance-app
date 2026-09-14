"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminOfficePage,
  createOffice,
  deleteOffice,
  updateOffice,
  type Office,
} from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import PaginationControls from "@/components/PaginationControls";

export default function AdminOfficesPage() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("200");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [editing, setEditing] = useState<Office | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    adminOfficePage({ page, per_page: 25, search, status: statusFilter })
      .then((result) => { setOffices(result.data); setLastPage(result.last_page); })
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to load offices.",
        ),
      )
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);
  useEffect(() => { load(); }, [load]);
  function resetForm() {
    setEditing(null);
    setName("");
    setAddress("");
    setLatitude("");
    setLongitude("");
    setRadius("200");
    setStatus("active");
    setFormError(null);
  }
  function startEdit(office: Office) {
    setEditing(office);
    setName(office.name);
    setAddress(office.address ?? "");
    setLatitude(office.latitude);
    setLongitude(office.longitude);
    setRadius(String(office.radius));
    setStatus(office.status);
    setFormError(null);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!name || !latitude || !longitude || !radius) {
      setFormError("Fill in name, latitude, longitude, and radius.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name,
        address: address || undefined,
        latitude: Number(latitude),
        longitude: Number(longitude),
        radius: Number(radius),
        status,
      };
      if (editing) await updateOffice(editing.id, payload);
      else await createOffice(payload);
      resetForm();
      load();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unable to save office.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  async function remove(office: Office) {
    if (!window.confirm(`Remove ${office.name}?`)) return;
    try {
      await deleteOffice(office.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove office.");
    }
  }
  return (
    <div className="space-y-6">
      <div>
        <PageHeader title="Offices & geofences" className="mb-4" />
        <div className="app-card mb-4 flex flex-col gap-2 p-3 sm:flex-row"><input className="app-form-control" placeholder="Search name or address" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><select className="app-form-select sm:max-w-44" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select><button type="button" className="app-secondary-action" onClick={() => { setSearch(""); setStatusFilter(""); setPage(1); }}>Clear</button></div>
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {!loading && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {offices.map((office) => (
              <div
                key={office.id}
                className="app-card p-4"
              >
                <p className="font-medium">{office.name}</p>
                <p className="text-sm text-gray-500">
                  {office.address || "No address"}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-500">
                  <span>Lat: {office.latitude}</span>
                  <span>Lng: {office.longitude}</span>
                  <span>Radius: {office.radius}m</span>
                  <span>Employees: {office.employees_count ?? 0}</span>
                </div>
                <div className="mt-3 flex justify-between text-xs">
                  <span className="text-gray-500">{office.status}</span>
                  <span>
                    <button
                      onClick={() => startEdit(office)}
                      className="mr-3 underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(office)}
                      className="text-red-600 underline"
                    >
                      Remove
                    </button>
                  </span>
                </div>
              </div>
            ))}
            {offices.length === 0 && (
              <p className="text-sm text-gray-400">No offices yet.</p>
            )}
          </div>
        )}
        <PaginationControls page={page} lastPage={lastPage} loading={loading} onPageChange={setPage} label="Office pages" />
      </div>
      <div className="app-card max-w-md p-4">
        <div className="mb-3 flex justify-between">
          <p className="text-sm font-medium">
            {editing ? `Edit ${editing.name}` : "Add office"}
          </p>
          {editing && (
            <button onClick={resetForm} className="text-xs underline">
              Cancel
            </button>
          )}
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            className="app-form-control"
            placeholder="Office name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            className="app-form-control"
            placeholder="Address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="app-form-control"
              placeholder="Latitude"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
            />
            <input
              className="app-form-control"
              placeholder="Longitude"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
            />
          </div>
          <input
            className="app-form-control"
            placeholder="Geofence radius (meters)"
            value={radius}
            onChange={(event) => setRadius(event.target.value)}
          />
          <select
            className="app-form-control"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "active" | "inactive")
            }
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="app-primary-action w-full rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "Saving…" : editing ? "Save office" : "Add office"}
          </button>
        </form>
      </div>
    </div>
  );
}

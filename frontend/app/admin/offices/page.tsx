"use client";

import { useEffect, useState } from "react";
import {
  adminOffices,
  createOffice,
  deleteOffice,
  updateOffice,
  type Office,
} from "@/lib/api";

export default function AdminOfficesPage() {
  const [offices, setOffices] = useState<Office[]>([]);
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
  function load() {
    setLoading(true);
    adminOffices()
      .then(setOffices)
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to load offices.",
        ),
      )
      .finally(() => setLoading(false));
  }
  useEffect(load, []);
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
        <h1 className="mb-4 text-lg font-medium">Offices & geofences</h1>
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {!loading && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {offices.map((office) => (
              <div
                key={office.id}
                className="rounded-xl border border-gray-200 bg-white p-4"
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
      </div>
      <div className="max-w-md rounded-xl border border-gray-200 bg-white p-4">
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
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Office name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Latitude"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
            />
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Longitude"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
            />
          </div>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Geofence radius (meters)"
            value={radius}
            onChange={(event) => setRadius(event.target.value)}
          />
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Saving…" : editing ? "Save office" : "Add office"}
          </button>
        </form>
      </div>
    </div>
  );
}

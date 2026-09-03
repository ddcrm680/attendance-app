'use client';

import { useEffect, useState } from 'react';
import { adminOffices, createOffice } from '@/lib/api';

type Office = {
  id: number;
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  radius: number;
  employees_count: number;
};

export default function AdminOfficesPage() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('200');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    adminOffices()
      .then(setOffices)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load offices'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!name || !latitude || !longitude || !radius) {
      setFormError('Fill in name, latitude, longitude, and radius.');
      return;
    }

    setSubmitting(true);
    try {
      await createOffice({
        name,
        address: address || undefined,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseInt(radius, 10),
      });
      setName('');
      setAddress('');
      setLatitude('');
      setLongitude('');
      setRadius('200');
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create office');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-4 text-lg font-medium">Offices</h1>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {offices.map((office) => (
              <div key={office.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="font-medium">{office.name}</p>
                <p className="text-sm text-gray-500">{office.address}</p>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-500">
                  <span>Lat: {office.latitude}</span>
                  <span>Lng: {office.longitude}</span>
                  <span>Radius: {office.radius}m</span>
                  <span>Employees: {office.employees_count}</span>
                </div>
              </div>
            ))}
            {offices.length === 0 && <p className="text-sm text-gray-400">No offices yet.</p>}
          </div>
        )}
      </div>

      <div className="max-w-md rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-3 text-sm font-medium">Add office</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Office name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Latitude"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Longitude"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
          </div>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Geofence radius (meters)"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
          />
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? 'Adding…' : 'Add office'}
          </button>
        </form>
      </div>
    </div>
  );
}

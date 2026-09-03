'use client';

type Props = {
  status: 'idle' | 'detecting' | 'verified' | 'outside' | 'error';
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  officeName?: string;
  errorMessage?: string;
};

export default function LocationStatus({ status, latitude, longitude, accuracy, officeName, errorMessage }: Props) {
  const label =
    status === 'detecting'
      ? 'Detecting location…'
      : status === 'verified'
        ? `Location verified — ${officeName ?? 'office'}`
        : status === 'outside'
          ? 'You are outside the allowed location'
          : status === 'error'
            ? errorMessage ?? 'Unable to verify your location'
            : 'Location not checked yet';

  const color =
    status === 'verified' ? 'text-green-700' : status === 'outside' || status === 'error' ? 'text-red-600' : 'text-gray-500';

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">Location status</p>
      <p className={`mb-2 text-sm font-medium ${color}`}>{label}</p>
      {latitude !== undefined && longitude !== undefined && (
        <div className="grid grid-cols-2 gap-1 text-xs text-gray-500">
          <span>Lat: {latitude.toFixed(5)}</span>
          <span>Lng: {longitude.toFixed(5)}</span>
          {accuracy !== undefined && <span>Accuracy: {Math.round(accuracy)}m</span>}
        </div>
      )}
    </div>
  );
}

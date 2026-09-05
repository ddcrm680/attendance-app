'use client';

import { useEffect, useRef, useState } from 'react';

export type TrackingState = 'inactive' | 'starting' | 'active' | 'degraded';

type Props = { enabled: boolean; intervalSeconds: number; onPosition: (position: GeolocationPosition) => Promise<void> };

export function useLiveLocationTracking({ enabled, intervalSeconds, onPosition }: Props) {
  const [state, setState] = useState<TrackingState>('inactive');
  const [error, setError] = useState<string | null>(null);
  const callback = useRef(onPosition); callback.current = onPosition;

  useEffect(() => {
    if (!enabled) { setState('inactive'); setError(null); return; }
    if (!navigator.geolocation) { setState('degraded'); setError('Live tracking is unavailable on this browser.'); return; }
    let lastSent = 0;
    let alive = true;
    setState('starting'); setError(null);
    const watchId = navigator.geolocation.watchPosition(async (position) => {
      if (!alive || position.timestamp - lastSent < intervalSeconds * 1000) return;
      lastSent = position.timestamp;
      try { await callback.current(position); if (alive) { setState('active'); setError(null); } }
      catch (cause) { if (alive) { setState('degraded'); setError(cause instanceof Error ? cause.message : 'Unable to send your location.'); } }
    }, (geoError) => {
      if (!alive) return;
      setState('degraded');
      setError(geoError.code === geoError.PERMISSION_DENIED ? 'Location permission was denied. Tracking has stopped.' : geoError.code === geoError.TIMEOUT ? 'Location tracking timed out. Please retry.' : 'Location is unavailable. Check GPS and retry.');
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    return () => { alive = false; navigator.geolocation.clearWatch(watchId); };
  }, [enabled, intervalSeconds]);

  return { state, error };
}

import { useCallback, useEffect, useState } from 'react';
import { getJson, qs } from './live';

export interface FarmLocation {
  lat: number;
  lon: number;
  name: string;
  district?: string | null;
  state?: string | null;
  source: 'gps' | 'search' | 'default';
}

const KEY = 'farmLocation';
const EVENT = 'farmLocationChange';
export const DEFAULT_LOCATION: FarmLocation = { lat: 28.61, lon: 77.21, name: 'New Delhi', district: 'New Delhi', state: 'Delhi', source: 'default' };

function readStored(): FarmLocation | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    return v && typeof v.lat === 'number' && typeof v.lon === 'number' ? v : null;
  } catch { return null; }
}

export function saveFarmLocation(loc: FarmLocation) {
  try { localStorage.setItem(KEY, JSON.stringify(loc)); } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent<FarmLocation>(EVENT, { detail: loc }));
}

let detecting: Promise<FarmLocation> | null = null;

/** Ask the browser for GPS, then name the place via the backend. */
export function detectFarmLocation(): Promise<FarmLocation> {
  if (detecting) return detecting;
  detecting = new Promise<FarmLocation>((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('This browser cannot share location')); return; }
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        let place: { name?: string; district?: string; state?: string } = {};
        try { place = await getJson(`/api/live/reverse?${qs({ lat: latitude, lon: longitude })}`); } catch { /* name is optional */ }
        const loc: FarmLocation = {
          lat: +latitude.toFixed(4), lon: +longitude.toFixed(4),
          name: place.name || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
          district: place.district, state: place.state, source: 'gps',
        };
        saveFarmLocation(loc);
        resolve(loc);
      },
      err => reject(new Error(err.code === err.PERMISSION_DENIED ? 'Location permission was blocked' : 'Could not get your location')),
      { timeout: 10000, maximumAge: 10 * 60 * 1000 },
    );
  }).finally(() => { detecting = null; });
  return detecting;
}

/** Shared farm location for every page. Auto-detects once if nothing is saved. */
export function useFarmLocation() {
  const [location, setLocation] = useState<FarmLocation>(() => readStored() ?? DEFAULT_LOCATION);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onChange = (e: Event) => setLocation((e as CustomEvent<FarmLocation>).detail);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const detect = useCallback(async () => {
    setBusy(true);
    setError('');
    try { await detectFarmLocation(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not get your location'); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { if (!readStored()) detect(); }, [detect]);

  return { location, setLocation: saveFarmLocation, detect, busy, error };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '../config';
import { fetchWeatherDirect } from './weather';

// ─── Types returned by backend /api/live/* ───────────────────────────────────

export interface LiveDay {
  date: string; label: string; icon: string;
  temp_max: number; temp_min: number; rain_mm: number; rain_probability: number;
  wind_max: number; et0_mm: number; uv_max: number; sunrise: string; sunset: string;
  advice: string[];
}

export interface LiveWeather {
  source: string; fetched_at: string; timezone: string; elevation: number;
  current: {
    time: string; label: string; icon: string; temperature: number; feels_like: number;
    humidity: number; precipitation: number; rain_probability: number;
    wind_speed: number; wind_gusts: number; is_day: boolean;
  };
  soil: { moisture_surface: number | null; moisture_root: number | null; temperature: number | null; status: string | null };
  daily: LiveDay[];
}

export interface RainHistory {
  source: string; through: string; total_mm: number; prev_total_mm: number;
  months: { month: string; rain_mm: number; rain_prev_year_mm: number | null; temp_mean: number | null }[];
}

export interface MandiRecord {
  state: string; district: string; market: string; commodity: string; variety: string; grade: string;
  date: string; min_price: number | null; max_price: number | null; modal_price: number;
}

export interface MandiData {
  source: string; commodity: string; state: string | null; region?: string; unit: string;
  total_reported: number; count: number; latest_date: string | null; dataset_updated: string | null;
  summary: { avg_modal: number; median_modal: number; lowest: number; highest: number } | null;
  by_state: { state: string; markets: number; avg_modal: number; min_modal: number; max_modal: number }[];
  records: MandiRecord[];
}

export interface MandiCompare {
  source: string; unit: string; region?: string;
  crops: { crop: string; commodity: string; avg_modal: number | null; markets: number; latest_date: string | null }[];
}

export interface IndiaIndicators {
  source: string;
  indicators: { code: string; name: string; unit: string; last_updated: string; points: { year: number; value: number }[] }[];
}

// ─── Fetch helpers ───────────────────────────────────────────────────────────

// The free backend sleeps when idle and takes ~30-60 s to wake; meanwhile the proxy
// answers 502/503/504. Retry for up to ~90 s and tell the UI the server is waking.
const WAKE_CODES = new Set([502, 503, 504]);
let waking = 0;
const setWaking = (on: boolean) => {
  waking = Math.max(0, waking + (on ? 1 : -1));
  window.dispatchEvent(new CustomEvent('serverWaking', { detail: waking > 0 }));
};

export async function fetchWithWake(url: string, init?: RequestInit): Promise<Response> {
  const deadline = Date.now() + 90_000;
  let announced = false;
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await fetch(url, init);
        if (!WAKE_CODES.has(res.status) || Date.now() > deadline) return res;
      } catch (err) {  // network error while the instance restarts
        if (Date.now() > deadline) throw err;
      }
      if (!announced) { setWaking(true); announced = true; }
      await new Promise(r => setTimeout(r, Math.min(2000 + attempt * 1000, 6000)));
    }
  } finally {
    if (announced) setWaking(false);
  }
}

/** Fire-and-forget request that starts waking the backend early (e.g. on the login page). */
export const wakeBackend = () => { fetch(`${API_BASE}/api/health`).catch(() => {}); };

export async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  // Weather comes straight from Open-Meteo in the browser (see weather.ts); the backend is the fallback.
  if (path.startsWith('/api/live/weather?')) {
    const q = new URLSearchParams(path.split('?')[1]);
    try {
      return (await fetchWeatherDirect(Number(q.get('lat')), Number(q.get('lon')))) as T;
    } catch { /* fall through to the backend */ }
  }
  const res = await fetchWithWake(`${API_BASE}${path}`, init);
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try { detail = (await res.json()).detail ?? detail; } catch { /* not JSON */ }
    throw new Error(detail);
  }
  return res.json();
}

export const qs = (params: Record<string, string | number | null | undefined>) =>
  Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

/**
 * Fetch `path` (null = don't fetch), keep the last good data while reloading,
 * and optionally refresh every `refreshMs`.
 */
export function useLive<T>(path: string | null, refreshMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const reqId = useRef(0);

  const reload = useCallback(async () => {
    if (!path) return;
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    try {
      const d = await getJson<T>(path);
      if (id === reqId.current) { setData(d); setUpdatedAt(new Date()); }
    } catch (e) {
      if (id === reqId.current) setError(e instanceof Error ? e.message : 'Could not load live data');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => {
    if (!path || !refreshMs) return;
    const t = window.setInterval(reload, refreshMs);
    return () => window.clearInterval(t);
  }, [path, refreshMs, reload]);

  return { data, error, loading, updatedAt, reload };
}

// ─── Formatting ──────────────────────────────────────────────────────────────

export const rupees = (n: number | null | undefined) => (n == null ? '—' : '₹' + Math.round(n).toLocaleString('en-IN'));
export const timeAgo = (d: Date | null) => {
  if (!d) return '';
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};
export const dayName = (iso: string, i: number) =>
  i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Date(iso + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
export const prettyDate = (iso: string | null | undefined) =>
  iso ? new Date(iso + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

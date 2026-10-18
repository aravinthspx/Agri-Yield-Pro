import { useEffect, useRef, useState } from 'react';
import { MapPin, Crosshair, Search, Loader2, X } from 'lucide-react';
import { useFarmLocation } from '../lib/farmLocation';
import { getJson, qs } from '../lib/live';

interface Place { name: string; state: string | null; district: string | null; lat: number; lon: number }

/** Shows the farm location and lets the farmer search a village/town or use GPS. */
export default function LocationPicker({ tone = 'light', className = '' }: { tone?: 'light' | 'onColor'; className?: string }) {
  const { location, setLocation, detect, busy, error } = useFarmLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setSearchError(''); return; }
    const t = window.setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const d = await getJson<{ results: Place[] }>(`/api/live/geocode?${qs({ q: query.trim() })}`);
        setResults(d.results);
        if (!d.results.length) setSearchError('No place found. Try the nearest town or district name.');
      } catch (e) {
        setSearchError(e instanceof Error ? e.message : 'Search failed');
      } finally { setSearching(false); }
    }, 350);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const label = [location.name, location.state && location.state !== location.name ? location.state : null].filter(Boolean).join(', ');

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        title="Change farm location"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors max-w-full ${tone === 'onColor'
          ? 'bg-cream/20 hover:bg-cream/30 text-cream'
          : 'bg-white/5 hover:bg-emerald-500/10 text-neutral-200 border border-neutral-800'}`}
      >
        {busy ? <Loader2 size={12} className="animate-spin shrink-0" /> : <MapPin size={12} className="shrink-0" />}
        <span className="truncate">{busy ? 'Finding your farm…' : label}</span>
        {location.source === 'default' && !busy && <span className="opacity-80 font-semibold">· tap to set</span>}
      </button>

      {open && (
        <div className="absolute z-50 mt-2 left-0 w-[min(340px,calc(100vw-32px))] glass-card p-3 shadow-xl text-neutral-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">Where is your farm?</span>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/5 text-neutral-500" aria-label="Close"><X size={14} /></button>
          </div>
          <button
            onClick={async () => { await detect(); setOpen(false); }}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-cream text-sm font-bold mb-2 disabled:opacity-60"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Crosshair size={15} />} Use my current location (GPS)
          </button>
          {error && <p className="text-xs text-red-400 mb-2">{error}. Search your village instead.</p>}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              autoFocus value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search village, town or district"
              className="farm-input !pl-9 !py-2 text-sm"
            />
            {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-neutral-500" />}
          </div>
          {searchError && <p className="text-xs text-neutral-500 mt-2">{searchError}</p>}
          <ul className="mt-2 max-h-56 overflow-y-auto">
            {results.map(r => (
              <li key={`${r.lat},${r.lon}`}>
                <button
                  onClick={() => {
                    setLocation({ lat: r.lat, lon: r.lon, name: r.name, district: r.district, state: r.state, source: 'search' });
                    setOpen(false); setQuery('');
                  }}
                  className="w-full text-left px-2 py-2 rounded-lg hover:bg-emerald-500/10"
                >
                  <div className="text-sm font-semibold">{r.name}</div>
                  <div className="text-xs text-neutral-500">{[r.district, r.state].filter(Boolean).join(', ')}</div>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-neutral-500 mt-1">Weather, rain and mandi prices on every page use this place.</p>
        </div>
      )}
    </div>
  );
}

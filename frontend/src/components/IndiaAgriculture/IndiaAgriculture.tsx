import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, ReferenceLine,
} from 'recharts';
import { IndianRupee, TrendingUp, TrendingDown, Download, Search, ArrowUpDown, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { useFarmLocation } from '../../lib/farmLocation';
import { useLive, qs, rupees, timeAgo, prettyDate, type MandiData, type IndiaIndicators } from '../../lib/live';
import LocationPicker from '../LocationPicker';

// South Indian crops first.
const COMMODITIES = [
  { crop: 'Paddy', icon: '🌾' }, { crop: 'Rice', icon: '🍚' }, { crop: 'Banana', icon: '🍌' }, { crop: 'Coconut', icon: '🥥' },
  { crop: 'Turmeric', icon: '🟡' }, { crop: 'Groundnut', icon: '🥜' }, { crop: 'Ragi', icon: '🌾' }, { crop: 'Tapioca', icon: '🍠' },
  { crop: 'Black Pepper', icon: '⚫' }, { crop: 'Cardamom', icon: '🌿' }, { crop: 'Arecanut', icon: '🌰' }, { crop: 'Chilli', icon: '🌶️' },
  { crop: 'Black Gram', icon: '🫘' }, { crop: 'Tomato', icon: '🍅' }, { crop: 'Onion', icon: '🧅' }, { crop: 'Drumstick', icon: '🥢' },
  { crop: 'Cotton', icon: '☁️' }, { crop: 'Maize', icon: '🌽' }, { crop: 'Wheat', icon: '🌿' }, { crop: 'Potato', icon: '🥔' },
];

type SortKey = 'modal_price' | 'market' | 'state';

const ChartTooltip = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div className="bg-paper border border-neutral-800 rounded-xl p-3 shadow-lg text-xs">
      <p className="text-neutral-400 mb-1 font-semibold">{label}</p>
      {payload.map((e: any, i: number) => (
        <p key={i} className="font-semibold text-neutral-100">{e.name}: {Number(e.value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
      ))}
    </div>
  ) : null;

function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[^\w.-]+/g, '_');
  a.click();
  URL.revokeObjectURL(url);
}

const compact = (v: number) =>
  Math.abs(v) >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v.toLocaleString('en-IN', { maximumFractionDigits: 1 });

export default function IndiaAgriculture() {
  const { location } = useFarmLocation();
  const [crop, setCrop] = useState('Paddy');
  const [region, setRegion] = useState<'south' | 'india'>('south');
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'modal_price', desc: true });
  const [indicatorCode, setIndicatorCode] = useState('AG.YLD.CREL.KG');
  const [fromYear, setFromYear] = useState(2000);

  const mandi = useLive<MandiData>(`/api/live/mandi?${qs({ crop, region: region === 'south' ? 'south' : null, max_records: region === 'south' ? 60 : 150 })}`, 30 * 60 * 1000);
  const wb = useLive<IndiaIndicators>('/api/live/india-indicators');

  const records = useMemo(() => {
    const rows = (mandi.data?.records ?? []).filter(r =>
      (!stateFilter || r.state === stateFilter) &&
      (!query || `${r.market} ${r.district} ${r.state} ${r.variety}`.toLowerCase().includes(query.toLowerCase())));
    const dir = sort.desc ? -1 : 1;
    return [...rows].sort((a, b) => (a[sort.key] > b[sort.key] ? dir : a[sort.key] < b[sort.key] ? -dir : 0));
  }, [mandi.data, stateFilter, query, sort]);

  const byState = mandi.data?.by_state ?? [];
  const myState = byState.find(s => s.state === location.state);
  const indicator = wb.data?.indicators.find(i => i.code === indicatorCode);
  const points = indicator?.points.filter(p => p.year >= fromYear) ?? [];
  const first = points[0];
  const last = points.at(-1);
  const change = first && last && first.value ? ((last.value - first.value) / Math.abs(first.value)) * 100 : null;
  const sortBy = (key: SortKey) => setSort(s => ({ key, desc: s.key === key ? !s.desc : key === 'modal_price' }));

  return (
    <div className="min-h-screen text-neutral-100">
      <div className="px-4 md:px-6 py-6 max-w-[1500px] mx-auto space-y-6">

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold" style={{ fontFamily: 'Baloo 2' }}>
              {region === 'south' ? '🌴 South India Agriculture — live' : '🇮🇳 India Agriculture — live'}
            </h1>
            <p className="text-neutral-500 mt-1 max-w-2xl">
              Today's real wholesale prices from {region === 'south' ? 'mandis in Tamil Nadu, Kerala, Karnataka, Andhra Pradesh, Telangana and Puducherry' : 'mandis across India'}, and official long-term farm statistics. Nothing on this page is simulated.
            </p>
            <div className="flex gap-2 mt-3">
              <button className={`chip !py-1.5 ${region === 'south' ? 'active' : ''}`} onClick={() => { setRegion('south'); setStateFilter(null); }}>🌴 South India</button>
              <button className={`chip !py-1.5 ${region === 'india' ? 'active' : ''}`} onClick={() => { setRegion('india'); setStateFilter(null); }}>🇮🇳 All India</button>
            </div>
          </div>
          <LocationPicker />
        </header>

        {/* ══ LIVE MANDI PRICES ══════════════════════════════════════════════ */}
        <section className="glass-card p-5 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl text-amber-400 bg-amber-500/15"><IndianRupee size={20} /></div>
              <div>
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Baloo 2' }}>Today's mandi prices</h2>
                <p className="text-sm text-neutral-500">
                  {mandi.data ? <>Agmarknet · {mandi.data.total_reported.toLocaleString('en-IN')} reports for {mandi.data.commodity} · latest {prettyDate(mandi.data.latest_date)} · showing {mandi.data.count}</> : 'Loading from Agmarknet…'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={mandi.reload} disabled={mandi.loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-neutral-800 hover:bg-emerald-500/10 hover:text-emerald-400">
                <RefreshCw size={13} className={mandi.loading ? 'animate-spin' : ''} /> {mandi.updatedAt ? `Updated ${timeAgo(mandi.updatedAt)}` : 'Refresh'}
              </button>
              <button
                disabled={!records.length}
                onClick={() => downloadCsv(`mandi_${crop}_${mandi.data?.latest_date ?? 'today'}.csv`, [
                  ['Date', 'State', 'District', 'Market', 'Commodity', 'Variety', 'Grade', 'Min ₹/qtl', 'Max ₹/qtl', 'Modal ₹/qtl'],
                  ...records.map(r => [r.date, r.state, r.district, r.market, r.commodity, r.variety, r.grade, r.min_price, r.max_price, r.modal_price]),
                ])}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-cream disabled:opacity-50">
                <Download size={13} /> Download CSV
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {COMMODITIES.map(c => (
              <button key={c.crop} className={`chip !py-1.5 ${crop === c.crop ? 'active' : ''}`}
                onClick={() => { setCrop(c.crop); setStateFilter(null); }} aria-pressed={crop === c.crop}>
                {c.icon} {c.crop}
              </button>
            ))}
          </div>

          {mandi.error && !mandi.data && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 flex items-center justify-between">
              <span className="flex items-center gap-2"><AlertTriangle size={15} /> {mandi.error}</span>
              <button onClick={mandi.reload} className="font-bold underline">Retry</button>
            </div>
          )}

          {mandi.data?.summary ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                {[
                  { l: `Typical price (${region === 'south' ? 'South India' : 'India'})`, v: rupees(mandi.data.summary.median_modal), s: 'median of all mandis' },
                  { l: 'Lowest seen', v: rupees(mandi.data.summary.lowest), s: 'per quintal' },
                  { l: 'Highest seen', v: rupees(mandi.data.summary.highest), s: 'per quintal' },
                  {
                    l: location.state ? `In ${location.state}` : 'Your state',
                    v: myState ? rupees(myState.avg_modal) : '—',
                    s: myState ? `${myState.markets} mandis · ${myState.avg_modal >= mandi.data.summary.median_modal ? 'above' : 'below'} ${region === 'south' ? 'South India' : 'India'}` : 'no reports in this sample',
                  },
                ].map(k => (
                  <div key={k.l} className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                    <div className="text-xs font-semibold text-neutral-500">{k.l}</div>
                    <div className="text-2xl font-extrabold mt-1" style={{ fontFamily: 'Baloo 2' }}>{k.v}</div>
                    <div className="text-xs text-neutral-500">{k.s}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-5">
                  <div className="text-sm font-semibold text-neutral-300 mb-2">Average price by state — tap a bar to filter</div>
                  <ResponsiveContainer width="100%" height={Math.max(200, byState.length * 26 + 10)}>
                    <BarChart data={byState} layout="vertical" margin={{ top: 0, right: 55, left: 0, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="state" width={115} tick={{ fill: '#5C4633', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(139,90,43,0.06)' }} />
                      {mandi.data.summary && <ReferenceLine x={mandi.data.summary.median_modal} stroke="#8B5A2B" strokeDasharray="3 3" />}
                      <Bar dataKey="avg_modal" name="Avg ₹/qtl" radius={[0, 6, 6, 0]} cursor="pointer"
                        label={{ position: 'right', fill: '#5C4633', fontSize: 11, formatter: (v: any) => rupees(Number(v)) }}
                        onClick={(d: any) => { const s = d?.payload?.state ?? d?.state; setStateFilter(f => (f === s ? null : s)); }}>
                        {byState.map(s => (
                          <Cell key={s.state}
                            fill={s.state === location.state ? '#F07F1A' : '#2F7D32'}
                            opacity={!stateFilter || stateFilter === s.state ? 1 : 0.3} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-neutral-500 mt-1">🟧 your state · dashed line = {region === 'south' ? 'South India' : 'India'} typical price</p>
                </div>

                <div className="lg:col-span-7">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search mandi, district or variety"
                        className="farm-input !py-2 !pl-9 !text-sm" />
                    </div>
                    {stateFilter && (
                      <button className="chip active !py-1.5 !text-xs" onClick={() => setStateFilter(null)}>{stateFilter} ✕</button>
                    )}
                    {location.state && !stateFilter && byState.some(s => s.state === location.state) && (
                      <button className="chip !py-1.5 !text-xs" onClick={() => setStateFilter(location.state!)}>📍 Only {location.state}</button>
                    )}
                  </div>
                  <div className="rounded-xl border border-neutral-800 overflow-hidden">
                    <div className="max-h-[420px] overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-neutral-900 text-neutral-400 text-xs">
                          <tr>
                            {([['market', 'Mandi'], ['state', 'State'], ['modal_price', '₹/quintal']] as const).map(([k, l]) => (
                              <th key={k} className={`px-3 py-2 font-semibold ${k === 'modal_price' ? 'text-right' : 'text-left'}`}>
                                <button onClick={() => sortBy(k)} className="inline-flex items-center gap-1 hover:text-emerald-400">
                                  {l} <ArrowUpDown size={11} className={sort.key === k ? 'text-emerald-400' : ''} />
                                </button>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((r, i) => (
                            <tr key={`${r.market}-${r.variety}-${i}`} className={`border-t border-neutral-800 ${r.state === location.state ? 'bg-orange-500/5' : ''}`}>
                              <td className="px-3 py-2">
                                <div className="font-semibold text-neutral-100">{r.market}</div>
                                <div className="text-xs text-neutral-500">{r.variety} · {prettyDate(r.date)}</div>
                              </td>
                              <td className="px-3 py-2 text-neutral-300">{r.district}<div className="text-xs text-neutral-500">{r.state}</div></td>
                              <td className="px-3 py-2 text-right">
                                <div className="font-extrabold text-neutral-100">{rupees(r.modal_price)}</div>
                                <div className="text-[11px] text-neutral-500">{rupees(r.min_price)} – {rupees(r.max_price)}</div>
                              </td>
                            </tr>
                          ))}
                          {!records.length && <tr><td colSpan={3} className="px-3 py-6 text-center text-neutral-500">No mandi matches.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : mandi.data && !mandi.loading ? (
            <p className="text-neutral-500">No {region === 'south' ? 'South Indian ' : ''}mandi has reported {crop} prices recently.{region === 'south' && <> <button className="underline font-semibold" onClick={() => setRegion('india')}>Try All India</button></>}</p>
          ) : !mandi.error && <div className="h-72 shimmer rounded-xl" />}
        </section>

        {/* ══ WORLD BANK TRENDS ══════════════════════════════════════════════ */}
        <section className="glass-card p-5 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Baloo 2' }}>📈 How Indian farming is changing</h2>
              <p className="text-sm text-neutral-500">Official yearly statistics for India · World Bank Open Data{indicator ? ` · updated ${indicator.last_updated}` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <a href={`https://data.worldbank.org/indicator/${indicatorCode}?locations=IN`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-neutral-800 hover:bg-blue-500/10 hover:text-blue-400">
                Source <ExternalLink size={12} />
              </a>
              <button disabled={!indicator}
                onClick={() => indicator && downloadCsv(`india_${indicator.name}.csv`, [['Year', `${indicator.name} (${indicator.unit})`], ...indicator.points.map(p => [p.year, p.value])])}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-cream disabled:opacity-50">
                <Download size={13} /> Download CSV
              </button>
            </div>
          </div>

          {wb.error && !wb.data && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 flex items-center justify-between">
              <span className="flex items-center gap-2"><AlertTriangle size={15} /> {wb.error}</span>
              <button onClick={wb.reload} className="font-bold underline">Retry</button>
            </div>
          )}

          {wb.data ? (
            <>
              <div className="flex flex-wrap gap-2 mb-5">
                {wb.data.indicators.map(i => (
                  <button key={i.code} className={`chip !py-1.5 !text-xs ${indicatorCode === i.code ? 'active' : ''}`} onClick={() => setIndicatorCode(i.code)}>
                    {i.name}
                  </button>
                ))}
              </div>
              {indicator && last && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  <div className="lg:col-span-3 space-y-3">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                      <div className="text-xs font-semibold text-neutral-500">Latest ({last.year})</div>
                      <div className="text-3xl font-extrabold" style={{ fontFamily: 'Baloo 2' }}>{compact(last.value)}</div>
                      <div className="text-xs text-neutral-500">{indicator.unit}</div>
                    </div>
                    {change != null && first && (
                      <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-4">
                        <div className="text-xs font-semibold text-neutral-500">Change since {first.year}</div>
                        <div className={`text-3xl font-extrabold flex items-center gap-1 ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`} style={{ fontFamily: 'Baloo 2' }}>
                          {change >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}{change >= 0 ? '+' : ''}{change.toFixed(1)}%
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-semibold text-neutral-500">Show from {fromYear}</label>
                      <input type="range" className="farm-range" min={indicator.points[0]?.year ?? 1990} max={(last.year ?? 2024) - 3} step={1}
                        value={fromYear} onChange={e => setFromYear(+e.target.value)} />
                    </div>
                  </div>
                  <div className="lg:col-span-9">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="wbGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2F7D32" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#2F7D32" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,90,43,0.12)" />
                        <XAxis dataKey="year" tick={{ fill: '#857059', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#857059', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={compact} width={60} domain={['auto', 'auto']} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="value" name={indicator.unit} stroke="#2F7D32" strokeWidth={2.5} fill="url(#wbGrad)" dot={{ r: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          ) : !wb.error && <div className="h-72 shimmer rounded-xl" />}
        </section>

        <p className="text-xs text-neutral-500 text-center pb-4">
          Mandi prices: Agmarknet via data.gov.in (Government of India) — reported by APMC markets, refreshed every 30 minutes. Long-term statistics: World Bank Open Data.
        </p>
      </div>
    </div>
  );
}

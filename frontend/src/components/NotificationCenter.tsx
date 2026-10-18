import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, BellRing, Settings, X, CheckCheck, ChevronLeft, Smartphone } from 'lucide-react';
import { useFarmLocation } from '../lib/farmLocation';
import { useLive, getJson, qs, rupees, dayName, type LiveWeather, type MandiData } from '../lib/live';

type Category = 'weather' | 'forecast' | 'soil' | 'market' | 'plan';
type Severity = 'alert' | 'warn' | 'info' | 'good';

interface Notice {
  id: string;            // stable per day + kind, so "read" survives refreshes
  category: Category;
  severity: Severity;
  icon: string;
  title: string;
  body: string;
  time: string;
  nav?: string;          // nav button id to open when tapped
}

interface Prefs extends Record<Category, boolean> { push: boolean }

const CATEGORIES: { key: Category; label: string; icon: string; desc: string }[] = [
  { key: 'weather', label: 'Today\'s weather', icon: '🌦️', desc: 'Rain, heat, wind, storms, fungus risk' },
  { key: 'forecast', label: 'Coming days', icon: '📅', desc: 'Heavy rain or dry spell ahead' },
  { key: 'soil', label: 'Soil moisture', icon: '🌱', desc: 'Dry or waterlogged soil' },
  { key: 'market', label: 'Mandi prices', icon: '💰', desc: 'Today\'s price for your crop' },
  { key: 'plan', label: 'Crop plan', icon: '📋', desc: 'Tasks due and plan changes' },
];
const ALL_ON: Prefs = { weather: true, forecast: true, soil: true, market: true, plan: true, push: false };
const SEVERITY_STYLE: Record<Severity, { bar: string; chip: string; label: string }> = {
  alert: { bar: '#C0392B', chip: 'bg-red-500/10 text-red-400 border-red-500/30', label: 'Alert' },
  warn: { bar: '#E09B12', chip: 'bg-amber-500/15 text-amber-400 border-amber-500/40', label: 'Warning' },
  info: { bar: '#3A86C8', chip: 'bg-blue-500/10 text-blue-400 border-blue-500/30', label: 'Info' },
  good: { bar: '#2F7D32', chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', label: 'Good news' },
};
const ORDER: Record<Severity, number> = { alert: 0, warn: 1, info: 2, good: 3 };

const load = <T,>(key: string, fallback: T): T => {
  try { const v = localStorage.getItem(key); return v ? { ...fallback, ...JSON.parse(v) } : fallback; } catch { return fallback; }
};
const save = (key: string, v: unknown) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage blocked */ } };
const today = () => new Date().toISOString().slice(0, 10);
const clock = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export default function NotificationCenter() {
  const { location } = useFarmLocation();
  const [crop, setCrop] = useState<string>(() => (window as any).__farmContext?.crop ?? 'Rice');
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'list' | 'settings'>('list');
  const [prefs, setPrefs] = useState<Prefs>(() => load('notifPrefs', ALL_ON));
  const [readIds, setReadIds] = useState<Record<string, true>>(() => load('notifRead', {}));
  const [plans, setPlans] = useState<any[]>([]);
  const [toast, setToast] = useState<Notice | null>(null);
  const [pushState, setPushState] = useState<NotificationPermission | 'unsupported'>(
    () => ('Notification' in window ? Notification.permission : 'unsupported'));
  const boxRef = useRef<HTMLDivElement>(null);
  const announced = useRef<Set<string> | null>(null);

  useEffect(() => {
    const onCtx = (e: any) => e.detail?.crop && setCrop(e.detail.crop);
    window.addEventListener('updateFarmContext', onCtx);
    return () => window.removeEventListener('updateFarmContext', onCtx);
  }, []);

  useEffect(() => save('notifPrefs', prefs), [prefs]);
  useEffect(() => save('notifRead', readIds), [readIds]);

  // Live sources (the backend caches these, so sharing them with other pages is cheap).
  const loc = qs({ lat: location.lat, lon: location.lon });
  const weather = useLive<LiveWeather>(`/api/live/weather?${loc}`, 10 * 60 * 1000);
  // Price scope widens when nothing is reported: my state → South India → All India.
  const [scope, setScope] = useState<'state' | 'south' | 'india'>('state');
  useEffect(() => { setScope('state'); }, [crop, location.state]);
  const mandi = useLive<MandiData>(prefs.market
    ? `/api/live/mandi?${qs({ crop, state: scope === 'state' ? location.state : null, region: scope === 'south' ? 'south' : null, max_records: 40 })}`
    : null, 30 * 60 * 1000);
  useEffect(() => {
    if (!mandi.data || mandi.loading || mandi.data.count > 0) return;
    if (scope === 'state') setScope('south'); else if (scope === 'south') setScope('india');
  }, [mandi.data, mandi.loading, scope]);

  useEffect(() => {
    if (!prefs.plan) return;
    const fetchPlans = () => getJson<{ plans: any[] }>('/api/crop-plans').then(d => setPlans(d.plans || [])).catch(() => {});
    fetchPlans();
    const t = window.setInterval(fetchPlans, 2 * 60 * 1000);
    return () => window.clearInterval(t);
  }, [prefs.plan]);

  // ── Build notifications from live data ──
  const notices = useMemo<Notice[]>(() => {
    const out: Notice[] = [];
    const d = today();
    const wx = weather.data;
    const t = clock();
    if (wx) {
      const day0 = wx.daily[0];
      const rainChance = Math.max(wx.current.rain_probability ?? 0, day0?.rain_probability ?? 0);
      if (/thunder/i.test(day0?.label ?? '') || /thunder/i.test(wx.current.label)) {
        out.push({ id: `${d}-storm`, category: 'weather', severity: 'alert', icon: '⛈️', time: t, nav: 'nav-dashboard',
          title: 'Thunderstorm expected today', body: 'Stay out of open fields during lightning. Secure loose sheets and keep animals sheltered.' });
      }
      if (rainChance >= 60 || (day0?.rain_mm ?? 0) >= 10) {
        out.push({ id: `${d}-rain`, category: 'weather', severity: 'warn', icon: '🌧️', time: t, nav: 'nav-dashboard',
          title: `Rain today (${rainChance}% chance, ${day0?.rain_mm ?? 0} mm)`, body: 'Skip irrigation and do not apply fertilizer or pesticide today — rain will wash it away.' });
      }
      if ((day0?.temp_max ?? 0) >= 38) {
        out.push({ id: `${d}-heat`, category: 'weather', severity: 'alert', icon: '🔥', time: t, nav: 'nav-dashboard',
          title: `Heat alert: ${Math.round(day0!.temp_max)}°C today`, body: 'Water early morning or evening. Mulch young plants and give animals shade and water.' });
      }
      if ((day0?.wind_max ?? 0) >= 25) {
        out.push({ id: `${d}-wind`, category: 'weather', severity: 'warn', icon: '💨', time: t, nav: 'nav-dashboard',
          title: `Strong wind up to ${Math.round(day0!.wind_max)} km/h`, body: 'Do not spray today — the spray will drift. Support tall crops like banana and sugarcane.' });
      }
      if (wx.current.humidity >= 85 && wx.current.temperature >= 24) {
        out.push({ id: `${d}-fungus`, category: 'weather', severity: 'warn', icon: '🍄', time: t, nav: 'nav-dashboard',
          title: `High humidity (${wx.current.humidity}%) — fungus risk`, body: 'Check leaves for spots or blight. Keep field drains open and avoid evening irrigation.' });
      }
      if (!out.some(n => n.category === 'weather')) {
        out.push({ id: `${d}-fine`, category: 'weather', severity: 'good', icon: '☀️', time: t, nav: 'nav-dashboard',
          title: `Good weather today (${Math.round(wx.current.temperature)}°C)`, body: day0?.advice.join(' · ') ?? 'Normal field work.' });
      }

      // Coming days
      const next = wx.daily.slice(1, 4);
      const heavy = next.find(x => x.rain_mm >= 20);
      if (heavy) {
        const i = wx.daily.indexOf(heavy);
        out.push({ id: `${d}-heavy-${heavy.date}`, category: 'forecast', severity: 'warn', icon: '🌊', time: t, nav: 'nav-dashboard',
          title: `Heavy rain ${dayName(heavy.date, i)} (${Math.round(heavy.rain_mm)} mm)`, body: 'Finish spraying and harvesting before then. Clear drains to avoid waterlogging.' });
      }
      const weekRain = wx.daily.reduce((s, x) => s + (x.rain_mm || 0), 0);
      if (weekRain < 2) {
        out.push({ id: `${d}-dry`, category: 'forecast', severity: 'warn', icon: '🏜️', time: t, nav: 'nav-dashboard',
          title: 'No rain expected for 7 days', body: 'Plan irrigation for the week. Mulching helps keep soil moisture.' });
      }
      const hot = next.find(x => x.temp_max >= 38);
      if (hot) {
        out.push({ id: `${d}-hot-${hot.date}`, category: 'forecast', severity: 'warn', icon: '🌡️', time: t, nav: 'nav-dashboard',
          title: `Heat coming ${dayName(hot.date, wx.daily.indexOf(hot))} (${Math.round(hot.temp_max)}°C)`, body: 'Irrigate the evening before and avoid field work at midday.' });
      }

      // Soil
      if (wx.soil.status === 'Dry') {
        out.push({ id: `${d}-soil-dry`, category: 'soil', severity: 'warn', icon: '🥀', time: t, nav: 'nav-dashboard',
          title: 'Soil is dry at root level', body: `Only ${Math.round((wx.soil.moisture_root ?? 0) * 100)}% water in the soil. Irrigate soon${rainChance >= 60 ? ' — unless today\'s rain arrives' : ''}.` });
      } else if (wx.soil.status === 'Wet') {
        out.push({ id: `${d}-soil-wet`, category: 'soil', severity: 'info', icon: '💧', time: t, nav: 'nav-dashboard',
          title: 'Soil is wet — no irrigation needed', body: `${Math.round((wx.soil.moisture_root ?? 0) * 100)}% water in the root zone. Watch for waterlogging in low patches.` });
      }
    }

    // Market
    const s = mandi.data?.summary;
    if (s && mandi.data) {
      out.push({ id: `${d}-price-${crop}-${s.median_modal}`, category: 'market', severity: 'info', icon: '💰', time: t, nav: 'nav-mospi',
        title: `${crop}: ${rupees(s.median_modal)}/quintal today`, body: `${mandi.data.region ?? location.state ?? 'India'} mandis report ${rupees(s.lowest)} – ${rupees(s.highest)} (${mandi.data.count} markets, Agmarknet).` });
    }

    // Crop plans
    for (const plan of plans) {
      for (const n of (plan.notifications ?? []).filter((x: any) => !x.read).slice(-5)) {
        out.push({ id: `plan-${plan.plan_id}-${n.notif_id}`, category: 'plan', severity: n.priority === 'high' ? 'alert' : n.priority === 'medium' ? 'warn' : 'info',
          icon: n.icon || '📋', time: new Date(n.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), nav: 'nav-crop-planning',
          title: `${plan.crop_name}: ${n.title}`, body: n.message });
      }
      const due = (plan.tasks ?? []).filter((x: any) => x.status === 'pending' && x.actual_date && x.actual_date <= d);
      if (due.length) {
        out.push({ id: `${d}-tasks-${plan.plan_id}-${due.length}`, category: 'plan', severity: due.some((x: any) => x.actual_date < d) ? 'warn' : 'info',
          icon: '✅', time: t, nav: 'nav-crop-planning',
          title: `${plan.crop_name}: ${due.length} task${due.length > 1 ? 's' : ''} due`, body: due.slice(0, 3).map((x: any) => x.task_name).join(' · ') });
      }
    }
    return out.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  }, [weather.data, mandi.data, plans, crop, location.state]);

  const visible = notices.filter(n => prefs[n.category]);
  const unread = visible.filter(n => !readIds[n.id]);
  const urgent = unread.some(n => n.severity === 'alert' || n.severity === 'warn');

  // Announce new important notices (in-app toast + optional phone/desktop alert).
  useEffect(() => {
    if (!weather.data) return;
    const ids = new Set(visible.map(n => n.id));
    if (announced.current === null) { announced.current = ids; return; } // don't spam on first load
    const fresh = visible.filter(n => !announced.current!.has(n.id) && !readIds[n.id]);
    fresh.forEach(n => announced.current!.add(n.id));
    const top = fresh.find(n => n.severity === 'alert' || n.severity === 'warn') ?? fresh[0];
    if (!top) return;
    setToast(top);
    window.setTimeout(() => setToast(cur => (cur?.id === top.id ? null : cur)), 6000);
    if (prefs.push && pushState === 'granted') {
      try { new Notification(`${top.icon} ${top.title}`, { body: top.body, tag: top.id, icon: '/favicon.svg' }); } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.map(n => n.id).join('|')]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const markRead = (id: string) => setReadIds(r => ({ ...r, [id]: true }));
  const markAll = () => setReadIds(r => ({ ...r, ...Object.fromEntries(visible.map(n => [n.id, true as const])) }));
  const openNotice = (n: Notice) => {
    markRead(n.id);
    if (n.nav) { document.getElementById(n.nav)?.click(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    setOpen(false);
  };

  const togglePush = async () => {
    if (pushState === 'unsupported') return;
    if (prefs.push) { setPrefs(p => ({ ...p, push: false })); return; }
    const perm = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    setPushState(perm);
    setPrefs(p => ({ ...p, push: perm === 'granted' }));
  };
  const allOn = CATEGORIES.every(c => prefs[c.key]);

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => { setOpen(o => !o); setView('list'); }}
        aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`}
        aria-expanded={open}
        className={`relative p-2 rounded-xl transition-colors ${open ? 'bg-emerald-500/10 text-emerald-400' : 'text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
      >
        {urgent ? <BellRing size={18} className="bell-shake" /> : <Bell size={18} />}
        {unread.length > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-cream flex items-center justify-center border-2 border-paper ${urgent ? 'bg-red-500' : 'bg-emerald-500'}`}>
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="chat-pop fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[390px] glass-card !rounded-2xl shadow-2xl overflow-hidden z-[60] text-neutral-100" style={{ transformOrigin: 'top right' }}>
          {view === 'list' ? (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                <div>
                  <h3 className="font-extrabold text-base" style={{ fontFamily: 'Baloo 2' }}>🔔 Farm alerts</h3>
                  <p className="text-[11px] text-neutral-500">{location.name} · {crop} · updates every 10 min</p>
                </div>
                <div className="flex items-center gap-1">
                  {unread.length > 0 && (
                    <button onClick={markAll} title="Mark all as read" className="p-2 rounded-lg text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10"><CheckCheck size={16} /></button>
                  )}
                  <button onClick={() => setView('settings')} title="Notification settings" className="p-2 rounded-lg text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10"><Settings size={16} /></button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {weather.loading && !weather.data && <p className="p-6 text-sm text-neutral-500 text-center">Checking live weather and prices…</p>}
                {weather.error && !weather.data && <p className="p-4 text-sm text-red-400">Live data unavailable: {weather.error}</p>}
                {weather.data && visible.length === 0 && (
                  <p className="p-6 text-sm text-neutral-500 text-center">All alerts are switched off. Open ⚙️ settings to turn them on.</p>
                )}
                {visible.map(n => {
                  const sev = SEVERITY_STYLE[n.severity];
                  const isRead = !!readIds[n.id];
                  return (
                    <button key={n.id} onClick={() => openNotice(n)}
                      className={`w-full text-left flex gap-3 px-4 py-3 border-b border-neutral-800 hover:bg-white/5 transition-colors relative ${isRead ? 'opacity-60' : ''}`}>
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r" style={{ background: sev.bar }} />
                      <span className="text-2xl leading-none mt-0.5">{n.icon}</span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="font-bold text-sm text-neutral-100 leading-snug">{n.title}</span>
                          {!isRead && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                        </span>
                        <span className="block text-xs text-neutral-400 mt-0.5 leading-relaxed">{n.body}</span>
                        <span className="flex items-center gap-2 mt-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${sev.chip}`}>{sev.label}</span>
                          <span className="text-[10px] text-neutral-500">{CATEGORIES.find(c => c.key === n.category)?.label} · {n.time}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {!prefs.push && pushState !== 'unsupported' && pushState !== 'denied' && (
                <button onClick={togglePush} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-emerald-400 hover:bg-emerald-500/10">
                  <Smartphone size={15} /> Also alert me on this device
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-800">
                <button onClick={() => setView('list')} className="p-1 rounded-lg hover:bg-white/5" aria-label="Back"><ChevronLeft size={18} /></button>
                <h3 className="font-extrabold text-base flex-1" style={{ fontFamily: 'Baloo 2' }}>Notification settings</h3>
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/5" aria-label="Close"><X size={16} /></button>
              </div>
              <div className="p-4 space-y-2">
                <button
                  onClick={() => setPrefs(p => ({ ...p, ...Object.fromEntries(CATEGORIES.map(c => [c.key, !allOn])) }))}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${allOn ? 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800' : 'bg-emerald-500 text-cream hover:bg-emerald-600'}`}>
                  {allOn ? 'Turn all off' : '🔔 Turn all notifications on'}
                </button>
                {CATEGORIES.map(c => (
                  <Toggle key={c.key} icon={c.icon} label={c.label} desc={c.desc} on={prefs[c.key]}
                    onChange={() => setPrefs(p => ({ ...p, [c.key]: !p[c.key] }))} />
                ))}
                <div className="rangoli-divider my-2" />
                <Toggle icon="📱" label="Phone / desktop alerts"
                  desc={pushState === 'unsupported' ? 'This browser does not support alerts'
                    : pushState === 'denied' ? 'Blocked — allow notifications for this site in browser settings'
                    : 'Pop-up alerts even when this tab is in the background'}
                  on={prefs.push} disabled={pushState === 'unsupported' || pushState === 'denied'} onChange={togglePush} />
              </div>
            </>
          )}
        </div>
      )}

      {/* New-alert toast */}
      {toast && !open && (
        <button onClick={() => { setToast(null); openNotice(toast); }}
          className="notification-toast fixed top-20 right-4 z-[70] w-[min(340px,calc(100vw-32px))] text-left glass-card !rounded-2xl shadow-2xl p-3 flex gap-3"
          style={{ borderLeft: `4px solid ${SEVERITY_STYLE[toast.severity].bar}` }}>
          <span className="text-2xl">{toast.icon}</span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-neutral-100">{toast.title}</span>
            <span className="block text-xs text-neutral-400 line-clamp-2">{toast.body}</span>
          </span>
        </button>
      )}
    </div>
  );
}

function Toggle({ icon, label, desc, on, onChange, disabled }: {
  icon: string; label: string; desc: string; on: boolean; onChange: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onChange} disabled={disabled} role="switch" aria-checked={on}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-neutral-800 bg-neutral-950/60 hover:border-emerald-400 text-left disabled:opacity-50">
      <span className="text-xl">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-neutral-100">{label}</span>
        <span className="block text-[11px] text-neutral-500">{desc}</span>
      </span>
      <span className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${on ? 'bg-emerald-500' : 'bg-neutral-700'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-cream shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

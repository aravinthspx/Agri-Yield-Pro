import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Leaf, Droplets, Thermometer, Sprout, AlertTriangle, CloudRain,
  CheckCircle, Loader2, MapPin, BarChart3, Layers, FlaskConical, Wind,
  Calendar, IndianRupee, ShieldAlert, RefreshCw, Info, ShieldCheck, Save,
  Trash2, Download, RotateCcw, ChevronDown, Wifi, WifiOff, Circle,
} from 'lucide-react';
import {
  ComposedChart, Area, Bar, BarChart, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { API_BASE } from '../config';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedPlan {
  id: number;
  name: string;
  crop: string;
  area: number;
  soil_ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  expected_yield: number;
  crop_health: string;
  created_at: string;
}

interface PredictionResult {
  expected_yield: number;
  unit: string;
  total_yield: number;
  crop_health: string;
  weather_risk: string;
  pest_risk: string;
  soil_score: number;
  ph_factor: number;
  temp_factor: number;
  nitrogen_factor: number;
  nutrients: Record<string, number>;
  tasks: { type: string; title: string; description: string }[];
}

interface HistoryPoint { month: string; actual: number; predicted: number; rainfall: number }
interface MarketPoint { month: string; price: number; msp: number }
interface CalendarPhase { phase: string; start: string; end: string; color: string }
interface CropComparison { crop: string; yield: number; potential: number; color: string }
interface PlanningCrop { name: string; icon: string; ph_range?: { min: number; max: number } }

type KpiKey = 'yield' | 'total' | 'health' | 'pest';

// ─── Constants & farmer-friendly helpers ─────────────────────────────────────

const DEFAULTS = { crop: 'Rice', area: 2.5, soilPh: 6.5, nitrogen: 80, phosphorus: 40, potassium: 45 };
const POPULAR_CROPS = ['Rice', 'Wheat', 'Maize', 'Cotton', 'Sugarcane', 'Groundnut', 'Tomato', 'Chickpea'];
const FALLBACK_LOCATION = { lat: 28.61, lon: 77.21, name: 'New Delhi (default)' };
const FARM_PALETTE = ['#2F7D32', '#F2A71B', '#F07F1A', '#8B5A2B', '#3A86C8', '#7E57C2', '#C0392B', '#558B2F'];

const TONE = {
  good: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: '#2F7D32' },
  warn: { text: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/40', dot: '#D98E0B' },
  bad: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: '#C0392B' },
  info: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: '#2B6CB0' },
};
type Tone = keyof typeof TONE;

const riskTone = (r: string): Tone => (r === 'Low' ? 'good' : r === 'Medium' ? 'warn' : 'bad');
const healthTone = (h: string): Tone => (h === 'Good' ? 'good' : h === 'Fair' ? 'warn' : 'bad');
const HEALTH_EMOJI: Record<string, string> = { Good: '😊', Fair: '😐', Poor: '😟' };

const toAcres = (ha: number) => ha * 2.471;
const tPerHaToQtlPerAcre = (t: number) => (t * 10) / 2.471;
const rupees = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const lakhs = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(2)} lakh` : rupees(n));
const sameCrop = (a: string, b: string) =>
  a.toLowerCase().replace(/\s*\(.*\)/, '') === b.toLowerCase().replace(/\s*\(.*\)/, '');

function getSeason(d = new Date()) {
  const m = d.getMonth() + 1;
  if (m >= 6 && m <= 10) return { name: 'Kharif', months: 'Jun – Oct', emoji: '🌧️' };
  if (m >= 11 || m <= 3) return { name: 'Rabi', months: 'Nov – Mar', emoji: '❄️' };
  return { name: 'Zaid', months: 'Mar – Jun', emoji: '☀️' };
}

function weatherAdvice(w: { temp: number; rainProb: number; windSpeed: number }) {
  if (w.rainProb >= 60) return { icon: '🌧️', text: 'Rain is likely — skip watering and fertilizer today.' };
  if (w.temp >= 36) return { icon: '🔥', text: 'Very hot — water early morning or evening only.' };
  if (w.windSpeed >= 25) return { icon: '💨', text: 'Strong wind — do not spray pesticide today.' };
  if (w.temp <= 10) return { icon: '🥶', text: 'Cold night ahead — protect young plants.' };
  return { icon: '☀️', text: 'Good weather for field work today.' };
}

function phStatus(ph: number, range = { min: 5.5, max: 7.5 }): { tone: Tone; label: string; tip: string } {
  if (ph < range.min) return { tone: 'warn', label: 'Too sour', tip: `Below ${range.min}. Add agricultural lime to raise pH.` };
  if (ph > range.max) return { tone: 'warn', label: 'Too salty', tip: `Above ${range.max}. Add gypsum or organic manure.` };
  return { tone: 'good', label: 'Just right', tip: `Ideal range for this crop is ${range.min} – ${range.max}.` };
}

const NUTRIENTS = [
  { key: 'n', label: 'Nitrogen', short: 'N', product: 'Urea', use: 'green leaves & growth', low: 60, high: 140, max: 200, color: '#2F7D32' },
  { key: 'p', label: 'Phosphorus', short: 'P', product: 'DAP', use: 'strong roots', low: 30, high: 80, max: 120, color: '#3A86C8' },
  { key: 'k', label: 'Potassium', short: 'K', product: 'MOP / Potash', use: 'grain filling & disease strength', low: 30, high: 90, max: 150, color: '#F07F1A' },
] as const;

function nutrientStatus(v: number, low: number, high: number): { tone: Tone; label: string } {
  if (v < low) return { tone: 'warn', label: 'Low' };
  if (v > high) return { tone: 'bad', label: 'Too much' };
  return { tone: 'good', label: 'Good' };
}

const PHASE_TIPS: [RegExp, string][] = [
  [/prep/i, 'Plough and level the field. Mix in farmyard manure or compost.'],
  [/sow|plant|transplant/i, 'Use certified seeds and treat them before sowing. Keep proper spacing.'],
  [/vegetat|growth|tiller/i, 'Remove weeds early. Give nitrogen in 2–3 small doses, not all at once.'],
  [/reprod|flower|grain|fruit/i, 'Do not let the field dry out. Check for pests twice a week.'],
  [/harvest/i, 'Harvest when most grains/fruits are mature. Dry well before storing or selling.'],
];
const phaseTip = (p: string) => PHASE_TIPS.find(([re]) => re.test(p))?.[1] ?? 'Follow local Krishi Vigyan Kendra advice for this stage.';

// ─── Small UI pieces ─────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div className="bg-paper border border-neutral-800 rounded-xl p-3 shadow-lg text-xs">
      <p className="text-neutral-400 mb-1.5 font-semibold">{label}</p>
      {payload.map((e: any, i: number) => (
        <p key={i} style={{ color: e.color }} className="font-semibold">
          {e.name}: {typeof e.value === 'number' ? e.value.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : e.value}
        </p>
      ))}
    </div>
  ) : null;

const CardTitle: React.FC<{ icon: React.ReactNode; title: string; sub?: string; tone?: string; right?: React.ReactNode }> = ({
  icon, title, sub, tone = 'text-emerald-400 bg-emerald-500/10', right,
}) => (
  <div className="flex items-start justify-between gap-3 mb-4">
    <div className="flex items-center gap-3 min-w-0">
      <div className={`p-2 rounded-xl shrink-0 ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-neutral-100 leading-tight" style={{ fontFamily: 'Baloo 2' }}>{title}</h2>
        {sub && <p className="text-sm text-neutral-500 truncate">{sub}</p>}
      </div>
    </div>
    {right}
  </div>
);

const Tag: React.FC<{ tone: Tone; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${TONE[tone].bg} ${TONE[tone].text} ${TONE[tone].border}`}>
    {children}
  </span>
);

const SliderField: React.FC<{
  id: string; label: React.ReactNode; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; suffix?: string; hint?: React.ReactNode; tag?: React.ReactNode;
}> = ({ id, label, value, min, max, step, onChange, suffix, hint, tag }) => (
  <div>
    <div className="flex items-center justify-between gap-2 mb-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-neutral-300">{label}</label>
      <div className="flex items-center gap-2">
        {tag}
        <div className="flex items-center rounded-lg border border-neutral-800 bg-white/0 focus-within:border-emerald-400">
          <input
            id={id} type="number" min={min} max={max} step={step} value={Number.isFinite(value) ? value : ''}
            onChange={e => { const v = parseFloat(e.target.value); if (Number.isFinite(v)) onChange(v); }}
            className="w-16 bg-transparent text-right text-sm font-bold text-neutral-100 px-2 py-1 outline-none"
          />
          {suffix && <span className="text-xs text-neutral-500 pr-2">{suffix}</span>}
        </div>
      </div>
    </div>
    <input
      type="range" className="farm-range" aria-label={typeof label === 'string' ? label : id}
      min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))}
    />
    {hint && <p className="text-xs text-neutral-500 mt-1">{hint}</p>}
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [planningCrops, setPlanningCrops] = useState<PlanningCrop[]>([]);
  const [showAllCrops, setShowAllCrops] = useState(false);

  // ── Farm inputs ──
  const [crop, setCrop] = useState(DEFAULTS.crop);
  const [area, setArea] = useState(DEFAULTS.area);
  const [soilPh, setSoilPh] = useState(DEFAULTS.soilPh);
  const [nitrogen, setNitrogen] = useState(DEFAULTS.nitrogen);
  const [phosphorus, setPhosphorus] = useState(DEFAULTS.phosphorus);
  const [potassium, setPotassium] = useState(DEFAULTS.potassium);
  const [autoUpdate, setAutoUpdate] = useState(true);

  // ── Weather & status ──
  const [weather, setWeather] = useState({ temp: 30, rainProb: 20, rainfall: 0, windSpeed: 12, humidity: 65 });
  const [locationName, setLocationName] = useState('Finding your location…');
  const [isWeatherLoading, setIsWeatherLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // ── Results ──
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<PredictionResult | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [openKpi, setOpenKpi] = useState<KpiKey | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'soil'>('plan');
  const [doneTasks, setDoneTasks] = useState<Set<string>>(new Set());

  // ── Secondary data ──
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [market, setMarket] = useState<MarketPoint[]>([]);
  const [calendar, setCalendar] = useState<CalendarPhase[]>([]);
  const [comparison, setComparison] = useState<CropComparison[]>([]);
  const [isLoadingSecondary, setIsLoadingSecondary] = useState(false);
  const [series, setSeries] = useState({ actual: true, predicted: true, rainfall: false });
  const [selectedPhase, setSelectedPhase] = useState(0);
  const [mospiSummary, setMospiSummary] = useState<any>(null);

  // ── Saved plans ──
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [toast, setToast] = useState('');

  const requestId = useRef(0);
  const weatherRef = useRef<HTMLDivElement>(null);
  const season = useMemo(() => getSeason(), []);
  const farmerName = useMemo(() => {
    try { return (JSON.parse(localStorage.getItem('user') || '{}').full_name || '').split(' ')[0]; } catch { return ''; }
  }, []);

  const showToast = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(''), 2500); };

  // ── API health ──
  const checkApi = useCallback(async () => {
    setApiStatus('checking');
    try {
      const r = await fetch(`${API_BASE}/api/health`);
      setApiStatus(r.ok ? 'online' : 'offline');
    } catch { setApiStatus('offline'); }
  }, []);
  useEffect(() => { checkApi(); }, [checkApi]);

  // ── Saved plans ──
  const fetchSavedPlans = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/saved-predictions`);
      const data = await res.json();
      setSavedPlans(data.plans || []);
    } catch (err) { console.error('Failed to fetch saved plans', err); }
  }, []);
  useEffect(() => { fetchSavedPlans(); }, [fetchSavedPlans]);

  const handleSavePlan = async () => {
    if (!results || !saveName.trim()) return;
    setIsSaving(true);
    try {
      await fetch(`${API_BASE}/api/saved-predictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName.trim(), crop, area, soil_ph: soilPh, nitrogen, phosphorus, potassium,
          expected_yield: results.expected_yield, crop_health: results.crop_health,
        }),
      });
      setSaveName('');
      setShowSaveModal(false);
      fetchSavedPlans();
      showToast('Saved! You can load it any time from "My saved fields".');
    } catch { showToast('Could not save. Please check the server is running.'); }
    finally { setIsSaving(false); }
  };

  const handleLoadPlan = (plan: SavedPlan) => {
    setCrop(plan.crop); setArea(plan.area); setSoilPh(plan.soil_ph);
    setNitrogen(plan.nitrogen); setPhosphorus(plan.phosphorus); setPotassium(plan.potassium);
    showToast(`Loaded "${plan.name}"`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeletePlan = async (plan: SavedPlan) => {
    if (!window.confirm(`Delete "${plan.name}"?`)) return;
    try {
      await fetch(`${API_BASE}/api/saved-predictions/${plan.id}`, { method: 'DELETE' });
      fetchSavedPlans();
    } catch (err) { console.error(err); }
  };

  const handleReset = () => {
    setCrop(DEFAULTS.crop); setArea(DEFAULTS.area); setSoilPh(DEFAULTS.soilPh);
    setNitrogen(DEFAULTS.nitrogen); setPhosphorus(DEFAULTS.phosphorus); setPotassium(DEFAULTS.potassium);
  };

  // ── Crops list ──
  useEffect(() => {
    fetch(`${API_BASE}/api/planning/crops`)
      .then(r => r.json())
      .then(data => { if (data.crops?.length) setPlanningCrops(data.crops); })
      .catch(() => {});
  }, []);

  const cropNames = useMemo(
    () => (planningCrops.length ? planningCrops.map(c => c.name).sort() : POPULAR_CROPS),
    [planningCrops],
  );
  const cropInfo = planningCrops.find(c => c.name === crop);
  const chipCrops = useMemo(() => {
    const base = POPULAR_CROPS.filter(c => cropNames.includes(c));
    return base.includes(crop) ? base : [...base, crop];
  }, [cropNames, crop]);
  const iconFor = (name: string) => planningCrops.find(c => c.name === name)?.icon ?? '🌱';

  const pickCrop = (name?: string) => {
    if (!name) return;
    const match = cropNames.find(c => sameCrop(c, name));
    if (match) setCrop(match);
  };

  // ── Weather ──
  const loadWeather = useCallback(() => {
    setIsWeatherLoading(true);
    const fetchFor = async (lat: number, lon: number, name: string) => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,relative_humidity_2m&timezone=auto`;
        const d = await (await fetch(url)).json();
        setWeather({
          temp: d.current.temperature_2m,
          rainProb: d.current.precipitation_probability ?? (d.current.precipitation > 0 ? 80 : 10),
          rainfall: d.current.precipitation,
          windSpeed: d.current.wind_speed_10m ?? 12,
          humidity: d.current.relative_humidity_2m ?? 65,
        });
        setLocationName(name);
      } catch {
        setLocationName('Weather unavailable — using typical values');
      } finally {
        setIsWeatherLoading(false);
      }
    };
    if (!navigator.geolocation) {
      fetchFor(FALLBACK_LOCATION.lat, FALLBACK_LOCATION.lon, FALLBACK_LOCATION.name);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) =>
        fetchFor(latitude, longitude, `Your farm (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`),
      () => fetchFor(FALLBACK_LOCATION.lat, FALLBACK_LOCATION.lon, `${FALLBACK_LOCATION.name} — allow location for your farm`),
      { timeout: 8000 },
    );
  }, []);
  useEffect(() => { loadWeather(); }, [loadWeather]);

  // ── MoSPI summary ──
  useEffect(() => {
    fetch(`${API_BASE}/api/official-data/dashboard-summary`)
      .then(res => res.json()).then(setMospiSummary).catch(() => {});
  }, []);

  // ── Share farm context with the AI chat box ──
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('updateFarmContext', {
      detail: {
        crop, area, soil_ph: soilPh, nitrogen, phosphorus, potassium,
        temperature: weather.temp, rain_probability: weather.rainProb,
      },
    }));
  }, [crop, area, soilPh, nitrogen, phosphorus, potassium, weather]);

  // ── Charts data per crop ──
  const fetchSecondaryData = useCallback(async (selectedCrop: string) => {
    setIsLoadingSecondary(true);
    try {
      const [h, m, c, cmp] = await Promise.all([
        fetch(`${API_BASE}/api/history/${encodeURIComponent(selectedCrop)}`).then(r => r.json()),
        fetch(`${API_BASE}/api/market/${encodeURIComponent(selectedCrop)}`).then(r => r.json()),
        fetch(`${API_BASE}/api/calendar/${encodeURIComponent(selectedCrop)}`).then(r => r.json()),
        fetch(`${API_BASE}/api/compare`).then(r => r.json()),
      ]);
      setHistory(h.history || []);
      setMarket(m.prices || []);
      setCalendar(c.phases || []);
      setComparison(cmp.crops || []);
      setSelectedPhase(0);
    } catch { /* keep previous data */ }
    finally { setIsLoadingSecondary(false); }
  }, []);
  useEffect(() => { fetchSecondaryData(crop); }, [crop, fetchSecondaryData]);

  // ── AI analysis ──
  const runAnalysis = useCallback(async () => {
    const id = ++requestId.current;
    setIsAnalyzing(true);
    setAnalysisError('');
    try {
      const res = await fetch(`${API_BASE}/api/predict/yield`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop, area, soil_ph: soilPh, nitrogen, phosphorus, potassium,
          temperature: weather.temp, rain_probability: weather.rainProb, rainfall_mm: weather.rainfall,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      if (id === requestId.current) setResults(data);
    } catch {
      if (id === requestId.current) setAnalysisError('Could not reach the AI server. Is the backend running on port 8000?');
    } finally {
      if (id === requestId.current) setIsAnalyzing(false);
    }
  }, [crop, area, soilPh, nitrogen, phosphorus, potassium, weather]);

  // Re-run automatically (debounced) whenever an input changes.
  useEffect(() => {
    if (!autoUpdate || isWeatherLoading || !(area > 0)) return;
    const t = window.setTimeout(runAnalysis, 500);
    return () => window.clearTimeout(t);
  }, [autoUpdate, isWeatherLoading, runAnalysis, area]);

  const taskKey = results?.tasks.map(t => t.title).join('|');
  useEffect(() => { setDoneTasks(new Set()); }, [taskKey]);

  // ── Derived values ──
  const advice = weatherAdvice(weather);
  const ph = phStatus(soilPh, cropInfo?.ph_range);
  const latestPrice = market.at(-1);
  const income = results && latestPrice ? results.total_yield * latestPrice.price : null;
  const avgYield = comparison.find(c => sameCrop(c.crop, crop))?.yield;
  const radarData = results ? Object.entries(results.nutrients).map(([k, v]) => ({ subject: k, value: v, fullMark: 100 })) : [];
  const tasksDone = results ? results.tasks.filter(t => doneTasks.has(t.title)).length : 0;
  const nutrientValues = { n: nitrogen, p: phosphorus, k: potassium };
  const nutrientSetters = { n: setNitrogen, p: setPhosphorus, k: setPotassium };

  const kpis: { key: KpiKey; label: string; value: string; sub: string; tone: Tone; icon: React.ReactNode; detail: React.ReactNode }[] = results ? [
    {
      key: 'yield', label: 'Expected harvest', icon: <Sprout size={18} />, tone: 'good',
      value: `${tPerHaToQtlPerAcre(results.expected_yield).toFixed(1)} qtl/acre`,
      sub: `${results.expected_yield} tonnes per hectare`,
      detail: <>
        Each acre of your {crop} field should give about <b>{tPerHaToQtlPerAcre(results.expected_yield).toFixed(1)} quintal</b>.
        {avgYield != null && <> The usual average is {tPerHaToQtlPerAcre(avgYield).toFixed(1)} qtl/acre, so you are{' '}
          <b className={results.expected_yield >= avgYield ? 'text-emerald-400' : 'text-amber-400'}>
            {results.expected_yield >= avgYield ? 'above average 👍' : 'below average — follow the to-do list to improve'}
          </b>.</>}
      </>,
    },
    {
      key: 'total', label: 'Total crop', icon: <Layers size={18} />, tone: 'info',
      value: `${(results.total_yield * 10).toFixed(0)} quintal`,
      sub: income ? `worth about ${lakhs(income)}` : `from ${area} ha`,
      detail: <>
        From {area} hectare ({toAcres(area).toFixed(1)} acre) you can expect <b>{results.total_yield} tonnes</b> ({(results.total_yield * 10).toFixed(0)} quintal).
        {income && latestPrice && <> At today's market price of {rupees(latestPrice.price / 10)}/quintal that is about <b>{lakhs(income)}</b>.</>}
      </>,
    },
    {
      key: 'health', label: 'Crop health', icon: <Leaf size={18} />, tone: healthTone(results.crop_health),
      value: `${HEALTH_EMOJI[results.crop_health] ?? ''} ${results.crop_health}`,
      sub: `Weather risk: ${results.weather_risk}`,
      detail: <>
        Based on your soil, fertilizer and today's weather, your crop looks <b>{results.crop_health.toLowerCase()}</b>.
        Weather risk is <b>{results.weather_risk.toLowerCase()}</b>. {advice.icon} {advice.text}
      </>,
    },
    {
      key: 'pest', label: 'Pest risk', icon: <ShieldAlert size={18} />, tone: riskTone(results.pest_risk),
      value: results.pest_risk, sub: `Soil score ${results.soil_score}/100`,
      detail: results.pest_risk === 'Low'
        ? <>Pest risk is low. Walk your field <b>once a week</b> and look under leaves for insects or spots.</>
        : results.pest_risk === 'Medium'
          ? <>Some risk. Check your field <b>twice a week</b>. Look for holes, yellow patches or insects. Keep weeds down.</>
          : <>High risk! <b>Check daily</b>. If you see damage, contact your nearest Krishi Vigyan Kendra before spraying.</>,
    },
  ] : [];
  const openKpiData = kpis.find(k => k.key === openKpi);

  return (
    <div className="min-h-screen text-neutral-100">
      <div className="px-4 md:px-6 py-6 max-w-[1500px] mx-auto">

        {/* ══ WELCOME BANNER ═══════════════════════════════════════════════════ */}
        <section className="farm-banner p-6 md:p-8 mb-6 shadow-lg">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-cream/20 text-cream text-xs font-bold tracking-wide">
                  {season.emoji} {season.name} season · {season.months}
                </span>
                <button
                  onClick={checkApi}
                  title="Click to check the AI server again"
                  className="px-3 py-1 rounded-full bg-cream/20 hover:bg-cream/30 text-cream text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  {apiStatus === 'online' ? <Wifi size={12} /> : apiStatus === 'offline' ? <WifiOff size={12} /> : <Loader2 size={12} className="animate-spin" />}
                  AI {apiStatus === 'online' ? 'ready' : apiStatus === 'offline' ? 'offline — tap to retry' : 'checking…'}
                </button>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-cream leading-tight" style={{ fontFamily: 'Baloo 2' }}>
                Namaste{farmerName ? `, ${farmerName}` : ''} 🙏
              </h1>
              <p className="text-cream/90 text-base mt-1">
                Here is how your <b>{iconFor(crop)} {crop}</b> field is doing today.
              </p>
            </div>

            <button
              onClick={() => weatherRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="text-left bg-cream/95 hover:bg-cream rounded-2xl p-4 shadow-md min-w-[260px] transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-3xl font-extrabold text-neutral-100">{isWeatherLoading ? '—' : `${Math.round(weather.temp)}°C`}</div>
                  <div className="text-xs text-neutral-500 flex items-center gap-1"><CloudRain size={12} /> {weather.rainProb}% rain chance</div>
                </div>
                <div className="flex-1 text-sm font-semibold text-neutral-200 leading-snug">{advice.icon} {advice.text}</div>
              </div>
              <div className="text-[11px] text-neutral-500 mt-2 flex items-center gap-1 truncate"><MapPin size={11} /> {locationName}</div>
            </button>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

          {/* ══ LEFT: YOUR FARM ════════════════════════════════════════════════ */}
          <aside className="xl:col-span-4 space-y-5">
            <div className="glass-card p-5">
              <CardTitle icon={<Leaf size={18} />} title="Tell us about your farm" sub="Change anything — results update by themselves" />

              {/* Crop chips */}
              <div className="mb-5">
                <div className="text-sm font-semibold text-neutral-300 mb-2">Which crop?</div>
                <div className="flex flex-wrap gap-2">
                  {chipCrops.map(c => (
                    <button key={c} className={`chip ${crop === c ? 'active' : ''}`} onClick={() => setCrop(c)} aria-pressed={crop === c}>
                      <span>{iconFor(c)}</span>{c}
                    </button>
                  ))}
                  <button className="chip" onClick={() => setShowAllCrops(s => !s)} aria-expanded={showAllCrops}>
                    {showAllCrops ? 'Fewer' : `All ${cropNames.length}`} <ChevronDown size={14} className={showAllCrops ? 'rotate-180' : ''} />
                  </button>
                </div>
                {showAllCrops && (
                  <select id="crop-select" value={crop} onChange={e => setCrop(e.target.value)} className="farm-input mt-3">
                    {cropNames.map(c => <option key={c} value={c}>{iconFor(c)} {c}</option>)}
                  </select>
                )}
              </div>

              <div className="space-y-5">
                <SliderField
                  id="area-input" label="Land size" value={area} min={0.5} max={20} step={0.5} suffix="ha" onChange={setArea}
                  hint={<>≈ <b>{toAcres(area || 0).toFixed(1)} acre</b></>}
                />
                <SliderField
                  id="ph-input" label="Soil pH" value={soilPh} min={4} max={9} step={0.1} onChange={setSoilPh}
                  tag={<Tag tone={ph.tone}>{ph.label}</Tag>} hint={ph.tip}
                />

                <div className="rangoli-divider" />
                <div className="text-sm font-semibold text-neutral-300 -mb-2">Fertilizer already given (kg per hectare)</div>
                {NUTRIENTS.map(n => {
                  const v = nutrientValues[n.key];
                  const st = nutrientStatus(v, n.low, n.high);
                  return (
                    <SliderField
                      key={n.key} id={`${n.short.toLowerCase()}-input`} value={v} min={0} max={n.max} step={5}
                      onChange={nutrientSetters[n.key]}
                      label={<span><span className="font-extrabold" style={{ color: n.color }}>{n.short}</span> {n.label}</span>}
                      tag={<Tag tone={st.tone}>{st.label}</Tag>}
                      hint={<>{n.product} — for {n.use}</>}
                    />
                  );
                })}
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-2.5">
                <button
                  id="run-analysis-btn"
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-base text-cream bg-emerald-500 hover:bg-emerald-600 transition-all active:scale-[0.98] disabled:opacity-70 shadow-md"
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                  {isAnalyzing ? 'Checking your field…' : 'Check my harvest'}
                </button>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setShowSaveModal(true)}
                    disabled={!results}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-neutral-200 bg-white/5 hover:bg-emerald-500/10 hover:text-emerald-400 border border-neutral-800 transition-all disabled:opacity-50"
                  >
                    <Save size={15} /> Save
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-neutral-200 bg-white/5 hover:bg-amber-500/15 hover:text-amber-400 border border-neutral-800 transition-all"
                  >
                    <RotateCcw size={15} /> Reset
                  </button>
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-400 cursor-pointer select-none pt-1">
                  <input type="checkbox" checked={autoUpdate} onChange={e => setAutoUpdate(e.target.checked)} className="w-4 h-4 accent-[#2F7D32]" />
                  Update results automatically
                </label>
                {analysisError && <p className="text-sm text-red-400 flex items-start gap-1.5"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{analysisError}</p>}
              </div>
            </div>

            {/* Weather */}
            <div ref={weatherRef} className="glass-card p-5">
              <CardTitle
                icon={<Thermometer size={18} />} title="Today's weather" sub={locationName} tone="text-orange-400 bg-orange-500/10"
                right={
                  <button onClick={loadWeather} disabled={isWeatherLoading} title="Refresh weather"
                    className="p-2 rounded-lg text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                    <RefreshCw size={16} className={isWeatherLoading ? 'animate-spin' : ''} />
                  </button>
                }
              />
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Temperature', value: `${weather.temp}°C`, icon: <Thermometer size={16} />, color: '#E07A1F', note: weather.temp >= 36 ? 'Very hot' : weather.temp <= 12 ? 'Cold' : 'Normal' },
                  { label: 'Rain chance', value: `${weather.rainProb}%`, icon: <CloudRain size={16} />, color: '#3A86C8', note: weather.rainProb >= 60 ? 'Likely' : weather.rainProb >= 30 ? 'Maybe' : 'Unlikely' },
                  { label: 'Wind', value: `${weather.windSpeed} km/h`, icon: <Wind size={16} />, color: '#7E57C2', note: weather.windSpeed >= 25 ? 'No spraying' : 'Calm' },
                  { label: 'Humidity', value: `${weather.humidity}%`, icon: <Droplets size={16} />, color: '#2F7D32', note: weather.humidity >= 85 ? 'Fungus risk' : 'OK' },
                ].map(w => (
                  <div key={w.label} className="rounded-xl p-3 border border-neutral-800 bg-neutral-950/60">
                    <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: w.color }}>{w.icon}{w.label}</div>
                    <div className="text-xl font-extrabold text-neutral-100 mt-1">{isWeatherLoading ? '…' : w.value}</div>
                    <div className="text-xs text-neutral-500">{w.note}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Saved */}
            <div className="glass-card p-5">
              <CardTitle icon={<Save size={18} />} title="My saved fields" sub="Tap a field to load it" tone="text-blue-400 bg-blue-500/10" />
              {savedPlans.length === 0 ? (
                <p className="text-sm text-neutral-500">Nothing saved yet. Press <b>Save</b> after checking your harvest.</p>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {savedPlans.map(plan => (
                    <div key={plan.id} className="rounded-xl border border-neutral-800 hover:border-emerald-400 bg-neutral-950/60 transition-colors flex items-center">
                      <button onClick={() => handleLoadPlan(plan)} className="flex-1 text-left p-3 min-w-0">
                        <div className="font-bold text-sm text-neutral-100 truncate">{iconFor(plan.crop)} {plan.name}</div>
                        <div className="text-xs text-neutral-500">{plan.crop} · {plan.area} ha · {tPerHaToQtlPerAcre(plan.expected_yield).toFixed(1)} qtl/acre · {plan.crop_health}</div>
                      </button>
                      <button onClick={() => handleLoadPlan(plan)} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg" title="Load"><Download size={15} /></button>
                      <button onClick={() => handleDeletePlan(plan)} className="p-2 mr-1 text-red-400 hover:bg-red-500/10 rounded-lg" title="Delete"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* ══ RIGHT: RESULTS ═════════════════════════════════════════════════ */}
          <main className="xl:col-span-8 space-y-5">

            {/* KPI cards (tap to explain) */}
            <div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {results ? kpis.map(k => (
                  <button
                    key={k.key}
                    onClick={() => setOpenKpi(o => (o === k.key ? null : k.key))}
                    aria-expanded={openKpi === k.key}
                    className={`glass-card clickable-card p-4 text-left relative transition-all ${openKpi === k.key ? `ring-2 ring-offset-2 ring-offset-cream ${TONE[k.tone].border.replace('border-', 'ring-')}` : ''} ${isAnalyzing ? 'opacity-70' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-neutral-400">{k.label}</span>
                      <span className={`p-1.5 rounded-lg ${TONE[k.tone].bg} ${TONE[k.tone].text}`}>{k.icon}</span>
                    </div>
                    <div className={`text-2xl font-extrabold ${TONE[k.tone].text}`} style={{ fontFamily: 'Baloo 2' }}>{k.value}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">{k.sub}</div>
                    <div className="text-[11px] font-semibold text-neutral-500 mt-2 flex items-center gap-1">
                      <Info size={11} /> {openKpi === k.key ? 'Hide' : 'What does this mean?'}
                    </div>
                  </button>
                )) : [0, 1, 2, 3].map(i => <div key={i} className="glass-card p-5 h-32 shimmer" />)}
              </div>
              {openKpiData && (
                <div className={`mt-3 rounded-2xl border p-4 text-[15px] leading-relaxed text-neutral-200 animate-slide-up ${TONE[openKpiData.tone].bg} ${TONE[openKpiData.tone].border}`}>
                  {openKpiData.detail}
                </div>
              )}
            </div>

            {/* To-do + soil */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-7 glass-card p-5 flex flex-col">
                <CardTitle
                  icon={activeTab === 'plan' ? <CheckCircle size={18} /> : <FlaskConical size={18} />}
                  title={activeTab === 'plan' ? 'What to do next' : 'Soil nutrient balance'}
                  sub={activeTab === 'plan'
                    ? (results ? `${tasksDone} of ${results.tasks.length} done — tap when finished` : 'Your to-do list appears here')
                    : 'Closer to the edge = better'}
                  right={
                    <div className="flex gap-1 bg-neutral-900 rounded-lg p-0.5 shrink-0">
                      <button id="tab-plan" className={`tab-btn ${activeTab === 'plan' ? 'active' : ''}`} onClick={() => setActiveTab('plan')}>To-do</button>
                      <button id="tab-soil" className={`tab-btn ${activeTab === 'soil' ? 'active' : ''}`} onClick={() => setActiveTab('soil')}>Soil</button>
                    </div>
                  }
                />
                {activeTab === 'plan' ? (
                  <div className="space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight: 300 }}>
                    {results && results.tasks.length > 0 && (
                      <div className="progress-bar-track h-2 mb-3">
                        <div className="progress-bar-fill bg-emerald-500" style={{ width: `${(tasksDone / results.tasks.length) * 100}%` }} />
                      </div>
                    )}
                    {results ? results.tasks.map(task => {
                      const tone: Tone = task.type === 'warning' ? 'warn' : task.type === 'success' ? 'good' : 'info';
                      const done = doneTasks.has(task.title);
                      return (
                        <button
                          key={task.title}
                          onClick={() => setDoneTasks(s => { const n = new Set(s); if (n.has(task.title)) n.delete(task.title); else n.add(task.title); return n; })}
                          className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all ${TONE[tone].bg} ${TONE[tone].border} ${done ? 'opacity-55' : 'hover:-translate-y-0.5'}`}
                        >
                          <span className={`mt-0.5 shrink-0 ${done ? 'text-emerald-400' : TONE[tone].text}`}>
                            {done ? <CheckCircle size={20} /> : <Circle size={20} />}
                          </span>
                          <span>
                            <span className={`block font-bold text-[15px] ${TONE[tone].text} ${done ? 'line-through' : ''}`}>{task.title}</span>
                            <span className="block text-sm text-neutral-300 mt-0.5 leading-relaxed">{task.description}</span>
                          </span>
                        </button>
                      );
                    }) : (
                      <p className="text-sm text-neutral-500 py-8 text-center">Checking your field…</p>
                    )}
                    {results && results.tasks.length === 0 && <p className="text-sm text-emerald-400">✅ Everything looks fine. No action needed today.</p>}
                  </div>
                ) : results && radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(139,90,43,0.2)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#5C4633', fontSize: 12, fontWeight: 600 }} />
                      <Radar name="Score" dataKey="value" stroke="#2F7D32" fill="#2F7D32" fillOpacity={0.25} strokeWidth={2} />
                      <Tooltip content={<ChartTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-neutral-500 py-8 text-center">Run a check to see your soil balance.</p>}
              </div>

              {/* Soil score */}
              <div className="lg:col-span-5 glass-card p-5">
                <CardTitle icon={<FlaskConical size={18} />} title="Soil health" sub="Out of 100" tone="text-amber-400 bg-amber-500/15" />
                {results ? (
                  <>
                    <div className="flex items-center justify-center mb-4">
                      <div className="relative w-32 h-32">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="#EFE6D2" strokeWidth="10" />
                          <circle
                            cx="50" cy="50" r="40" fill="none" strokeWidth="10" strokeLinecap="round"
                            stroke={results.soil_score > 70 ? '#2F7D32' : results.soil_score > 45 ? '#F2A71B' : '#C0392B'}
                            strokeDasharray={`${(results.soil_score / 100) * 251.2} 251.2`}
                            style={{ transition: 'stroke-dasharray 1s ease' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-extrabold text-neutral-100" style={{ fontFamily: 'Baloo 2' }}>{results.soil_score}</span>
                          <span className="text-xs font-semibold text-neutral-500">
                            {results.soil_score > 70 ? 'Healthy' : results.soil_score > 45 ? 'Needs care' : 'Weak'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: 'pH balance', value: results.ph_factor, color: '#2F7D32' },
                        { label: 'Temperature fit', value: results.temp_factor, color: '#E07A1F' },
                        { label: 'Nitrogen level', value: results.nitrogen_factor, color: '#3A86C8' },
                      ].map(f => (
                        <div key={f.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-neutral-400 font-medium">{f.label}</span>
                            <span className="font-bold text-neutral-200">{f.value}%</span>
                          </div>
                          <div className="progress-bar-track h-2">
                            <div className="progress-bar-fill" style={{ width: `${f.value}%`, background: f.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div className="h-48 shimmer rounded-xl" />}
              </div>
            </div>

            {/* Yield trend */}
            <div className="glass-card p-5">
              <CardTitle
                icon={<BarChart3 size={18} />} title="Harvest over the last 12 months" sub={`${crop} — tonnes per hectare`}
                right={
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {isLoadingSecondary && <Loader2 size={16} className="animate-spin text-neutral-500 self-center" />}
                    {([['actual', 'Actual'], ['predicted', 'AI forecast'], ['rainfall', 'Rainfall']] as const).map(([k, l]) => (
                      <button key={k} className={`chip !py-1 !px-3 !text-xs ${series[k] ? 'active' : ''}`}
                        onClick={() => setSeries(s => ({ ...s, [k]: !s[k] }))} aria-pressed={series[k]}>{l}</button>
                    ))}
                  </div>
                }
              />
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={history} margin={{ top: 5, right: series.rainfall ? 0 : 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2F7D32" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2F7D32" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,90,43,0.12)" />
                  <XAxis dataKey="month" tick={{ fill: '#857059', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="y" tick={{ fill: '#857059', fontSize: 12 }} axisLine={false} tickLine={false} />
                  {series.rainfall && <YAxis yAxisId="rain" orientation="right" tick={{ fill: '#3A86C8', fontSize: 11 }} axisLine={false} tickLine={false} unit="mm" />}
                  <Tooltip content={<ChartTooltip />} />
                  {series.rainfall && <Bar yAxisId="rain" dataKey="rainfall" name="Rainfall (mm)" fill="#3A86C8" opacity={0.35} radius={[4, 4, 0, 0]} />}
                  {series.actual && <Area yAxisId="y" type="monotone" dataKey="actual" name="Actual" stroke="#2F7D32" strokeWidth={2.5} fill="url(#actualGrad)" dot={false} />}
                  {series.predicted && <Area yAxisId="y" type="monotone" dataKey="predicted" name="AI forecast" stroke="#F07F1A" strokeWidth={2} fill="none" dot={false} strokeDasharray="5 4" />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Market + compare + stages */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-5 glass-card p-5">
                <CardTitle icon={<IndianRupee size={18} />} title="Mandi price" sub={`${crop} — ₹ per quintal`} tone="text-amber-400 bg-amber-500/15" />
                {latestPrice && (
                  <div className={`rounded-xl border p-3 mb-3 text-sm ${latestPrice.price >= latestPrice.msp ? `${TONE.good.bg} ${TONE.good.border}` : `${TONE.warn.bg} ${TONE.warn.border}`}`}>
                    <div className="font-bold text-neutral-100">
                      Now {rupees(latestPrice.price / 10)}/qtl · MSP {rupees(latestPrice.msp / 10)}/qtl
                    </div>
                    <div className="text-neutral-300">
                      {latestPrice.price >= latestPrice.msp
                        ? `📈 Market is ${(((latestPrice.price - latestPrice.msp) / latestPrice.msp) * 100).toFixed(0)}% above MSP — a good time to sell.`
                        : '📉 Market is below MSP — consider selling at a government procurement centre.'}
                    </div>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={170}>
                  <LineChart data={market.map(m => ({ ...m, price: m.price / 10, msp: m.msp / 10 }))} margin={{ top: 5, right: 10, left: -5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,90,43,0.12)" />
                    <XAxis dataKey="month" tick={{ fill: '#857059', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#857059', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="price" name="Market ₹/qtl" stroke="#E09B12" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="msp" name="MSP ₹/qtl" stroke="#C0392B" strokeWidth={1.5} dot={false} strokeDasharray="5 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="lg:col-span-4 glass-card p-5">
                <CardTitle icon={<BarChart3 size={18} />} title="Compare crops" sub="Tap a bar to switch crop" tone="text-blue-400 bg-blue-500/10" />
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={comparison} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="crop" width={90} tick={{ fill: '#5C4633', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false}
                      tickFormatter={(v: string) => v.replace(/\s*\(.*\)/, '')} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(139,90,43,0.06)' }} />
                    {avgYield != null && <ReferenceLine x={avgYield} stroke="#2F7D32" strokeDasharray="3 3" />}
                    <Bar dataKey="yield" name="t/ha" radius={[0, 6, 6, 0]} cursor="pointer" onClick={(d: any) => pickCrop(d?.payload?.crop ?? d?.crop)}>
                      {comparison.map((e, i) => (
                        <Cell key={e.crop} fill={FARM_PALETTE[i % FARM_PALETTE.length]} opacity={sameCrop(e.crop, crop) ? 1 : 0.45} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="lg:col-span-3 glass-card p-5">
                <CardTitle icon={<Calendar size={18} />} title="Crop stages" sub="Tap a stage for tips" tone="text-pink-400 bg-pink-500/10" />
                <ol className="relative border-l-2 border-dashed border-neutral-700 ml-2 space-y-1">
                  {calendar.length ? calendar.map((p, i) => (
                    <li key={p.phase} className="pl-4 relative">
                      <span className="absolute -left-[7px] top-3 w-3 h-3 rounded-full border-2 border-paper"
                        style={{ background: FARM_PALETTE[i % FARM_PALETTE.length] }} />
                      <button onClick={() => setSelectedPhase(i)}
                        className={`w-full text-left rounded-lg px-2 py-1.5 transition-colors ${selectedPhase === i ? 'bg-emerald-500/10' : 'hover:bg-white/5'}`}>
                        <div className={`text-sm font-bold ${selectedPhase === i ? 'text-emerald-400' : 'text-neutral-200'}`}>{p.phase}</div>
                        <div className="text-xs text-neutral-500">{p.start === p.end ? p.start : `${p.start} – ${p.end}`}</div>
                        {selectedPhase === i && <div className="text-xs text-neutral-300 mt-1 leading-relaxed">{phaseTip(p.phase)}</div>}
                      </button>
                    </li>
                  )) : Array(5).fill(0).map((_, i) => <li key={i} className="h-9 rounded-lg shimmer ml-3 mb-1" />)}
                </ol>
              </div>
            </div>

            {/* MoSPI */}
            {mospiSummary && (
              <div className="glass-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-bold text-neutral-100" style={{ fontFamily: 'Baloo 2' }}>🇮🇳 India farm output</h2>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold uppercase">
                      <ShieldCheck size={11} /> MoSPI official
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500">
                    Value of all crops in {mospiSummary.latest_year}: <b className="text-neutral-200">{mospiSummary.total_value.toLocaleString('en-IN')} {mospiSummary.unit}</b>
                    {' '}· growing <b className="text-emerald-400">{mospiSummary.cagr}% a year</b>
                  </p>
                </div>
                <button onClick={() => document.getElementById('nav-mospi')?.click()}
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-cream text-sm font-bold transition-colors">
                  See state-wise data →
                </button>
              </div>
            )}
          </main>
        </div>

        <div className="rangoli-divider mt-8" />
        <footer className="mt-3 text-center text-xs text-neutral-500 pb-4">
          Agri-Yield Pro · Made for Indian farmers 🌾 · Weather by Open-Meteo · Prices are indicative
        </footer>
      </div>

      {/* Save modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowSaveModal(false)}>
          <form
            className="glass-card w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
            onSubmit={e => { e.preventDefault(); handleSavePlan(); }}
          >
            <h3 className="text-xl font-bold text-neutral-100 mb-1" style={{ fontFamily: 'Baloo 2' }}>Save this field</h3>
            <p className="text-sm text-neutral-500 mb-4">Give it a name so you can find it later.</p>
            <input
              type="text" placeholder={`e.g. ${crop} — north field`} className="farm-input mb-5"
              value={saveName} onChange={e => setSaveName(e.target.value)} autoFocus
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowSaveModal(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-neutral-400 hover:bg-white/5">
                Cancel
              </button>
              <button type="submit" disabled={isSaving || !saveName.trim()}
                className="px-4 py-2 rounded-xl text-sm font-bold text-cream bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2">
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-neutral-100 text-cream text-sm font-semibold shadow-lg notification-toast">
          {toast}
        </div>
      )}
    </div>
  );
}

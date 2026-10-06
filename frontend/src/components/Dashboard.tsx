import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Leaf, Droplets, Thermometer, Sprout, AlertTriangle, CloudRain,
  Activity, CheckCircle, Loader2, MapPin, TrendingUp, TrendingDown,
  BarChart3, Layers, FlaskConical, Sun, Wind, Calendar, DollarSign,
  ShieldAlert, Wheat, Zap, ArrowUpRight, ArrowDownRight, RefreshCw,
  ChevronRight, Info, ShieldCheck, Save, Trash2, Download, Globe2
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import Landscape3D from './Landscape3D/Landscape3D';

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

interface HistoryPoint {
  month: string;
  actual: number;
  predicted: number;
  rainfall: number;
}

interface MarketPoint {
  month: string;
  price: number;
  msp: number;
}

interface CalendarPhase {
  phase: string;
  start: string;
  end: string;
  color: string;
}

interface CropComparison {
  crop: string;
  yield: number;
  potential: number;
  color: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const RISK_COLOR: Record<string, string> = {
  Low: 'text-emerald-400', Medium: 'text-yellow-400', High: 'text-red-400',
};
const HEALTH_COLOR: Record<string, string> = {
  Good: 'text-emerald-400', Fair: 'text-yellow-400', Poor: 'text-red-400',
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0d1117] border border-white/10 rounded-xl p-3 shadow-2xl text-xs">
        <p className="text-neutral-400 mb-2 font-medium">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="font-semibold">
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  glow?: string;
  trend?: 'up' | 'down' | null;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon, color, glow, trend }) => (
  <div
    className="glass-card p-5 relative overflow-hidden group cursor-default"
    style={{ boxShadow: glow ? `0 0 40px -10px ${glow}` : undefined }}
  >
    <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-20 ${color.replace('text-', 'bg-')}`} />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-neutral-500 text-xs font-medium uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg bg-white/5 ${color}`}>{icon}</div>
      </div>
      <div className={`text-3xl font-bold mb-1 ${color} metric-glow-green`}>{value}</div>
      {sub && (
        <div className="flex items-center gap-1 text-xs text-neutral-500">
          {trend === 'up' && <ArrowUpRight size={12} className="text-emerald-400" />}
          {trend === 'down' && <ArrowDownRight size={12} className="text-red-400" />}
          {sub}
        </div>
      )}
    </div>
  </div>
);

// ─── Progress Bar ─────────────────────────────────────────────────────────────

const FactorBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div>
    <div className="flex justify-between text-xs mb-1.5">
      <span className="text-neutral-400 font-medium">{label}</span>
      <span className="font-semibold text-neutral-200">{value}%</span>
    </div>
    <div className="progress-bar-track h-1.5">
      <div
        className="progress-bar-fill"
        style={{ width: `${value}%`, background: color, boxShadow: `0 0 8px ${color}60` }}
      />
    </div>
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; sub?: string; color?: string }> = ({
  icon, title, sub, color = 'text-emerald-400',
}) => (
  <div className="flex items-center gap-3 mb-5">
    <div className={`p-2 rounded-xl bg-white/5 ${color}`}>{icon}</div>
    <div>
      <h2 className="text-base font-semibold text-neutral-100">{title}</h2>
      {sub && <p className="text-xs text-neutral-500">{sub}</p>}
    </div>
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [availableCrops, setAvailableCrops] = useState<string[]>(['Rice', 'Wheat', 'Maize (Corn)', 'Sugarcane', 'Cotton']);
  // ── Farm Inputs ──
  const [crop, setCrop] = useState('Rice');
  const [area, setArea] = useState(2.5);
  const [soilPh, setSoilPh] = useState(6.5);
  const [nitrogen, setNitrogen] = useState(80);
  const [phosphorus, setPhosphorus] = useState(40);
  const [potassium, setPotassium] = useState(45);

  // ── Weather ──
  const [weather, setWeather] = useState({ temp: 30, rainProb: 20, rainfall: 0, windSpeed: 12, humidity: 65 });
  const [locationName, setLocationName] = useState('Detecting location...');
  const [isWeatherLoading, setIsWeatherLoading] = useState(true);

  // ── Results ──
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<PredictionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'plan' | 'soil'>('plan');

  // ── Secondary Data ──
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [market, setMarket] = useState<MarketPoint[]>([]);
  const [calendar, setCalendar] = useState<CalendarPhase[]>([]);
  const [comparison, setComparison] = useState<CropComparison[]>([]);
  const [isLoadingSecondary, setIsLoadingSecondary] = useState(false);

  // ── MoSPI Data ──
  const [mospiSummary, setMospiSummary] = useState<any>(null);

  // ── Saved Plans ──
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  
  // ── 3D Map State removed ──

  const prevCrop = useRef(crop);

  // ── Fetch Saved Plans ──
  const fetchSavedPlans = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/saved-predictions`);
      const data = await res.json();
      setSavedPlans(data.plans || []);
    } catch (err) {
      console.error("Failed to fetch saved plans", err);
    }
  }, []);

  useEffect(() => {
    fetchSavedPlans();
  }, [fetchSavedPlans]);

  const handleSavePlan = async () => {
    if (!results || !saveName) return;
    setIsSaving(true);
    try {
      await fetch(`${API_BASE}/api/saved-predictions`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName,
          crop,
          area,
          soil_ph: soilPh,
          nitrogen,
          phosphorus,
          potassium,
          expected_yield: results.expected_yield,
          crop_health: results.crop_health,
        })
      });
      setSaveName("");
      setShowSaveModal(false);
      fetchSavedPlans();
    } catch (err) {
      alert("Failed to save plan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadPlan = (plan: SavedPlan) => {
    setCrop(plan.crop);
    setArea(plan.area);
    setSoilPh(plan.soil_ph);
    setNitrogen(plan.nitrogen);
    setPhosphorus(plan.phosphorus);
    setPotassium(plan.potassium);
  };

  const handleDeletePlan = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/saved-predictions/${id}`, { method: "DELETE" });
      fetchSavedPlans();
    } catch (err) {
      console.error(err);
    }
  };

  // ── Fetch Available Crops ──
  useEffect(() => {
    fetch(`${API_BASE}/api/planning/crops`)
      .then(r => r.json())
      .then(data => {
        if (data.crops && data.crops.length > 0) {
          const names = data.crops.map((c: any) => c.name).sort();
          setAvailableCrops(names);
        }
      })
      .catch(() => {});
  }, []);

  // ── Fetch Weather ──
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationName('Geolocation not supported');
      setIsWeatherLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,precipitation,precipitation_probability,wind_speed_10m,relative_humidity_2m&timezone=auto`;
          const res = await fetch(url);
          const d = await res.json();
          setLocationName(`Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}`);
          setWeather({
            temp: d.current.temperature_2m,
            rainProb: d.current.precipitation_probability ?? (d.current.precipitation > 0 ? 80 : 10),
            rainfall: d.current.precipitation,
            windSpeed: d.current.wind_speed_10m ?? 12,
            humidity: d.current.relative_humidity_2m ?? 65,
          });
        } catch {
          setLocationName('Default: New Delhi, India');
        } finally {
          setIsWeatherLoading(false);
        }
      },
      () => {
        setLocationName('Location blocked — Default: New Delhi, India');
        setIsWeatherLoading(false);
      }
    );
  }, []);

  // ── Fetch MoSPI Summary ──
  useEffect(() => {
    fetch(`${API_BASE}/api/official-data/dashboard-summary`)
      .then(res => res.json())
      .then(data => setMospiSummary(data))
      .catch(() => {});
  }, []);

  // ── Dispatch Farm Context to AIChatBox ──
  useEffect(() => {
    const event = new CustomEvent('updateFarmContext', {
      detail: {
        crop,
        area,
        soil_ph: soilPh,
        nitrogen,
        phosphorus,
        potassium,
        temperature: weather.temp,
        rain_probability: weather.rainProb,
      }
    });
    window.dispatchEvent(event);
  }, [crop, area, soilPh, nitrogen, phosphorus, potassium, weather]);

  // ── Fetch Secondary Data when crop changes ──
  const fetchSecondaryData = useCallback(async (selectedCrop: string) => {
    setIsLoadingSecondary(true);
    try {
      const [histRes, mktRes, calRes, cmpRes] = await Promise.all([
        fetch(`${API_BASE}/api/history/${selectedCrop}`),
        fetch(`${API_BASE}/api/market/${selectedCrop}`),
        fetch(`${API_BASE}/api/calendar/${selectedCrop}`),
        fetch(`${API_BASE}/api/compare`),
      ]);
      const [histData, mktData, calData, cmpData] = await Promise.all([
        histRes.json(), mktRes.json(), calRes.json(), cmpRes.json(),
      ]);
      setHistory(histData.history);
      setMarket(mktData.prices);
      setCalendar(calData.phases);
      setComparison(cmpData.crops);
    } catch {
      // silently fail — show empty state
    } finally {
      setIsLoadingSecondary(false);
    }
  }, []);

  useEffect(() => {
    fetchSecondaryData(crop);
  }, [crop, fetchSecondaryData]);

  // ── Run AI Analysis ──
  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/api/predict/yield`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop, area, soil_ph: soilPh, nitrogen, phosphorus, potassium,
          temperature: weather.temp, rain_probability: weather.rainProb,
          rainfall_mm: weather.rainfall,
        }),
      });
      setResults(await res.json());
    } catch {
      alert('Failed to connect to the AI Backend. Ensure the FastAPI server is running on port 8000.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Nutrient Radar Data ──
  const radarData = results
    ? Object.entries(results.nutrients).map(([key, val]) => ({ subject: key, value: val, fullMark: 100 }))
    : [];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #050a0e 0%, #061020 50%, #050a0e 100%)' }}>
      {/* ── Ambient Background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.04) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 px-6 py-6 max-w-[1600px] mx-auto">

        {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.1))', border: '1px solid rgba(52,211,153,0.2)' }}>
              <Sprout className="text-emerald-400 animate-float" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold gradient-text-emerald" style={{ fontFamily: 'Space Grotesk' }}>
                Agri-Yield Pro
              </h1>
              <p className="text-neutral-500 text-sm mt-0.5">AI-Powered Crop Intelligence Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* AI Status */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-neutral-300 font-medium text-xs">AI Engine Online</span>
            </div>
            {/* Weather widget */}
            {!isWeatherLoading && (
              <div className="flex items-center gap-3 px-4 py-2 rounded-full glass-card text-xs">
                <Sun size={14} className="text-yellow-400" />
                <span className="text-neutral-200 font-semibold">{weather.temp}°C</span>
                <span className="text-neutral-600">|</span>
                <CloudRain size={14} className="text-blue-400" />
                <span className="text-neutral-200 font-semibold">{weather.rainProb}%</span>
              </div>
            )}
            {/* Location */}
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-full glass-card text-xs text-neutral-500">
              <MapPin size={12} />
              <span className="max-w-[200px] truncate">{locationName}</span>
            </div>
          </div>
        </header>

        {/* ══ MAIN GRID ════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

          {/* ── LEFT SIDEBAR: Controls ─────────────────────────────────────── */}
          <aside className="xl:col-span-3 space-y-4">

            {/* Farm Parameters */}
            <div className="glass-card p-5">
              <SectionHeader icon={<Leaf size={18} />} title="Farm Parameters" sub="Configure your field inputs" />
              <div className="space-y-4 text-sm">
                <div>
                  <label className="text-neutral-500 text-xs font-medium uppercase tracking-wider block mb-1.5">Crop Type</label>
                  <select
                    value={crop}
                    onChange={e => setCrop(e.target.value)}
                    className="farm-input"
                    id="crop-select"
                  >
                    {availableCrops.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-neutral-500 text-xs font-medium uppercase tracking-wider block mb-1.5">Area (Ha)</label>
                    <input id="area-input" type="number" min={0.1} step={0.1} value={area}
                      onChange={e => setArea(parseFloat(e.target.value))} className="farm-input" />
                  </div>
                  <div>
                    <label className="text-neutral-500 text-xs font-medium uppercase tracking-wider block mb-1.5">Soil pH</label>
                    <input id="ph-input" type="number" min={4} max={9} step={0.1} value={soilPh}
                      onChange={e => setSoilPh(parseFloat(e.target.value))} className="farm-input" />
                  </div>
                </div>

                {/* NPK */}
                <div>
                  <label className="text-neutral-500 text-xs font-medium uppercase tracking-wider block mb-2">NPK (kg/ha)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'n-input', label: 'N', val: nitrogen, set: setNitrogen, color: '#34d399' },
                      { id: 'p-input', label: 'P', val: phosphorus, set: setPhosphorus, color: '#60a5fa' },
                      { id: 'k-input', label: 'K', val: potassium, set: setPotassium, color: '#f97316' },
                    ].map(({ id, label, val, set, color }) => (
                      <div key={label} className="relative">
                        <label className="block text-center text-xs font-bold mb-1" style={{ color }}>{label}</label>
                        <input id={id} type="number" min={0} value={val}
                          onChange={e => set(parseFloat(e.target.value))} className="farm-input text-center px-2" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Analyze Button */}
                <button
                  id="run-analysis-btn"
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{
                    background: isAnalyzing
                      ? 'rgba(52,211,153,0.2)'
                      : 'linear-gradient(135deg, #059669, #0d9488)',
                    boxShadow: isAnalyzing ? 'none' : '0 8px 24px rgba(5,150,105,0.25)',
                  }}
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                  {isAnalyzing ? 'Analyzing Fields...' : 'Run AI Analysis'}
                </button>
                {results && (
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-xs text-neutral-300 bg-white/5 hover:bg-white/10 hover:text-emerald-400 transition-all border border-white/5"
                  >
                    <Save size={14} />
                    Save This Prediction
                  </button>
                )}
              </div>
            </div>

            {/* Live Weather Panel */}
            <div className="glass-card p-5 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full blur-3xl" style={{ background: 'rgba(251,191,36,0.08)' }} />
              <SectionHeader icon={<Thermometer size={18} />} title="Live Weather" sub={locationName} color="text-orange-400" />
              {isWeatherLoading ? (
                <div className="flex justify-center p-6"><Loader2 className="animate-spin text-neutral-600" size={24} /></div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'w-temp', label: 'Temp', value: `${weather.temp}°C`, icon: <Thermometer size={16} />, color: '#f97316' },
                    { id: 'w-rain', label: 'Rain Prob.', value: `${weather.rainProb}%`, icon: <CloudRain size={16} />, color: '#60a5fa' },
                    { id: 'w-wind', label: 'Wind', value: `${weather.windSpeed} km/h`, icon: <Wind size={16} />, color: '#a78bfa' },
                    { id: 'w-humid', label: 'Humidity', value: `${weather.humidity}%`, icon: <Droplets size={16} />, color: '#34d399' },
                  ].map(({ id, label, value, icon, color }) => (
                    <div key={id} id={id} className="bg-white/3 rounded-xl p-3 border border-white/5 text-center">
                      <div className="flex justify-center mb-1" style={{ color }}>{icon}</div>
                      <div className="text-xs text-neutral-500 mb-0.5">{label}</div>
                      <div className="text-sm font-bold text-neutral-100">{value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Soil Health */}
            {results && (
              <div className="glass-card p-5 animate-slide-up">
                <SectionHeader icon={<FlaskConical size={18} />} title="Soil Health Score" color="text-amber-400" />
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-28 h-28">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                      <circle
                        cx="50" cy="50" r="40" fill="none"
                        stroke={results.soil_score > 70 ? '#34d399' : results.soil_score > 45 ? '#fbbf24' : '#f87171'}
                        strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${(results.soil_score / 100) * 251.2} 251.2`}
                        style={{ transition: 'stroke-dasharray 1s ease', filter: 'drop-shadow(0 0 6px currentColor)' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-neutral-100">{results.soil_score}</span>
                      <span className="text-xs text-neutral-500">/ 100</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <FactorBar label="pH Optimal" value={results.ph_factor} color="#34d399" />
                  <FactorBar label="Temperature" value={results.temp_factor} color="#f97316" />
                  <FactorBar label="Nitrogen Level" value={results.nitrogen_factor} color="#60a5fa" />
                </div>
              </div>
            )}

            {/* Saved Plans */}
            {savedPlans.length > 0 && (
              <div className="glass-card p-5">
                <SectionHeader icon={<Save size={18} />} title="Saved Predictions" color="text-blue-400" />
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {savedPlans.map(plan => (
                    <div key={plan.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col gap-2 relative group transition-all hover:border-blue-500/30">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-sm text-neutral-100">{plan.name}</div>
                          <div className="text-xs text-neutral-500">{plan.crop} · {plan.area} ha</div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => handleLoadPlan(plan)} className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Load parameters">
                            <Download size={14} />
                          </button>
                          <button onClick={() => handleDeletePlan(plan.id)} className="p-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs mt-1 border-t border-white/5 pt-2">
                        <span className="text-emerald-400 font-medium">Yield: {plan.expected_yield} t/ha</span>
                        <span className={HEALTH_COLOR[plan.crop_health] || 'text-yellow-400'}>{plan.crop_health}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
          <main className="xl:col-span-9 space-y-5">

            {/* ── TOP KPI ROW ── */}
            {results ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
                <StatCard
                  label="Expected Yield"
                  value={`${results.expected_yield}`}
                  sub={`${results.unit} — ${area} ha field`}
                  icon={<Activity size={18} />}
                  color="text-emerald-400"
                  glow="#34d399"
                  trend="up"
                />
                <StatCard
                  label="Total Production"
                  value={`${results.total_yield} t`}
                  sub={`across ${area} hectares`}
                  icon={<Layers size={18} />}
                  color="text-blue-400"
                  glow="#3b82f6"
                />
                <StatCard
                  label="Crop Health"
                  value={results.crop_health}
                  sub={`Weather risk: ${results.weather_risk}`}
                  icon={<Leaf size={18} />}
                  color={HEALTH_COLOR[results.crop_health] || 'text-yellow-400'}
                />
                <StatCard
                  label="Pest Risk"
                  value={results.pest_risk}
                  sub={`Soil score: ${results.soil_score}/100`}
                  icon={<ShieldAlert size={18} />}
                  color={RISK_COLOR[results.pest_risk] || 'text-yellow-400'}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[0,1,2,3].map(i => (
                  <div key={i} className="glass-card p-5 h-28 shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}

            {/* ── MoSPI INDIA AGRICULTURE SUMMARY ── */}
            {mospiSummary && (
              <div className="glass-card p-6 border border-blue-500/20 bg-blue-950/10 animate-slide-up relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <h2 className="text-lg font-bold text-white">India Agriculture — Official Statistics</h2>
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold tracking-wide uppercase">
                        <ShieldCheck size={12} /> MoSPI
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400">Historical Data: 2011-12 → 2023-24 (All Crops Value of Output)</p>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider mb-1">Latest ({mospiSummary.latest_year})</div>
                      <div className="text-2xl font-bold text-blue-400">
                        {mospiSummary.total_value.toLocaleString()} <span className="text-sm font-normal text-neutral-400">{mospiSummary.unit}</span>
                      </div>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <div className="text-right">
                      <div className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider mb-1">12-Yr CAGR</div>
                      <div className="text-xl font-bold text-emerald-400 flex items-center gap-1 justify-end">
                        +{mospiSummary.cagr}% <ArrowUpRight size={16} />
                      </div>
                    </div>
                    <button onClick={() => document.getElementById('nav-mospi')?.click()} className="ml-2 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                      Explore Statistics
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── MIDDLE ROW: Yield Chart + Plan/Soil ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* Yield History Chart */}
              <div className="lg:col-span-7 glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <SectionHeader icon={<BarChart3 size={18} />} title="12-Month Yield Trend" sub={`${crop} performance analysis`} />
                  {isLoadingSecondary && <Loader2 size={14} className="animate-spin text-neutral-600" />}
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={history} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                    <Area type="monotone" dataKey="actual" name="Actual" stroke="#34d399" strokeWidth={2} fill="url(#actualGrad)" dot={false} />
                    <Area type="monotone" dataKey="predicted" name="Predicted" stroke="#60a5fa" strokeWidth={2} fill="url(#predictedGrad)" dot={false} strokeDasharray="4 4" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Farming Plan / Nutrient Tabs */}
              <div className="lg:col-span-5 glass-card p-5 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-neutral-100">
                    {activeTab === 'plan' ? '🌿 Farming Plan' : '🧪 Nutrient Balance'}
                  </h3>
                  <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
                    <button id="tab-plan" className={`tab-btn ${activeTab === 'plan' ? 'active' : ''}`} onClick={() => setActiveTab('plan')}>Plan</button>
                    <button id="tab-soil" className={`tab-btn ${activeTab === 'soil' ? 'active' : ''}`} onClick={() => setActiveTab('soil')}>Soil</button>
                  </div>
                </div>

                {activeTab === 'plan' && (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ maxHeight: '250px' }}>
                    {results ? results.tasks.map((task, idx) => (
                      <div
                        key={idx}
                        className={`task-item flex items-start gap-3 p-3 rounded-xl border animate-slide-up ${
                          task.type === 'warning' ? 'bg-yellow-500/8 border-yellow-500/15' :
                          task.type === 'success' ? 'bg-emerald-500/8 border-emerald-500/15' :
                          'bg-blue-500/8 border-blue-500/15'
                        }`}
                        style={{ animationDelay: `${idx * 0.06}s`, animationFillMode: 'both' }}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                          task.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                          task.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {task.type === 'warning' ? <AlertTriangle size={16} /> :
                           task.type === 'success' ? <CheckCircle size={16} /> :
                           <Info size={16} />}
                        </div>
                        <div>
                          <div className={`font-semibold text-sm ${
                            task.type === 'warning' ? 'text-yellow-400' :
                            task.type === 'success' ? 'text-emerald-400' : 'text-blue-400'
                          }`}>{task.title}</div>
                          <div className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{task.description}</div>
                        </div>
                      </div>
                    )) : (
                      <div className="flex flex-col items-center justify-center h-full py-10 text-neutral-600">
                        <Activity size={36} className="mb-3 opacity-40" />
                        <p className="text-sm">Run AI Analysis to get your farming plan</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'soil' && (
                  <div className="flex-1">
                    {results && radarData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={230}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="rgba(255,255,255,0.06)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b7280', fontSize: 10 }} />
                          <Radar name="Soil" dataKey="value" stroke="#34d399" fill="#34d399" fillOpacity={0.15} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full py-10 text-neutral-600">
                        <FlaskConical size={36} className="mb-3 opacity-40" />
                        <p className="text-sm">Run Analysis to see nutrient radar</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── BOTTOM ROW: Market + Comparison + Calendar ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* Market Prices */}
              <div className="lg:col-span-5 glass-card p-5">
                <SectionHeader icon={<DollarSign size={18} />} title="Market Price Trend" sub={`${crop} — INR/tonne`} color="text-amber-400" />
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={market} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Line type="monotone" dataKey="price" name="Market Price" stroke="#fbbf24" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="msp" name="MSP" stroke="#f87171" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Crop Comparison */}
              <div className="lg:col-span-4 glass-card p-5">
                <SectionHeader icon={<BarChart3 size={18} />} title="Crop Yield Comparison" sub="Average tonnes/ha" color="text-blue-400" />
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={comparison} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="crop" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="yield" name="Yield" radius={[6, 6, 0, 0]}>
                      {comparison.map((entry, i) => (
                        <Cell key={i} fill={entry.color} opacity={entry.crop === crop ? 1 : 0.4} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Crop Calendar */}
              <div className="lg:col-span-3 glass-card p-5">
                <SectionHeader icon={<Calendar size={18} />} title="Crop Calendar" sub={crop} color="text-pink-400" />
                <div className="space-y-2.5">
                  {calendar.length > 0 ? calendar.map((phase, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: phase.color, boxShadow: `0 0 6px ${phase.color}` }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-neutral-200 truncate">{phase.phase}</div>
                        <div className="text-xs text-neutral-600">{phase.start} – {phase.end}</div>
                      </div>
                    </div>
                  )) : (
                    Array(5).fill(0).map((_, i) => (
                      <div key={i} className="h-8 rounded-lg shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))
                  )}
                </div>
              </div>
            </div>

          </main>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-neutral-700 pb-4">
          Agri-Yield Pro v2.0 · AI-Powered Precision Agriculture · Weather via Open-Meteo
        </footer>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-sm p-6 relative border border-emerald-500/20" style={{ background: '#08121a' }}>
            <h3 className="text-lg font-bold text-white mb-2">Save Prediction</h3>
            <p className="text-sm text-neutral-400 mb-4">Give a name to this prediction so you can load it later.</p>
            <input
              type="text"
              placeholder="e.g. Rice Field A - Optimal NPK"
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 mb-5"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                disabled={isSaving || !saveName}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

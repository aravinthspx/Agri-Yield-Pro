import React, { useState, useCallback } from 'react';
import {
  CheckCircle, Clock, AlertTriangle, Zap, Droplets, FlaskConical,
  ShieldAlert, CloudRain, Thermometer, TrendingUp, Bell, History,
  ChevronDown, ChevronUp, Info, BarChart3, ShoppingBag, Package,
  RefreshCw, Loader2, Sun,
} from 'lucide-react';
import type { ActivePlan, Task, Notification } from './index';
import { API_BASE } from './index';

interface Props {
  plan: ActivePlan;
  onPlanUpdate: (plan: ActivePlan) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = { high: '#f87171', medium: '#fbbf24', low: '#34d399' };
const TASK_TYPE_ICON: Record<string, string> = {
  irrigation: '💧', fertilizer: '🌿', monitoring: '🔍', soil: '🚜',
  sowing: '🌱', harvest: '✂️', postharvest: '📦',
};
const STATUS_COLOR: Record<string, string> = {
  pending: 'text-neutral-400', completed: 'text-emerald-400',
  skipped: 'text-neutral-600', rescheduled: 'text-yellow-400',
};

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function LifecycleTimeline({ stages, currentStage, totalDays, currentDay }: {
  stages: string[]; currentStage: string; totalDays: number; currentDay: number;
}) {
  const progressPct = Math.min(100, Math.round((currentDay / totalDays) * 100));
  const stageWidth = 100 / stages.length;
  const currentStageIdx = stages.indexOf(currentStage);

  return (
    <div className="glass-card p-5 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-400" /> Crop Journey Timeline
        </h2>
        <span className="text-xs text-neutral-500">Day {currentDay} / {totalDays}</span>
      </div>

      {/* Overall progress bar */}
      <div className="mb-4">
        <div className="progress-bar-track h-2 mb-1">
          <div className="progress-bar-fill h-full" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #059669, #34d399)', boxShadow: '0 0 8px rgba(52,211,153,0.4)' }} />
        </div>
        <div className="flex justify-between text-[10px] text-neutral-600">
          <span>Planting</span>
          <span className="text-emerald-400 font-medium">{progressPct}% complete</span>
          <span>Harvest</span>
        </div>
      </div>

      {/* Stage dots */}
      <div className="relative">
        <div className="absolute top-3 left-0 right-0 h-px bg-white/5" />
        <div className="flex">
          {stages.map((stage, idx) => {
            const isDone = idx < currentStageIdx;
            const isCurrent = idx === currentStageIdx;
            const isPending = idx > currentStageIdx;
            return (
              <div key={stage} className="flex-1 flex flex-col items-center" style={{ minWidth: 0 }}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold z-10 transition-all ${
                  isDone ? 'bg-emerald-500 text-white' :
                  isCurrent ? 'bg-emerald-400 text-black ring-2 ring-emerald-400/40 ring-offset-1 ring-offset-black' :
                  'bg-neutral-800 text-neutral-600 border border-white/5'
                }`}>
                  {isDone ? '✓' : isCurrent ? '●' : idx + 1}
                </div>
                <p className={`text-[9px] mt-1.5 text-center leading-tight px-0.5 truncate w-full ${
                  isCurrent ? 'text-emerald-400 font-semibold' : isDone ? 'text-emerald-700' : 'text-neutral-700'
                }`} title={stage}>{stage}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TaskCard({ task, planId, onUpdate }: { task: Task; planId: string; onUpdate: (task: Task) => void }) {
  const [showWhy, setShowWhy] = useState(false);
  const [updating, setUpdating] = useState(false);

  const markComplete = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/api/crop-plans/${planId}/tasks/${task.task_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', notes: '' }),
      });
      const data = await res.json();
      onUpdate(data.task);
    } catch { } finally { setUpdating(false); }
  };

  const skip = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/api/crop-plans/${planId}/tasks/${task.task_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'skipped', notes: '' }),
      });
      const data = await res.json();
      onUpdate(data.task);
    } catch { } finally { setUpdating(false); }
  };

  const isCompleted = task.status === 'completed';
  const isSkipped = task.status === 'skipped';

  return (
    <div className={`rounded-xl p-3.5 border transition-all ${
      isCompleted ? 'opacity-50 bg-white/2 border-white/3' :
      isSkipped ? 'opacity-30 bg-white/2 border-white/3' :
      task.priority === 'high' ? 'bg-red-500/5 border-red-500/12' :
      task.priority === 'medium' ? 'bg-yellow-500/5 border-yellow-500/10' :
      'bg-white/3 border-white/5'
    } ${task.modified_by_weather ? 'ring-1 ring-blue-500/20' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={markComplete}
          disabled={isCompleted || isSkipped || updating}
          className={`w-5 h-5 rounded-full shrink-0 mt-0.5 border-2 flex items-center justify-center transition-all ${
            isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 hover:border-emerald-400'
          }`}
        >
          {updating ? <Loader2 size={10} className="animate-spin text-white" /> : isCompleted ? <CheckCircle size={12} className="text-white" /> : null}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm">{TASK_TYPE_ICON[task.task_type] || '📋'}</span>
              <span className={`text-xs font-semibold ${STATUS_COLOR[task.status]}`}>{task.task_name}</span>
              {task.modified_by_weather && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">🌧 Rescheduled</span>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full`}
                style={{ background: `${PRIORITY_COLOR[task.priority]}15`, color: PRIORITY_COLOR[task.priority], border: `1px solid ${PRIORITY_COLOR[task.priority]}25` }}>
                {task.priority}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-neutral-600 mb-2">
            <span>{task.stage_icon} {task.stage}</span>
            <span>📅 {formatDate(task.actual_date)}</span>
            <span>⏱ {task.duration_hours}h</span>
          </div>

          {/* Why explanation toggle */}
          <button
            onClick={() => setShowWhy(s => !s)}
            className="text-[10px] text-neutral-600 hover:text-blue-400 transition-colors flex items-center gap-1 mb-2"
          >
            <Info size={10} /> Why this task? {showWhy ? <ChevronUp size={9} /> : <ChevronDown size={9} />}
          </button>
          {showWhy && (
            <p className="text-[10px] text-neutral-500 bg-white/3 rounded-lg p-2 mb-2 leading-relaxed animate-slide-up">
              {task.why_explanation}
            </p>
          )}

          {/* Action buttons */}
          {!isCompleted && !isSkipped && (
            <div className="flex gap-2">
              <button onClick={markComplete} disabled={updating}
                className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">
                <CheckCircle size={10} /> Mark Done
              </button>
              <button onClick={skip} disabled={updating}
                className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-white/5 text-neutral-500 border border-white/8 hover:bg-white/8 transition-all">
                Skip
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationCard({ notif }: { notif: Notification }) {
  const bgColor = notif.type === 'weather_alert' ? 'rgba(59,130,246,0.08)' : 'rgba(251,191,36,0.08)';
  const borderColor = notif.type === 'weather_alert' ? 'rgba(59,130,246,0.2)' : 'rgba(251,191,36,0.2)';
  return (
    <div className="rounded-xl p-3 animate-slide-up" style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
      <div className="flex items-start gap-2.5">
        <span className="text-lg shrink-0">{notif.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-neutral-200">{notif.title}</p>
            {notif.is_simulation && <span className="text-[9px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded shrink-0">SIMULATED</span>}
          </div>
          <p className="text-[10px] text-neutral-400 mt-0.5 leading-relaxed">{notif.message}</p>
          <p className="text-[9px] text-neutral-700 mt-1">{new Date(notif.timestamp).toLocaleString('en-IN')}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CropPlanView({ plan: initialPlan, onPlanUpdate }: Props) {
  const [plan, setPlanLocal] = useState<ActivePlan>(initialPlan);
  const [activeTab, setActiveTab] = useState<'tasks' | 'irrigation' | 'fertilizer' | 'pest' | 'market' | 'history'>('tasks');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{ changes: string[]; version: number } | null>(null);
  const [soldStatus, setSoldStatus] = useState(false);
  const [soldReport, setSoldReport] = useState<any>(null);
  const [showSoldReport, setShowSoldReport] = useState(false);

  const updatePlan = useCallback((updated: ActivePlan) => {
    setPlanLocal(updated);
    onPlanUpdate(updated);
  }, [onPlanUpdate]);

  const handleTaskUpdate = useCallback((updatedTask: Task) => {
    const newPlan = {
      ...plan,
      tasks: plan.tasks.map(t => t.task_id === updatedTask.task_id ? updatedTask : t),
    };
    updatePlan(newPlan);
  }, [plan, updatePlan]);

  const handleSimulateWeather = async (scenario: 'heavy_rain' | 'drought') => {
    setIsSimulating(true);
    setSimResult(null);
    const payload = scenario === 'heavy_rain'
      ? { rain_probability: 85, humidity: 90, is_simulation: true }
      : { rain_probability: 5, temperature: 38, is_simulation: true };
    try {
      const res = await fetch(`${API_BASE}/api/crop-plans/${plan.plan_id}/weather-update`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      updatePlan(data.plan as ActivePlan);
      setSimResult({ changes: data.changes, version: data.plan_version });
    } catch {
      alert('Backend not connected. Start the FastAPI server to test simulation.');
    } finally { setIsSimulating(false); }
  };

  const handleMarkSold = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/crop-plans/${plan.plan_id}/mark-sold`, { method: 'POST' });
      const data = await res.json();
      setSoldReport(data.report);
      setSoldStatus(true);
      setShowSoldReport(true);
    } catch {
      setSoldStatus(true);
      setSoldReport({ crop: plan.crop_name, final_status: 'Crop Sold ✓', estimated_yield_t: plan.estimated_yield_t });
      setShowSoldReport(true);
    }
  };

  const todayTasks = plan.tasks.filter(t => t.status === 'pending').slice(0, 6);
  const completedCount = plan.tasks.filter(t => t.status === 'completed').length;
  const progressPct = plan.tasks.length > 0 ? Math.round((completedCount / plan.tasks.length) * 100) : 0;
  const pestRisk = plan.pest_risk || 'Low';
  const weatherRisk = plan.weather_risk || 'Low';

  const RISK_COLOR: Record<string, string> = { Low: '#34d399', Medium: '#fbbf24', High: '#f87171' };

  const TABS = [
    { id: 'tasks', label: "Today's Tasks", icon: <CheckCircle size={13} /> },
    { id: 'irrigation', label: 'Irrigation', icon: <Droplets size={13} /> },
    { id: 'fertilizer', label: 'Fertilizer', icon: <FlaskConical size={13} /> },
    { id: 'pest', label: 'Pest & Disease', icon: <ShieldAlert size={13} /> },
    { id: 'market', label: 'Market', icon: <ShoppingBag size={13} /> },
    { id: 'history', label: 'Plan History', icon: <History size={13} /> },
  ] as const;

  // ── Sold state ──
  if (showSoldReport && soldReport) {
    return (
      <div className="animate-fade-in max-w-3xl mx-auto">
        <div className="glass-card p-8 text-center mb-6"
          style={{ boxShadow: '0 0 60px -20px rgba(52,211,153,0.3)' }}>
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-neutral-100 mb-2" style={{ fontFamily: 'Space Grotesk' }}>
            Crop Cycle Complete!
          </h1>
          <p className="text-emerald-400 font-semibold text-lg mb-1">{soldReport.final_status || 'Crop Sold ✓'}</p>
          <p className="text-neutral-500 text-sm">Congratulations on successfully completing your {soldReport.crop} crop cycle.</p>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-base font-semibold text-neutral-200 mb-5 flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-400" /> Crop Cycle Summary Report
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Crop', value: soldReport.crop, icon: plan.crop_icon },
              { label: 'Farm', value: soldReport.farm_area || `${plan.farm.area} ${plan.farm.area_unit}`, icon: '🏡' },
              { label: 'Planting Date', value: formatDate(soldReport.planting_date || plan.planting_date), icon: '📅' },
              { label: 'Harvest Date', value: formatDate(soldReport.harvest_date || plan.expected_harvest_date), icon: '✂️' },
              { label: 'Total Days', value: `${soldReport.total_growing_days || plan.total_days} days`, icon: '⏱' },
              { label: 'Est. Yield', value: `${soldReport.estimated_yield_t || plan.estimated_yield_t} tonnes`, icon: '📊' },
              { label: 'Plan Versions', value: `${soldReport.plan_versions || plan.plan_version}`, icon: '🔄' },
              { label: 'Tasks Completed', value: `${soldReport.completed_tasks || completedCount} / ${soldReport.total_tasks || plan.tasks.length}`, icon: '✅' },
              { label: 'Est. Revenue', value: soldReport.estimated_revenue_inr ? `₹${soldReport.estimated_revenue_inr.toLocaleString('en-IN')}` : 'N/A', icon: '💰' },
            ].map(item => (
              <div key={item.label} className="p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xl mb-1">{item.icon}</div>
                <div className="text-xs text-neutral-500 mb-0.5">{item.label}</div>
                <div className="text-sm font-bold text-neutral-100">{item.value}</div>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-xl text-[10px] text-neutral-600"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            ℹ️ Revenue estimates are DEMO DATA based on typical market prices. Actual prices may vary.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* ── Top Bar: Crop + KPIs ── */}
      <div className="glass-card p-4 mb-5"
        style={{ boxShadow: `0 0 40px -15px ${plan.crop_color}25` }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{plan.crop_icon}</div>
            <div>
              <h1 className="text-xl font-bold text-neutral-100" style={{ fontFamily: 'Space Grotesk' }}>
                {plan.crop_name} — {plan.farm.farm_name}
              </h1>
              <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5 flex-wrap">
                <span>📍 {plan.farm.location}</span>
                <span>📐 {plan.farm.area} {plan.farm.area_unit}</span>
                <span>📅 Planted {formatDate(plan.planting_date)}</span>
                <span className="text-yellow-400">⚠ {plan.weather_data_source}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge-success text-xs">Plan v{plan.plan_version}</span>
            <span className={`badge-${pestRisk === 'Low' ? 'success' : pestRisk === 'Medium' ? 'warning' : 'danger'} text-xs`}>
              🐛 Pest: {pestRisk}
            </span>
            <span className={`badge-${plan.crop_health === 'Good' ? 'success' : 'warning'} text-xs`}>
              ❤️ {plan.crop_health}
            </span>
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <LifecycleTimeline
        stages={plan.lifecycle_stages}
        currentStage={plan.current_stage}
        totalDays={plan.total_days}
        currentDay={plan.current_day}
      />

      {/* ── Weather Simulation (HERO FEATURE) ── */}
      <div className="glass-card p-5 mb-5"
        style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(99,102,241,0.04))', border: '1px solid rgba(59,130,246,0.12)' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-200 mb-1 flex items-center gap-2">
              <CloudRain size={15} className="text-blue-400" /> 🌦 Weather Intelligence & Dynamic Plan
            </h2>
            <p className="text-xs text-neutral-500 max-w-lg">
              Simulate a weather change to see the AI automatically update your crop plan, recalculate tasks, and generate alerts.
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-neutral-600">
              <span className="flex items-center gap-1"><Thermometer size={11} className="text-orange-400" /> {plan.weather.temperature ?? 30}°C</span>
              <span className="flex items-center gap-1"><CloudRain size={11} className="text-blue-400" /> Rain: {plan.weather.rain_probability ?? 20}%</span>
              <span className="text-yellow-500/80 text-[10px]">{plan.weather_data_source}</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              id="simulate-rain-btn"
              onClick={() => handleSimulateWeather('heavy_rain')}
              disabled={isSimulating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}
            >
              {isSimulating ? <Loader2 size={12} className="animate-spin" /> : <CloudRain size={12} />}
              🌧️ Simulate Heavy Rain
            </button>
            <button
              id="simulate-drought-btn"
              onClick={() => handleSimulateWeather('drought')}
              disabled={isSimulating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', color: '#fb923c' }}
            >
              <Sun size={12} /> ☀️ Simulate Drought
            </button>
          </div>
        </div>

        {/* Simulation Result */}
        {simResult && (
          <div className="mt-4 p-3 rounded-xl animate-slide-up"
            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <p className="text-xs font-semibold text-blue-400 mb-2">🔄 Plan Updated — Version {simResult.version}</p>
            <div className="space-y-1">
              {simResult.changes.map((c, i) => (
                <p key={i} className="text-[10px] text-neutral-400">{c}</p>
              ))}
            </div>
          </div>
        )}

        {/* Active Notifications */}
        {plan.notifications.length > 0 && (
          <div className="mt-4 space-y-2">
            {plan.notifications.slice(0, 3).map(n => <NotificationCard key={n.notif_id} notif={n} />)}
          </div>
        )}
      </div>

      {/* ── Main Grid: KPIs + Tabs ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

        {/* Left: KPI Cards */}
        <div className="xl:col-span-3 space-y-4">
          {/* Progress */}
          <div className="glass-card p-4">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Crop Progress</h3>
            <div className="text-3xl font-bold text-emerald-400 mb-1">{progressPct}%</div>
            <div className="progress-bar-track h-2 mb-2">
              <div className="progress-bar-fill" style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #059669, #34d399)' }} />
            </div>
            <p className="text-xs text-neutral-600">{completedCount} of {plan.tasks.length} tasks done</p>
          </div>

          {/* Yield Estimate */}
          <div className="glass-card p-4">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Est. Yield</h3>
            <div className="text-2xl font-bold text-blue-400">{plan.estimated_yield_t} t</div>
            <p className="text-xs text-neutral-600">from {plan.area_ha.toFixed(2)} ha · {plan.farm.area} {plan.farm.area_unit}</p>
          </div>

          {/* Harvest Date */}
          <div className="glass-card p-4">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Expected Harvest</h3>
            <div className="text-sm font-bold text-amber-400">{formatDate(plan.expected_harvest_date)}</div>
            <p className="text-xs text-neutral-600">Day {plan.total_days} of crop lifecycle</p>
          </div>

          {/* Risk Dashboard */}
          <div className="glass-card p-4">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Risk Monitor</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Pest Risk', value: pestRisk, icon: '🐛' },
                { label: 'Weather Risk', value: weatherRisk, icon: '🌩' },
                { label: 'Crop Health', value: plan.crop_health, icon: '❤️' },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">{r.icon} {r.label}</span>
                  <span className="text-xs font-bold" style={{ color: RISK_COLOR[r.value] || '#9ca3af' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mark Sold */}
          {!soldStatus && (
            <button
              id="mark-sold-btn"
              onClick={handleMarkSold}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', boxShadow: '0 6px 20px rgba(217,119,6,0.25)' }}
            >
              🏪 Mark Crop as Sold
            </button>
          )}
        </div>

        {/* Right: Tabs */}
        <div className="xl:col-span-9">
          {/* Tab bar */}
          <div className="flex gap-1 mb-4 flex-wrap">
            {TABS.map(tab => (
              <button
                key={tab.id}
                id={`plan-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                    : 'bg-white/3 text-neutral-500 border border-white/5 hover:bg-white/6'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="glass-card p-5">
            {/* TODAY'S TASKS */}
            {activeTab === 'tasks' && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
                  <CheckCircle size={15} className="text-emerald-400" /> All Farm Tasks
                  <span className="ml-auto text-xs text-neutral-600">{completedCount}/{plan.tasks.length} completed</span>
                </h3>
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {plan.tasks.length === 0 ? (
                    <p className="text-center text-neutral-600 py-10 text-sm">No tasks generated. Ensure the backend is running.</p>
                  ) : plan.tasks.map(task => (
                    <TaskCard key={task.task_id} task={task} planId={plan.plan_id} onUpdate={handleTaskUpdate} />
                  ))}
                </div>
              </div>
            )}

            {/* IRRIGATION */}
            {activeTab === 'irrigation' && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
                  <Droplets size={15} className="text-blue-400" /> Irrigation Schedule
                  <span className="ml-auto text-[10px] text-neutral-600">{plan.weather_data_source}</span>
                </h3>
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {plan.irrigation_schedule.map(irr => (
                    <div key={irr.irr_id} className={`rounded-xl p-3.5 border transition-all ${
                      irr.status === 'postponed' ? 'bg-blue-500/6 border-blue-500/15' : 'bg-white/3 border-white/5'
                    }`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-xs font-semibold text-neutral-200">{irr.stage}</span>
                          <div className="text-[10px] text-neutral-600 mt-0.5">{formatDate(irr.date)}</div>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          irr.status === 'postponed' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' :
                          'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>{irr.status}</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mb-2">{irr.recommendation}</p>
                      <div className="flex items-center gap-4 text-[10px] text-neutral-600">
                        <span>💧 {irr.water_requirement_mm} mm</span>
                        <span>🌧 Rain: {irr.rain_probability}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FERTILIZER */}
            {activeTab === 'fertilizer' && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
                  <FlaskConical size={15} className="text-amber-400" /> Fertilizer Schedule
                </h3>
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {plan.fertilizer_schedule.map(fert => (
                    <div key={fert.fert_id} className="rounded-xl p-3.5 border border-white/5 bg-white/3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <span className="text-xs font-semibold text-neutral-200">{fert.type}</span>
                          <div className="text-[10px] text-neutral-600">{fert.stage} · {formatDate(fert.date)}</div>
                        </div>
                        <span className="badge-info text-[9px]">{fert.status}</span>
                      </div>
                      <p className="text-[10px] text-amber-400/80 font-medium mb-1">{fert.recommendation}</p>
                      <p className="text-[10px] text-neutral-500">{fert.reason}</p>
                      <p className="text-[10px] text-neutral-600 mt-1">Qty: {fert.quantity_kg_ha}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PEST */}
            {activeTab === 'pest' && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
                  <ShieldAlert size={15} className="text-red-400" /> Pest & Disease Monitoring
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Overall Pest Risk', value: pestRisk, desc: 'Based on weather and crop stage', icon: '🐛', color: RISK_COLOR[pestRisk] },
                    { label: 'Fungal Risk', value: (plan.weather.rain_probability ?? 20) > 70 ? 'High' : 'Low', desc: 'Based on humidity', icon: '🍄', color: (plan.weather.rain_probability ?? 20) > 70 ? '#f87171' : '#34d399' },
                    { label: 'Insect Risk', value: (plan.weather.temperature ?? 30) > 28 ? 'Medium' : 'Low', desc: 'Based on temperature', icon: '🦗', color: (plan.weather.temperature ?? 30) > 28 ? '#fbbf24' : '#34d399' },
                  ].map(r => (
                    <div key={r.label} className="rounded-xl p-3.5 border border-white/5 bg-white/3 text-center">
                      <div className="text-2xl mb-2">{r.icon}</div>
                      <div className="text-xs text-neutral-500 mb-1">{r.label}</div>
                      <div className="text-base font-bold mb-1" style={{ color: r.color }}>{r.value}</div>
                      <div className="text-[9px] text-neutral-600">{r.desc}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl p-4"
                  style={{ background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.1)' }}>
                  <h4 className="text-xs font-semibold text-neutral-300 mb-2">Current Conditions Assessment</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {pestRisk === 'High'
                      ? `⚠️ High pest pressure detected. Temperature (${plan.weather.temperature ?? 30}°C) and rain probability (${plan.weather.rain_probability ?? 20}%) create favorable conditions for fungal diseases and insect pests. Inspect your ${plan.crop_name} crop immediately and apply preventive fungicide/pesticide if pest signs are visible.`
                      : pestRisk === 'Medium'
                      ? `🟡 Moderate pest risk. Monitor your ${plan.crop_name} field every 3 days. Apply neem oil as a preventive spray. Keep field drainage clear.`
                      : `✅ Low pest risk currently. Maintain routine monitoring every 7 days. Conditions are favorable for healthy ${plan.crop_name} growth.`}
                  </p>
                  <div className="mt-3 p-2 rounded-lg bg-white/3 text-[9px] text-neutral-600">
                    ℹ️ Risk assessment is based on SIMULATED weather data and general agronomic rules. For confirmed pest presence, consult your local Krishi Vigyan Kendra.
                  </div>
                </div>
              </div>
            )}

            {/* MARKET */}
            {activeTab === 'market' && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
                  <ShoppingBag size={15} className="text-amber-400" /> Market & Selling Plan
                  <span className="ml-2 text-[9px] bg-yellow-500/15 text-yellow-400 px-1.5 py-0.5 rounded">DEMO DATA</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'Est. Yield', value: `${plan.estimated_yield_t} t`, icon: '📊', color: '#34d399' },
                    { label: 'Est. Price', value: `₹${(plan.market_info?.estimated_price_inr_per_tonne || 20000).toLocaleString('en-IN')}/t`, icon: '💰', color: '#fbbf24' },
                    { label: 'Est. Revenue', value: `₹${(plan.market_info?.estimated_revenue_inr || 0).toLocaleString('en-IN')}`, icon: '📈', color: '#60a5fa' },
                    { label: 'Nearest Market', value: `~${plan.market_info?.transport_distance_km || 25} km`, icon: '🚚', color: '#fb923c' },
                  ].map(item => (
                    <div key={item.label} className="glass-card p-3 text-center">
                      <div className="text-xl mb-1">{item.icon}</div>
                      <div className="text-xs text-neutral-500 mb-0.5">{item.label}</div>
                      <div className="text-sm font-bold" style={{ color: item.color }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Nearby Market Options</h4>
                  {(plan.market_info?.nearby_markets || ['Local Mandi', 'APMC Market', 'FPO']).map((market: string, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">🏪</span>
                        <div>
                          <div className="text-xs font-medium text-neutral-200">{market}</div>
                          <div className="text-[10px] text-neutral-600">DEMO DATA · Price data unavailable</div>
                        </div>
                      </div>
                      <button className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                        Select
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-3 rounded-xl text-[10px] text-neutral-600"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  ℹ️ Market prices, revenue estimates, and transportation data shown here are DEMO DATA. Actual prices vary by location, season, and market conditions. Check eNAM or local mandi rates before selling.
                </div>

                {!soldStatus && (
                  <button onClick={handleMarkSold}
                    className="mt-4 w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.01]"
                    style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', boxShadow: '0 6px 20px rgba(217,119,6,0.2)' }}>
                    💰 Mark Crop as Sold & Generate Report
                  </button>
                )}
              </div>
            )}

            {/* PLAN HISTORY */}
            {activeTab === 'history' && (
              <div>
                <h3 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
                  <History size={15} className="text-purple-400" /> Plan Version History
                  <span className="ml-auto text-xs text-neutral-600">v{plan.plan_version} total</span>
                </h3>
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {[...plan.versions].reverse().map(v => (
                    <div key={v.version} className={`rounded-xl p-4 border ${v.version === plan.plan_version ? 'border-purple-500/25 bg-purple-500/5' : 'border-white/5 bg-white/2'}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{ background: v.version === plan.plan_version ? '#a855f7' : 'rgba(255,255,255,0.1)', color: v.version === plan.plan_version ? 'white' : '#6b7280' }}>
                            {v.version}
                          </span>
                          <div>
                            <div className="text-xs font-semibold text-neutral-200">Plan v{v.version}</div>
                            <div className="text-[10px] text-neutral-600">{new Date(v.created_at).toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {v.is_simulation && <span className="text-[9px] bg-yellow-500/12 text-yellow-400 px-1.5 py-0.5 rounded">SIMULATED</span>}
                          {v.version === plan.plan_version && <span className="text-[9px] bg-purple-500/12 text-purple-400 px-1.5 py-0.5 rounded">CURRENT</span>}
                        </div>
                      </div>
                      <p className="text-[10px] text-neutral-500 mb-2 italic">{v.reason}</p>
                      <div className="space-y-1">
                        {v.changes.map((c, i) => (
                          <div key={i} className="text-[10px] text-neutral-400 flex items-start gap-1.5">
                            <span className="text-emerald-600 shrink-0">›</span> {c}
                          </div>
                        ))}
                      </div>
                      {v.weather_snapshot && (
                        <div className="mt-2 flex items-center gap-3 text-[9px] text-neutral-700">
                          <span>🌡 {v.weather_snapshot.temperature ?? '—'}°C</span>
                          <span>🌧 {v.weather_snapshot.rain_probability}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

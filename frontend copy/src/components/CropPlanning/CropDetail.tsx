import React, { useState } from 'react';
import { Sprout, Droplets, Thermometer, FlaskConical, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import type { CropDetail, CropStage } from './index';

interface Props {
  crop: CropDetail;
  onCreatePlan: () => void;
}

const WATER_COLOR: Record<string, string> = {
  'High': '#60a5fa', 'Very High': '#818cf8', 'Medium-High': '#34d399',
  'Medium': '#fbbf24', 'Low-Medium': '#fb923c', 'Low': '#f87171',
};

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center py-2.5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span className="text-xs text-neutral-500 font-medium">{label}</span>
      <span className="text-xs font-semibold" style={{ color: color || '#e2e8f0' }}>{value}</span>
    </div>
  );
}

function StageTimeline({ stages }: { stages: CropStage[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const positiveStages = stages.filter(s => s.start_day >= 0);
  const total = Math.max(...positiveStages.map(s => s.end_day), 1);

  return (
    <div className="space-y-2">
      {positiveStages.map((stage, idx) => {
        const widthPct = ((stage.end_day - Math.max(0, stage.start_day)) / total) * 100;
        const leftPct = (Math.max(0, stage.start_day) / total) * 100;
        const isOpen = expanded === stage.name;
        const colors = ['#34d399','#60a5fa','#fbbf24','#f97316','#f472b6','#a78bfa','#22d3ee','#4ade80','#fb923c','#e879f9'];
        const stageColor = colors[idx % colors.length];

        return (
          <div key={stage.name} className="rounded-xl overflow-hidden transition-all"
            style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.04)` }}>
            <button
              className="w-full text-left p-3 flex items-center gap-3"
              onClick={() => setExpanded(isOpen ? null : stage.name)}
            >
              <span className="text-xl shrink-0">{stage.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-neutral-200">{stage.name}</span>
                  <span className="text-[10px] text-neutral-600 shrink-0 ml-2">Day {stage.start_day}–{stage.end_day}</span>
                </div>
                <div className="h-1.5 rounded-full w-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="h-full rounded-full" style={{
                    marginLeft: `${leftPct}%`,
                    width: `${Math.max(widthPct, 5)}%`,
                    background: stageColor,
                    boxShadow: `0 0 6px ${stageColor}60`
                  }} />
                </div>
              </div>
              <div className="shrink-0 text-neutral-600">{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
            </button>

            {isOpen && (
              <div className="px-4 pb-3 animate-slide-up">
                <p className="text-xs text-neutral-500 mb-2 italic">{stage.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {stage.key_tasks.map((task, ti) => (
                    <div key={ti} className="flex items-start gap-2 text-xs text-neutral-400 py-1">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: stageColor }} />
                      {task}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CropDetailView({ crop, onCreatePlan }: Props) {
  const [showAllStages, setShowAllStages] = useState(false);
  const stages = crop.stages || [];
  const visibleStages = showAllStages ? stages : stages.slice(0, 5);

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* Hero Card */}
      <div className="glass-card p-6 mb-5 relative overflow-hidden"
        style={{ boxShadow: `0 0 60px -20px ${crop.color}30` }}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full blur-3xl opacity-10"
          style={{ background: crop.color }} />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start gap-5">
          <div className="flex items-start gap-4 flex-1">
            <div className="text-6xl">{crop.icon}</div>
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-3xl font-bold text-neutral-100" style={{ fontFamily: 'Space Grotesk' }}>{crop.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: `${crop.color}15`, color: crop.color, border: `1px solid ${crop.color}30` }}>
                  {crop.category}
                </span>
              </div>
              <p className="text-neutral-400 text-sm mb-3">{crop.type}</p>
              <div className="flex flex-wrap gap-2">
                {(crop.suitable_seasons || []).map(s => (
                  <span key={s} className="badge-info text-[10px]">{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Create Plan CTA */}
          <button
            id="create-crop-plan-btn"
            onClick={onCreatePlan}
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
            style={{
              background: 'linear-gradient(135deg, #059669, #0d9488)',
              boxShadow: '0 8px 24px rgba(5,150,105,0.3)',
            }}
          >
            <Sprout size={18} />
            🌱 Create Crop Plan
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Crop Profile */}
        <div className="lg:col-span-5 space-y-4">
          {/* Basic Info */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-neutral-200 mb-3 flex items-center gap-2">
              <FlaskConical size={15} className="text-amber-400" /> Basic Information
            </h2>
            <div className="space-y-0">
              <InfoRow label="Crop Type" value={crop.type} />
              <InfoRow label="Growing Duration" value={`${crop.duration?.min}–${crop.duration?.max} days`} color={crop.color} />
              <InfoRow label="Climate" value={crop.climate || '—'} />
              <InfoRow label="Water Requirement" value={crop.water_requirement} color={WATER_COLOR[crop.water_requirement]} />
              <InfoRow label="Soil Requirement" value={crop.soil_requirement || 'Well-drained loamy soil'} />
              <InfoRow label="pH Range" value={`${crop.ph_range?.min} – ${crop.ph_range?.max}`} />
              <InfoRow label="Temperature" value={`${crop.temp_range?.min}°C – ${crop.temp_range?.max}°C`} color="#f97316" />
              {crop.planting_method && <InfoRow label="Planting Method" value={crop.planting_method} />}
              {crop.spacing && <InfoRow label="Spacing" value={crop.spacing} />}
              {crop.seed_rate && <InfoRow label="Seed Rate" value={crop.seed_rate} />}
            </div>
          </div>

          {/* Nutrient Requirements */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
              <Droplets size={15} className="text-blue-400" /> Optimal Nutrient Requirements
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Nitrogen (N)', value: crop.optimal_n || 100, max: 200, color: '#34d399', unit: 'kg/ha' },
                { label: 'Phosphorus (P)', value: crop.optimal_p || 50, max: 100, color: '#60a5fa', unit: 'kg/ha' },
                { label: 'Potassium (K)', value: crop.optimal_k || 50, max: 120, color: '#f97316', unit: 'kg/ha' },
              ].map(n => (
                <div key={n.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-neutral-400">{n.label}</span>
                    <span className="font-semibold" style={{ color: n.color }}>{n.value} {n.unit}</span>
                  </div>
                  <div className="progress-bar-track h-1.5">
                    <div className="progress-bar-fill" style={{ width: `${Math.min(100, (n.value / n.max) * 100)}%`, background: n.color, boxShadow: `0 0 6px ${n.color}60` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optimal Conditions */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
              <Thermometer size={15} className="text-orange-400" /> Optimal Conditions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Ideal pH', value: `${crop.optimal_ph || 6.5}`, icon: '⚗️', color: '#a78bfa' },
                { label: 'Ideal Temp', value: `${crop.optimal_temp || 25}°C`, icon: '🌡️', color: '#f97316' },
                { label: 'Yield Potential', value: `${crop.base_yield} t/ha`, icon: '📊', color: '#34d399' },
              ].map(c => (
                <div key={c.label} className="rounded-xl p-3 text-center"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-xl mb-1">{c.icon}</div>
                  <div className="text-xs text-neutral-500 mb-0.5">{c.label}</div>
                  <div className="text-sm font-bold" style={{ color: c.color }}>{c.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Growth Stages */}
        <div className="lg:col-span-7">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                <Sprout size={15} className="text-emerald-400" /> Growth Stages Timeline
              </h2>
              <span className="text-xs text-neutral-600">{stages.length} stages</span>
            </div>

            <StageTimeline stages={visibleStages} />

            {stages.length > 5 && (
              <button
                onClick={() => setShowAllStages(s => !s)}
                className="mt-3 w-full py-2 text-xs font-medium text-neutral-500 hover:text-emerald-400 transition-colors flex items-center justify-center gap-1"
              >
                {showAllStages ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show all {stages.length} stages</>}
              </button>
            )}

            {/* Bottom CTA */}
            <div className="mt-5 p-4 rounded-xl text-center"
              style={{ background: 'linear-gradient(135deg, rgba(5,150,105,0.1), rgba(13,148,136,0.05))', border: '1px solid rgba(5,150,105,0.15)' }}>
              <p className="text-sm text-neutral-300 mb-3">
                Ready to start growing <strong className="text-neutral-100">{crop.name}</strong>? Let the AI create a personalized plan for your farm.
              </p>
              <button
                onClick={onCreatePlan}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', boxShadow: '0 6px 20px rgba(5,150,105,0.25)' }}
              >
                <Sprout size={16} />
                Create My Crop Plan
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

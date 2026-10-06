import React, { useState, useCallback } from 'react';

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  bg_color: string;
  crop_count: number;
  crops: string[];
}

export interface CropLite {
  id: string;
  name: string;
  category: string;
  type: string;
  icon: string;
  color: string;
  duration: { min: number; max: number };
  suitable_seasons: string[];
  climate: string;
  water_requirement: string;
  ph_range: { min: number; max: number };
  temp_range: { min: number; max: number };
  planting_method: string;
  spacing: string;
  base_yield: number;
}

export interface CropStage {
  name: string;
  icon: string;
  start_day: number;
  end_day: number;
  description: string;
  key_tasks: string[];
}

export interface CropDetail extends CropLite {
  soil_requirement: string;
  optimal_ph: number;
  optimal_temp: number;
  optimal_n: number;
  optimal_p: number;
  optimal_k: number;
  seed_rate: string;
  stages: CropStage[];
}

export interface Task {
  task_id: string;
  stage: string;
  stage_icon: string;
  planned_day: number;
  actual_date: string;
  task_name: string;
  task_type: string;
  priority: string;
  duration_hours: number;
  reason: string;
  why_explanation: string;
  resources: string[];
  status: string;
  completed_at: string | null;
  weather_dependent: boolean;
  modified_by_weather: boolean;
  notes: string;
}

export interface IrrigationEntry {
  irr_id: string;
  stage: string;
  date: string;
  water_requirement_mm: number;
  rain_probability: number;
  recommendation: string;
  status: string;
  why: string;
}

export interface FertilizerEntry {
  fert_id: string;
  stage: string;
  day: number;
  date: string;
  type: string;
  recommendation: string;
  quantity_kg_ha: string;
  reason: string;
  status: string;
}

export interface PlanVersion {
  version: number;
  created_at: string;
  reason: string;
  changes: string[];
  weather_snapshot: { rain_probability: number; temperature: number };
  is_simulation?: boolean;
}

export interface Notification {
  notif_id: string;
  type: string;
  icon: string;
  title: string;
  message: string;
  timestamp: string;
  priority: string;
  read: boolean;
  is_simulation: boolean;
}

export interface ActivePlan {
  plan_id: string;
  crop_id: string;
  crop_name: string;
  crop_icon: string;
  crop_color: string;
  farm: Record<string, any>;
  planting_date: string;
  expected_harvest_date: string;
  total_days: number;
  current_day: number;
  current_stage: string;
  plan_status: string;
  crop_health: string;
  pest_risk: string;
  weather_risk: string;
  estimated_yield_t: number;
  area_ha: number;
  tasks: Task[];
  irrigation_schedule: IrrigationEntry[];
  fertilizer_schedule: FertilizerEntry[];
  market_info: Record<string, any>;
  weather: Record<string, any>;
  weather_data_source: string;
  notifications: Notification[];
  versions: PlanVersion[];
  plan_version: number;
  lifecycle_stages: string[];
  created_at: string;
}

export interface FarmFormData {
  farm_name: string;
  location: string;
  area: number;
  area_unit: string;
  soil_type: string;
  soil_ph: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  soil_moisture: string;
  irrigation_available: boolean;
  irrigation_method: string;
  organic: boolean;
  budget_range: string;
  target_market: string;
  crop_id: string;
  variety: string;
  planting_date: string;
  planting_method: string;
}

// ─── Step State ────────────────────────────────────────────────────────────────

type Step = 'category' | 'crops' | 'detail' | 'form' | 'plan';

import CategorySelection from './CategorySelection';
import CropList from './CropList';
import CropDetailView from './CropDetail';
import PlanForm from './PlanForm';
import CropPlanView from './CropPlanView';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export { API_BASE };

// ─── Main Orchestrator ────────────────────────────────────────────────────────

export default function CropPlanning() {
  const [step, setStep] = useState<Step>('category');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<CropDetail | null>(null);
  const [activePlan, setActivePlan] = useState<ActivePlan | null>(null);

  const handleCategorySelect = useCallback((cat: Category) => {
    setSelectedCategory(cat);
    setStep('crops');
  }, []);

  const handleCropSelect = useCallback((crop: CropDetail) => {
    setSelectedCrop(crop);
    setStep('detail');
  }, []);

  const handleCreatePlan = useCallback(() => {
    setStep('form');
  }, []);

  const handlePlanCreated = useCallback((plan: ActivePlan) => {
    setActivePlan(plan);
    setStep('plan');
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'crops') { setStep('category'); setSelectedCategory(null); }
    else if (step === 'detail') { setStep('crops'); setSelectedCrop(null); }
    else if (step === 'form') setStep('detail');
    else if (step === 'plan') { setStep('detail'); }
  }, [step]);

  const STEPS = ['category', 'crops', 'detail', 'form', 'plan'];
  const STEP_LABELS = ['Select Category', 'Choose Crop', 'Crop Details', 'Farm Setup', 'Crop Plan'];
  const currentStepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #050a0e 0%, #061020 50%, #050a0e 100%)' }}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-[-10%] right-[20%] w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.04) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[10%] left-[10%] w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.03) 0%, transparent 70%)' }} />
      </div>

      <div className="relative z-10 px-4 md:px-6 py-6 max-w-[1600px] mx-auto">
        {/* Step Indicator */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            {STEP_LABELS.map((label, idx) => (
              <React.Fragment key={label}>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    idx === currentStepIdx
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : idx < currentStepIdx
                      ? 'bg-white/5 text-emerald-600 border border-white/5'
                      : 'bg-white/3 text-neutral-600 border border-white/3'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    idx < currentStepIdx ? 'bg-emerald-500/30 text-emerald-400' : idx === currentStepIdx ? 'bg-emerald-500 text-white' : 'bg-white/5 text-neutral-600'
                  }`}>{idx < currentStepIdx ? '✓' : idx + 1}</span>
                  {label}
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div className={`w-4 h-px ${idx < currentStepIdx ? 'bg-emerald-500/40' : 'bg-white/10'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Back button */}
        {step !== 'category' && (
          <button
            onClick={handleBack}
            className="mb-4 flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
        )}

        {/* Step Content */}
        {step === 'category' && <CategorySelection onSelect={handleCategorySelect} />}
        {step === 'crops' && selectedCategory && (
          <CropList category={selectedCategory} onSelect={handleCropSelect} />
        )}
        {step === 'detail' && selectedCrop && (
          <CropDetailView crop={selectedCrop} onCreatePlan={handleCreatePlan} />
        )}
        {step === 'form' && selectedCrop && (
          <PlanForm crop={selectedCrop} onPlanCreated={handlePlanCreated} />
        )}
        {step === 'plan' && activePlan && (
          <CropPlanView plan={activePlan} onPlanUpdate={setActivePlan} />
        )}
      </div>
    </div>
  );
}

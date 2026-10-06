import React, { useState } from 'react';
import { Loader2, Sprout, MapPin, Droplets, FlaskConical, Calendar } from 'lucide-react';
import type { CropDetail, ActivePlan, FarmFormData } from './index';
import { API_BASE } from './index';

interface Props {
  crop: CropDetail;
  onPlanCreated: (plan: ActivePlan) => void;
}

export default function PlanForm({ crop, onPlanCreated }: Props) {
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<FarmFormData>({
    farm_name: "Aravinth's Farm",
    location: "Tamil Nadu, India",
    area: 2.5,
    area_unit: "acres",
    soil_type: "Loamy",
    soil_ph: crop.optimal_ph || 6.5,
    nitrogen: 80,
    phosphorus: 40,
    potassium: 45,
    soil_moisture: "Medium",
    irrigation_available: true,
    irrigation_method: "Drip",
    organic: false,
    budget_range: "Medium",
    target_market: "Local Mandi",
    crop_id: crop.id,
    variety: "",
    planting_date: today,
    planting_method: crop.planting_method || "Direct Sowing",
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof FarmFormData, value: any) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError('');
    try {
      const body = {
        ...form,
        area: Number(form.area),
        soil_ph: Number(form.soil_ph),
        nitrogen: Number(form.nitrogen),
        phosphorus: Number(form.phosphorus),
        potassium: Number(form.potassium),
      };
      const res = await fetch(`${API_BASE}/api/crop-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onPlanCreated(data.plan as ActivePlan);
    } catch (err: any) {
      setError('Failed to connect to the AI backend. Ensure the FastAPI server is running on port 8000.');
    } finally {
      setIsGenerating(false);
    }
  };

  const LabeledInput = ({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) => (
    <div>
      <label htmlFor={id} className="text-neutral-500 text-xs font-medium uppercase tracking-wider block mb-1.5">{label}</label>
      {children}
    </div>
  );

  const inputCls = "farm-input";
  const selectCls = "farm-input";

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{crop.icon}</span>
          <div>
            <h2 className="text-2xl font-bold text-neutral-100" style={{ fontFamily: 'Space Grotesk' }}>
              Setup Your Farm
            </h2>
            <p className="text-sm text-neutral-500">
              Creating plan for <span className="text-emerald-400 font-medium">{crop.name}</span>
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Farm Information */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
              <MapPin size={15} className="text-emerald-400" /> Farm Information
            </h3>
            <div className="space-y-3">
              <LabeledInput label="Farm Name" id="farm-name">
                <input id="farm-name" type="text" value={form.farm_name} onChange={e => set('farm_name', e.target.value)} className={inputCls} placeholder="e.g. Aravinth's Farm" />
              </LabeledInput>
              <LabeledInput label="Location" id="farm-location">
                <input id="farm-location" type="text" value={form.location} onChange={e => set('location', e.target.value)} className={inputCls} placeholder="e.g. Tamil Nadu, India" />
              </LabeledInput>
              <div className="grid grid-cols-2 gap-3">
                <LabeledInput label="Farm Area" id="farm-area">
                  <input id="farm-area" type="number" min={0.1} step={0.1} value={form.area} onChange={e => set('area', e.target.value)} className={inputCls} />
                </LabeledInput>
                <LabeledInput label="Unit" id="area-unit">
                  <select id="area-unit" value={form.area_unit} onChange={e => set('area_unit', e.target.value)} className={selectCls}>
                    <option value="acres">Acres</option>
                    <option value="hectares">Hectares</option>
                  </select>
                </LabeledInput>
              </div>
            </div>
          </div>

          {/* Soil Information */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
              <FlaskConical size={15} className="text-amber-400" /> Soil Information
            </h3>
            <div className="space-y-3">
              <LabeledInput label="Soil Type" id="soil-type">
                <select id="soil-type" value={form.soil_type} onChange={e => set('soil_type', e.target.value)} className={selectCls}>
                  {['Sandy','Sandy Loam','Loamy','Clay Loam','Clay','Black Cotton Soil','Alluvial','Laterite'].map(t => <option key={t}>{t}</option>)}
                </select>
              </LabeledInput>
              <div className="grid grid-cols-2 gap-3">
                <LabeledInput label="Soil pH" id="soil-ph">
                  <input id="soil-ph" type="number" min={4} max={9} step={0.1} value={form.soil_ph} onChange={e => set('soil_ph', e.target.value)} className={inputCls} />
                </LabeledInput>
                <LabeledInput label="Soil Moisture" id="soil-moisture">
                  <select id="soil-moisture" value={form.soil_moisture} onChange={e => set('soil_moisture', e.target.value)} className={selectCls}>
                    {['Low','Medium','High'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </LabeledInput>
              </div>
              <div>
                <label className="text-neutral-500 text-xs font-medium uppercase tracking-wider block mb-2">NPK (kg/ha)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'N', key: 'nitrogen' as keyof FarmFormData, color: '#34d399', id: 'npk-n' },
                    { label: 'P', key: 'phosphorus' as keyof FarmFormData, color: '#60a5fa', id: 'npk-p' },
                    { label: 'K', key: 'potassium' as keyof FarmFormData, color: '#f97316', id: 'npk-k' },
                  ].map(({ label, key, color, id }) => (
                    <div key={label}>
                      <label htmlFor={id} className="block text-center text-xs font-bold mb-1" style={{ color }}>{label}</label>
                      <input id={id} type="number" min={0} value={form[key] as number}
                        onChange={e => set(key, e.target.value)} className="farm-input text-center px-2" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Irrigation */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
              <Droplets size={15} className="text-blue-400" /> Irrigation & Water
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-sm text-neutral-300">Irrigation Available?</span>
                <button type="button" onClick={() => set('irrigation_available', !form.irrigation_available)}
                  className={`w-10 h-6 rounded-full transition-all relative ${form.irrigation_available ? 'bg-emerald-500' : 'bg-neutral-700'}`}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.irrigation_available ? 'left-5' : 'left-1'}`} />
                </button>
              </div>
              {form.irrigation_available && (
                <LabeledInput label="Irrigation Method" id="irrigation-method">
                  <select id="irrigation-method" value={form.irrigation_method} onChange={e => set('irrigation_method', e.target.value)} className={selectCls}>
                    {['Drip','Sprinkler','Furrow','Flood','Rainfed'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </LabeledInput>
              )}
            </div>
          </div>

          {/* Crop & Planning Info */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
              <Calendar size={15} className="text-pink-400" /> Crop & Planning Details
            </h3>
            <div className="space-y-3">
              <LabeledInput label="Crop Variety (optional)" id="crop-variety">
                <input id="crop-variety" type="text" value={form.variety} onChange={e => set('variety', e.target.value)} className={inputCls} placeholder={`e.g. IR-64, Hybrid, Local variety`} />
              </LabeledInput>
              <LabeledInput label="Planned Sowing Date" id="planting-date">
                <input id="planting-date" type="date" value={form.planting_date} onChange={e => set('planting_date', e.target.value)} className={inputCls} />
              </LabeledInput>
              <LabeledInput label="Planting Method" id="planting-method">
                <select id="planting-method" value={form.planting_method} onChange={e => set('planting_method', e.target.value)} className={selectCls}>
                  {['Direct Sowing','Transplanting','Tuber Planting','Sett Planting','Rhizome Planting','Grafted Sapling','Sucker / TC Plant'].map(m => <option key={m}>{m}</option>)}
                </select>
              </LabeledInput>
            </div>
          </div>

          {/* Preferences */}
          <div className="glass-card p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
              <Sprout size={15} className="text-emerald-400" /> Farmer Preferences
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-xs text-neutral-400">Organic?</span>
                <button type="button" onClick={() => set('organic', !form.organic)}
                  className={`w-8 h-5 rounded-full transition-all relative ${form.organic ? 'bg-emerald-500' : 'bg-neutral-700'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.organic ? 'left-3.5' : 'left-0.5'}`} />
                </button>
              </div>
              <LabeledInput label="Budget Range">
                <select value={form.budget_range} onChange={e => set('budget_range', e.target.value)} className={selectCls}>
                  {['Low','Medium','High'].map(b => <option key={b}>{b}</option>)}
                </select>
              </LabeledInput>
              <LabeledInput label="Target Market">
                <select value={form.target_market} onChange={e => set('target_market', e.target.value)} className={selectCls}>
                  {['Local Mandi','FPO/Cooperative','Export','Direct to Consumer','Online Platform'].map(m => <option key={m}>{m}</option>)}
                </select>
              </LabeledInput>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl text-sm text-red-400 flex items-center gap-2"
            style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Submit */}
        <div className="mt-6 flex justify-center">
          <button
            type="submit"
            id="generate-plan-btn"
            disabled={isGenerating}
            className="flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-base text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:scale-100"
            style={{
              background: isGenerating ? 'rgba(52,211,153,0.2)' : 'linear-gradient(135deg, #059669, #0d9488)',
              boxShadow: isGenerating ? 'none' : '0 8px 30px rgba(5,150,105,0.3)',
            }}
          >
            {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <span className="text-xl">🤖</span>}
            {isGenerating ? 'AI is creating your crop plan...' : 'Generate Complete Crop Plan'}
          </button>
        </div>

        {isGenerating && (
          <div className="mt-4 text-center animate-fade-in">
            <p className="text-sm text-neutral-500">Analyzing crop requirements, soil data, weather patterns, and generating your personalized farming schedule...</p>
          </div>
        )}
      </form>
    </div>
  );
}

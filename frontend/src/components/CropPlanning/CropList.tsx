import React, { useEffect, useState, useMemo } from 'react';
import { Search, Loader2, Filter, X } from 'lucide-react';
import type { Category, CropLite, CropDetail } from './index';
import { API_BASE } from './index';

interface Props {
  category: Category;
  onSelect: (crop: CropDetail) => void;
}

const WATER_COLORS: Record<string, string> = {
  'High': '#60a5fa', 'Very High': '#818cf8', 'Medium-High': '#34d399',
  'Medium': '#fbbf24', 'Low-Medium': '#fb923c', 'Low': '#f87171',
};

export default function CropList({ category, onSelect }: Props) {
  const [crops, setCrops] = useState<CropLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCropId, setLoadingCropId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [filterWater, setFilterWater] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/planning/crops?category=${category.id}`)
      .then(r => r.json())
      .then(d => setCrops(d.crops || []))
      .catch(() => setCrops([]))
      .finally(() => setLoading(false));
  }, [category.id]);

  const filtered = useMemo(() => {
    return crops.filter(c => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
      const matchSeason = !filterSeason || c.suitable_seasons.some(s => s.toLowerCase().includes(filterSeason.toLowerCase()));
      const matchWater = !filterWater || c.water_requirement.toLowerCase().includes(filterWater.toLowerCase());
      return matchSearch && matchSeason && matchWater;
    });
  }, [crops, search, filterSeason, filterWater]);

  const allSeasons = useMemo(() => {
    const s = new Set<string>();
    crops.forEach(c => c.suitable_seasons.forEach(season => {
      if (season.includes('Kharif')) s.add('Kharif');
      if (season.includes('Rabi')) s.add('Rabi');
      if (season.includes('Summer')) s.add('Summer');
      if (season.includes('Year')) s.add('Year-round');
    }));
    return Array.from(s);
  }, [crops]);

  const handleSelectCrop = async (cropLite: CropLite) => {
    setLoadingCropId(cropLite.id);
    try {
      const res = await fetch(`${API_BASE}/api/planning/crops/${cropLite.id}`);
      const data = await res.json();
      onSelect(data.crop as CropDetail);
    } catch {
      // fallback — pass lite version as detail
      onSelect(cropLite as unknown as CropDetail);
    } finally {
      setLoadingCropId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{category.icon}</span>
          <div>
            <h2 className="text-2xl font-bold text-neutral-100" style={{ fontFamily: 'Space Grotesk' }}>
              Select Your Crop
            </h2>
            <p className="text-sm text-neutral-500">
              {category.name} · {crops.length} crops available
            </p>
          </div>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search crops..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="farm-input pl-9 pr-4"
            id="crop-search"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${showFilters ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-white/5 text-neutral-400 border border-white/8 hover:bg-white/8'}`}
        >
          <Filter size={14} />
          Filters
          {(filterSeason || filterWater) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
        </button>
      </div>

      {/* Filters expanded */}
      {showFilters && (
        <div className="mb-5 p-4 rounded-xl animate-slide-up"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-1.5">Growing Season</label>
              <div className="flex gap-2 flex-wrap">
                {allSeasons.map(s => (
                  <button key={s}
                    onClick={() => setFilterSeason(filterSeason === s ? '' : s)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filterSeason === s ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-neutral-400 border border-white/8 hover:bg-white/8'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-1.5">Water Requirement</label>
              <div className="flex gap-2 flex-wrap">
                {['High','Medium','Low'].map(w => (
                  <button key={w}
                    onClick={() => setFilterWater(filterWater === w ? '' : w)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${filterWater === w ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-neutral-400 border border-white/8 hover:bg-white/8'}`}>
                    {w}
                  </button>
                ))}
              </div>
            </div>
            {(filterSeason || filterWater) && (
              <button onClick={() => { setFilterSeason(''); setFilterWater(''); }}
                className="self-end text-xs text-neutral-500 hover:text-red-400 transition-colors px-2">
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="mb-4 text-xs text-neutral-600">
        {loading ? 'Loading crops...' : `${filtered.length} crop${filtered.length !== 1 ? 's' : ''} found`}
        {(search || filterSeason || filterWater) && ` · Filtered from ${crops.length}`}
      </div>

      {/* Crop Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-400" size={28} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-neutral-600">
          <Search size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No crops match your search. <button onClick={() => { setSearch(''); setFilterSeason(''); setFilterWater(''); }} className="text-emerald-400 hover:underline">Clear filters</button></p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((crop, idx) => (
            <div
              key={crop.id}
              className="crop-card glass-card overflow-hidden cursor-pointer animate-slide-up group"
              style={{ animationDelay: `${idx * 0.04}s`, animationFillMode: 'both', borderLeft: `3px solid ${crop.color}60` }}
              onClick={() => handleSelectCrop(crop)}
              id={`crop-card-${crop.id}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl">{crop.icon}</span>
                    <div>
                      <h3 className="font-bold text-neutral-100 text-sm leading-tight">{crop.name}</h3>
                      <p className="text-xs text-neutral-500 mt-0.5">{crop.type}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Duration</span>
                    <span className="text-neutral-300 font-medium">{crop.duration.min}–{crop.duration.max} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Water Need</span>
                    <span className="font-medium" style={{ color: WATER_COLORS[crop.water_requirement] || '#9ca3af' }}>
                      {crop.water_requirement}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">pH Range</span>
                    <span className="text-neutral-300 font-medium">{crop.ph_range.min}–{crop.ph_range.max}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600">Temp</span>
                    <span className="text-neutral-300 font-medium">{crop.temp_range.min}–{crop.temp_range.max}°C</span>
                  </div>
                </div>

                {/* Season tags */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {crop.suitable_seasons.slice(0, 2).map(s => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(34,197,94,0.08)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.15)' }}>
                      {s.split(' ')[0]}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleSelectCrop(crop); }}
                  disabled={loadingCropId === crop.id}
                  className="w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${crop.color}20, ${crop.color}10)`,
                    border: `1px solid ${crop.color}30`,
                    color: crop.color,
                  }}
                  id={`view-crop-${crop.id}`}
                >
                  {loadingCropId === crop.id ? <Loader2 size={12} className="animate-spin" /> : null}
                  {loadingCropId === crop.id ? 'Loading...' : 'View Details & Plan →'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

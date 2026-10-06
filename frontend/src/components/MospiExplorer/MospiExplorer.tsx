import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { 
  ShieldCheck, MapPin, Loader2, Info, ArrowUpRight, ArrowDownRight, ExternalLink, Download, FilterX, HelpCircle, Activity 
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface MospiData {
  state: string;
  crop: string;
  year: string;
  value: number;
  unit: string;
  indicator: string;
}

interface MospiMetadata {
  source_name: string;
  dataset_name: string;
  data_period: string;
  source_url: string;
  disclaimer: string;
  data_type?: string;
}

export default function MospiExplorer() {
  const [states, setStates] = useState<string[]>([]);
  const [crops, setCrops] = useState<string[]>([]);
  
  const [selectedState, setSelectedState] = useState<string>('All India');
  const [selectedCrop, setSelectedCrop] = useState<string>('All Crops');
  const [selectedIndicator, setSelectedIndicator] = useState<string>('Value of Output at Current Prices');
  
  const [trendData, setTrendData] = useState<MospiData[]>([]);
  const [metadata, setMetadata] = useState<MospiMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Explain Simply State
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    // Fetch initial options
    Promise.all([
      fetch(`${API_BASE}/api/official-data/states`),
      fetch(`${API_BASE}/api/official-data/crops`)
    ])
      .then(async ([resStates, resCrops]) => {
        const dStates = await resStates.json();
        const dCrops = await resCrops.json();
        setStates(dStates.states);
        setCrops(dCrops.crops);
        if(!metadata) setMetadata(dStates.metadata);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetch(`${API_BASE}/api/official-data/trends?state=${encodeURIComponent(selectedState)}&crop=${encodeURIComponent(selectedCrop)}&indicator=${encodeURIComponent(selectedIndicator)}`)
      .then(res => res.json())
      .then(data => {
        setTrendData(data.data);
        if(!metadata) setMetadata(data.metadata);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [selectedState, selectedCrop, selectedIndicator]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0d1117] border border-white/10 rounded-xl p-3 shadow-2xl text-xs">
          <p className="text-neutral-400 mb-2 font-medium">{label}</p>
          {payload.map((entry: any, i: number) => (
            <p key={i} style={{ color: entry.color }} className="font-semibold">
              {entry.name}: {entry.value.toFixed(2)} {entry.payload.unit}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const calculateChange = () => {
    if (trendData.length < 2) return null;
    const oldest = trendData[0].value;
    const newest = trendData[trendData.length - 1].value;
    const diff = newest - oldest;
    const pct = (diff / oldest) * 100;
    return { diff, pct, isPositive: diff >= 0 };
  };

  const change = calculateChange();

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white font-display" style={{ fontFamily: 'Space Grotesk' }}>
              India Agriculture Statistics
            </h1>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide">
              <ShieldCheck size={14} />
              OFFICIAL MoSPI
            </div>
          </div>
          <p className="text-neutral-400 text-sm max-w-2xl">
            Explore official government agricultural statistics spanning 2011 to 2024. 
            These are historical verified records, separate from AI predictions or live farm simulation data.
          </p>
        </div>
        
        {metadata && (
          <a 
            href={metadata.source_url} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm text-neutral-300"
          >
            <span>View Official Source</span>
            <ExternalLink size={14} className="text-blue-400" />
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SIDEBAR FILTERS */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card p-5 border border-blue-500/10" style={{ boxShadow: 'inset 0 0 40px rgba(59,130,246,0.03)' }}>
            <h3 className="text-sm font-semibold text-neutral-200 mb-5 flex items-center gap-2">
              <FilterX size={16} className="text-blue-400" />
              Data Explorer
            </h3>
            
            <div className="space-y-4 text-sm">
              <div>
                <label className="text-neutral-500 text-xs font-medium uppercase tracking-wider block mb-1.5">State</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <select 
                    value={selectedState} 
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full bg-neutral-900/50 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-neutral-200 outline-none focus:border-blue-500/50 appearance-none"
                  >
                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-neutral-500 text-xs font-medium uppercase tracking-wider block mb-1.5">Crop / Commodity</label>
                <select 
                  value={selectedCrop} 
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full bg-neutral-900/50 border border-white/10 rounded-xl py-2.5 px-4 text-neutral-200 outline-none focus:border-blue-500/50 appearance-none"
                >
                  {crops.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-neutral-500 text-xs font-medium uppercase tracking-wider block mb-1.5">Indicator</label>
                <select 
                  value={selectedIndicator} 
                  onChange={(e) => setSelectedIndicator(e.target.value)}
                  className="w-full bg-neutral-900/50 border border-white/10 rounded-xl py-2.5 px-4 text-neutral-200 outline-none focus:border-blue-500/50 appearance-none"
                >
                  <option value="Value of Output at Current Prices">Current Prices</option>
                  <option value="Value of Output at Constant Prices">Constant Prices (2011-12 Base)</option>
                </select>
              </div>
            </div>
            
            <button 
              onClick={() => { setSelectedState('All India'); setSelectedCrop('All Crops'); setSelectedIndicator('Value of Output at Current Prices'); }}
              className="w-full mt-6 py-2 rounded-lg border border-white/5 text-neutral-400 hover:text-white hover:bg-white/5 transition-colors text-xs font-medium"
            >
              Reset Filters
            </button>
          </div>

          {/* EXPLAIN SIMPLY MODULE */}
          <div className="glass-card p-5 relative overflow-hidden group">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-indigo-500/10 blur-2xl group-hover:bg-indigo-500/20 transition-all" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <h3 className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
                <HelpCircle size={16} /> Explain Simply
              </h3>
            </div>
            <button 
              onClick={() => setShowExplanation(!showExplanation)}
              className="w-full py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-semibold transition-colors border border-indigo-500/20"
            >
              {showExplanation ? 'Hide Explanation' : `What is "${selectedIndicator.split(' at ')[1] || selectedIndicator}"?`}
            </button>
            
            {showExplanation && (
              <div className="mt-3 p-3 bg-black/40 rounded-lg border border-white/5 text-xs text-neutral-300 leading-relaxed animate-fade-in relative z-10">
                {selectedIndicator === 'Value of Output at Current Prices' ? (
                  <p>
                    <strong className="text-white block mb-1">Current Prices:</strong> 
                    This shows the estimated monetary value of agricultural output using prices applicable for that specific year. It includes the effect of inflation.
                  </p>
                ) : (
                  <p>
                    <strong className="text-white block mb-1">Constant Prices:</strong> 
                    This shows the value adjusted for inflation, pinned to the prices of the base year (2011-12). It shows true physical growth excluding price hikes.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="lg:col-span-9 space-y-6">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-5 relative overflow-hidden">
               <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-blue-500/10 blur-2xl" />
               <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-2">Latest Value ({trendData[trendData.length-1]?.year || '-'})</div>
               <div className="text-3xl font-bold text-white mb-1">
                 {isLoading ? '...' : (trendData[trendData.length-1]?.value.toLocaleString() || 'N/A')}
               </div>
               <div className="text-xs text-neutral-400">{trendData[0]?.unit || ''}</div>
            </div>

            <div className="glass-card p-5 relative overflow-hidden">
               <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-purple-500/10 blur-2xl" />
               <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-2">Historical Base ({trendData[0]?.year || '-'})</div>
               <div className="text-3xl font-bold text-neutral-300 mb-1">
                 {isLoading ? '...' : (trendData[0]?.value.toLocaleString() || 'N/A')}
               </div>
               <div className="text-xs text-neutral-400">{trendData[0]?.unit || ''}</div>
            </div>

            <div className="glass-card p-5 relative overflow-hidden">
               <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl ${change?.isPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`} />
               <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-2">Overall Trend</div>
               <div className={`text-3xl font-bold mb-1 flex items-center gap-2 ${change?.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                 {isLoading ? '...' : (
                   <>
                    {change?.isPositive ? '+' : ''}{change?.pct.toFixed(1)}%
                    {change?.isPositive ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
                   </>
                 )}
               </div>
               <div className="text-xs text-neutral-400">Total change over period</div>
            </div>
          </div>

          {/* MAIN CHART */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Historical Output Trend</h2>
                <p className="text-xs text-neutral-500">{selectedState} • {selectedCrop}</p>
              </div>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-neutral-300 transition-colors">
                <Download size={14} /> Download CSV
              </button>
            </div>
            
            <div className="h-[350px] w-full relative">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                </div>
              ) : trendData.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-neutral-500 text-sm">
                  Data not available in the selected MoSPI dataset.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => val.toLocaleString()} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      name={selectedIndicator} 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* TRACEABILITY PANEL */}
          {metadata && (
            <div className="glass-card p-5 bg-blue-950/20 border border-blue-900/30">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 mt-1">
                  <Info size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-blue-300 mb-1">Source Traceability</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-3 text-xs text-neutral-400">
                    <div><span className="text-neutral-500">Source:</span> {metadata.source_name}</div>
                    <div><span className="text-neutral-500">Dataset:</span> {metadata.dataset_name}</div>
                    <div><span className="text-neutral-500">Period:</span> {metadata.data_period}</div>
                    <div><span className="text-neutral-500">Data Type:</span> {metadata.data_type}</div>
                  </div>
                  <p className="text-xs text-neutral-500 mt-4 italic border-t border-blue-900/30 pt-3">
                    {metadata.disclaimer}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

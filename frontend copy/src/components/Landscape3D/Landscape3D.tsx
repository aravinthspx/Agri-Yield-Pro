import React, { useState, useRef, useEffect } from 'react';
import Map, { Source, Layer, Marker } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Map as MapIcon, Droplets, Layers, CloudRain, Info, MapPin, ChevronRight, Sprout, Network } from 'lucide-react';

// Worker setup removed for GeoJSON-only rendering

const SCI_FI_STYLE = {
  version: 8,
  sources: {
    'india-border': {
      type: 'geojson',
      data: '/india.geojson'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#0a0f1d' // Deep oceanic blue/black
      }
    },
    // Outer heavy glow
    {
      id: 'india-glow-3',
      type: 'line',
      source: 'india-border',
      paint: {
        'line-color': '#06b6d4',
        'line-width': 18,
        'line-opacity': 0.15,
        'line-blur': 12
      }
    },
    // Inner medium glow
    {
      id: 'india-glow-2',
      type: 'line',
      source: 'india-border',
      paint: {
        'line-color': '#06b6d4',
        'line-width': 8,
        'line-opacity': 0.3,
        'line-blur': 4
      }
    },
    // Sharp neon border
    {
      id: 'india-core-border',
      type: 'line',
      source: 'india-border',
      paint: {
        'line-color': '#22d3ee',
        'line-width': 1.5,
        'line-opacity': 0.9
      }
    },
    // Textured landmass
    {
      id: 'india-fill',
      type: 'fill',
      source: 'india-border',
      paint: {
        'fill-color': '#0f172a',
        'fill-opacity': 0.7
      }
    }
  ]
};

const VIEWS = {
  india: { name: 'India', longitude: 80.9629, latitude: 22.5937, zoom: 4.2, pitch: 0, bearing: 0, info: 'All India Data Grid' },
  tn: { name: 'Tamil Nadu', longitude: 78.6569, latitude: 11.1271, zoom: 6.5, pitch: 0, bearing: 0, info: 'Active Nodes: 1,420 • Connectivity: High' },
  district: { name: 'Thanjavur', longitude: 79.1378, latitude: 10.7870, zoom: 9, pitch: 0, bearing: 0, info: 'Kaveri Basin • Delta Region • Live Yield' },
  farm: { name: 'My Farm', longitude: 79.15, latitude: 10.8, zoom: 16.5, pitch: 0, bearing: 0, info: 'Crop: Rice • Sensor Status: Active' }
};

// Data nodes to simulate the glowing cities in the reference image
const DATA_NODES = [
  { id: 'tn', lon: 78.6569, lat: 11.1271, label: 'TAMIL NADU' },
  { id: 'mh', lon: 75.7139, lat: 19.7515, label: 'MAHARASHTRA' },
  { id: 'up', lon: 80.9462, lat: 26.8467, label: 'UTTAR PRADESH' },
  { id: 'ka', lon: 75.7139, lat: 15.3173, label: 'KARNATAKA' },
  { id: 'wb', lon: 87.8550, lat: 22.9868, label: 'WEST BENGAL' },
  { id: 'gj', lon: 71.1924, lat: 22.2587, label: 'GUJARAT' },
  { id: 'pb', lon: 75.3412, lat: 31.1471, label: 'PUNJAB' }
];

export default function Landscape3D({ onClose }: { onClose: () => void }) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState<'india' | 'tn' | 'district' | 'farm'>('india');
  const [layers, setLayers] = useState({ network: true, rivers: false, soil: false, irrigation: false, rainfall: false });
  const [showHelp, setShowHelp] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const currentRegion = VIEWS[viewState];

  useEffect(() => {
    if (mapRef.current && isLoaded) {
      mapRef.current.flyTo({
        center: [currentRegion.longitude, currentRegion.latitude],
        zoom: currentRegion.zoom,
        pitch: currentRegion.pitch,
        bearing: currentRegion.bearing,
        duration: 3500,
        essential: true
      });
    }
  }, [viewState, isLoaded]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewState(prev => {
          if (prev === 'farm') return 'district';
          if (prev === 'district') return 'tn';
          if (prev === 'tn') return 'india';
          return prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0f1d] overflow-hidden font-sans">
      <Map
        ref={mapRef}
        mapLib={maplibregl as any}
        style={{ width: '100%', height: '100%' }}
        initialViewState={{
          longitude: VIEWS.india.longitude,
          latitude: VIEWS.india.latitude,
          zoom: VIEWS.india.zoom,
          pitch: VIEWS.india.pitch,
          bearing: VIEWS.india.bearing
        }}
        mapStyle={SCI_FI_STYLE as any}
        onLoad={() => setIsLoaded(true)}
        maxPitch={0}
        dragRotate={false}
        touchPitch={false}
        minZoom={3}
        maxZoom={18}
        onClick={() => {
          if (viewState === 'india') setViewState('tn');
          else if (viewState === 'tn') setViewState('district');
          else if (viewState === 'district') setViewState('farm');
        }}
      >
        {/* Holographic Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        {/* Network Nodes and Links (Sci-Fi Style) */}
        {layers.network && viewState !== 'farm' && (
          <>
            <Source id="network-lines" type="geojson" data={{
              type: "FeatureCollection",
              features: DATA_NODES.map((node, i) => {
                const nextNode = DATA_NODES[(i + 1) % DATA_NODES.length];
                return {
                  type: "Feature",
                  geometry: { type: "LineString", coordinates: [[node.lon, node.lat], [nextNode.lon, nextNode.lat]] },
                  properties: {}
                };
              })
            }}>
              <Layer
                id="network-glow"
                type="line"
                paint={{
                  'line-color': '#f43f5e',
                  'line-width': 4,
                  'line-opacity': 0.3,
                  'line-blur': 4
                }}
              />
              <Layer
                id="network-core"
                type="line"
                paint={{
                  'line-color': '#fb7185',
                  'line-width': 1,
                  'line-opacity': 0.8
                }}
              />
            </Source>

            {DATA_NODES.map((node) => (
              <Marker key={node.id} longitude={node.lon} latitude={node.lat} anchor="center">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-12 h-12 bg-cyan-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                  <div className="absolute w-4 h-4 bg-cyan-400 rounded-full shadow-[0_0_15px_#22d3ee]" />
                  <div className="absolute w-2 h-2 bg-white rounded-full" />
                  <div className="absolute top-6 whitespace-nowrap text-[10px] tracking-widest text-cyan-200 font-bold bg-black/50 px-2 py-0.5 rounded backdrop-blur border border-cyan-500/30">
                    {node.label}
                  </div>
                </div>
              </Marker>
            ))}
          </>
        )}

        {/* Rivers Layer */}
        {layers.rivers && (
          <Source id="rivers" type="geojson" data={{
            type: "FeatureCollection",
            features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[75.7, 12.4], [77.0, 12.0], [78.5, 11.0], [79.8, 11.1]] } }]
          }}>
            <Layer id="rivers-glow" type="line" paint={{ 'line-color': '#3b82f6', 'line-width': 8, 'line-opacity': 0.4, 'line-blur': 5 }} />
            <Layer id="rivers-core" type="line" paint={{ 'line-color': '#60a5fa', 'line-width': 2, 'line-opacity': 1 }} />
          </Source>
        )}

        {/* Farm Marker */}
        {viewState === 'farm' && (
          <Marker longitude={VIEWS.farm.longitude} latitude={VIEWS.farm.latitude} anchor="bottom">
            <div className="flex flex-col items-center animate-bounce">
              <div className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded shadow-[0_0_15px_#10b981] border border-emerald-300">
                MY FARM
              </div>
              <div className="w-0.5 h-8 bg-emerald-400 shadow-[0_0_10px_#10b981]" />
              <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_15px_#10b981] mt-1" />
            </div>
          </Marker>
        )}
      </Map>

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
        
        {/* Top Bar */}
        <div className="flex justify-between items-start">
          <button 
            onClick={onClose}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-[#0f172a]/80 hover:bg-[#1e293b] backdrop-blur-xl text-cyan-50 rounded-xl border border-cyan-900/50 transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)]"
          >
            <ArrowLeft size={18} className="text-cyan-400" />
            <span className="font-medium tracking-wide">SYSTEM DASHBOARD</span>
          </button>

          <div className="flex flex-col gap-2">
            <div className="pointer-events-auto bg-[#0f172a]/80 backdrop-blur-xl rounded-xl border border-cyan-900/50 p-3 space-y-2 shadow-[0_0_20px_rgba(6,182,212,0.1)] w-56">
              <div className="text-[10px] font-bold text-cyan-500/70 uppercase tracking-widest mb-3 ml-1">Data Overlays</div>
              {[
                { id: 'network', icon: <Network size={14} />, label: 'Agri-Data Network' },
                { id: 'rivers', icon: <Droplets size={14} />, label: 'Hydrology Sensors' },
                { id: 'soil', icon: <Layers size={14} />, label: 'Soil Composition' },
                { id: 'irrigation', icon: <Droplets size={14} />, label: 'Irrigation Matrix' },
                { id: 'rainfall', icon: <CloudRain size={14} />, label: 'Weather Patterns' },
              ].map(layer => (
                <button
                  key={layer.id}
                  onClick={() => toggleLayer(layer.id as any)}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    layers[layer.id as keyof typeof layers] 
                      ? 'bg-cyan-950/40 text-cyan-300 border border-cyan-800' 
                      : 'text-slate-400 border border-transparent hover:bg-slate-800/50'
                  }`}
                >
                  <span className={`${layers[layer.id as keyof typeof layers] ? 'text-cyan-400' : 'text-slate-500'}`}>
                    {layer.icon}
                  </span>
                  {layer.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Area */}
        <div className="flex justify-between items-end">
          {/* Breadcrumb Navigation */}
          <div className="pointer-events-auto flex gap-2">
            {(['india', 'tn', 'district', 'farm'] as const).map((step, idx) => {
              const isActive = viewState === step;
              const isPast = ['india', 'tn', 'district', 'farm'].indexOf(viewState) >= idx;
              if (!isPast) return null;

              return (
                <div key={step} className="flex items-center gap-2">
                  <button
                    onClick={() => setViewState(step)}
                    className={`px-4 py-2 rounded-xl backdrop-blur-xl border text-xs font-bold tracking-wider uppercase transition-all ${
                      isActive 
                        ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                        : 'bg-[#0f172a]/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {VIEWS[step].name}
                  </button>
                  {idx < 3 && isPast && viewState !== step && <ChevronRight className="text-cyan-800" size={16} />}
                </div>
              );
            })}
          </div>

          {/* Info Panel & AI Chat */}
          <AnimatePresence>
            {viewState !== 'india' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="pointer-events-auto w-[320px] bg-[#0f172a]/90 backdrop-blur-2xl border border-cyan-900/50 rounded-2xl p-5 shadow-[0_0_30px_rgba(6,182,212,0.15)]"
              >
                <div className="flex items-center gap-3 mb-5 border-b border-cyan-900/30 pb-4">
                  <div className="p-2 bg-cyan-950/50 rounded-lg text-cyan-400 border border-cyan-800/50">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-cyan-50 tracking-widest uppercase">{currentRegion.name}</h3>
                    <p className="text-[10px] text-cyan-500/80 tracking-widest uppercase mt-0.5">Telemetry Active</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6 text-xs text-slate-300">
                  <div className="bg-black/40 rounded-lg p-3 border border-white/5 font-mono">
                    {currentRegion.info.split('•').map((line, i) => (
                      <div key={i} className="mb-2 last:mb-0 flex items-start gap-2">
                        <span className="text-cyan-500 font-bold mt-0.5">&gt;</span>
                        <span className="tracking-wide text-cyan-100/70">{line.trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('updateFarmContext', {
                      detail: {
                        crop: currentRegion.name === 'My Farm' ? 'Rice' : undefined,
                        area: currentRegion.name === 'My Farm' ? 2.5 : undefined,
                        location: currentRegion.name,
                        water_basin: layers.rivers ? 'Kaveri Basin' : undefined,
                        soil_type: layers.soil ? 'Alluvial / Red Clay' : undefined,
                        is_3d_mode: true
                      }
                    }));
                    window.dispatchEvent(new CustomEvent('openAIChat'));
                  }}
                  className="w-full flex justify-center items-center gap-2 py-3 bg-cyan-950 hover:bg-cyan-900 text-cyan-400 font-bold tracking-widest text-xs uppercase rounded-xl transition-all border border-cyan-700 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                >
                  <Info size={14} />
                  ENGAGE AI ANALYST
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3D Control Guide */}
      <div className="absolute bottom-6 right-6 pointer-events-auto">
        <button 
          onMouseEnter={() => setShowHelp(true)}
          onMouseLeave={() => setShowHelp(false)}
          onClick={() => setShowHelp(!showHelp)}
          className="w-10 h-10 rounded-full bg-[#0f172a]/80 backdrop-blur-xl border border-cyan-900/50 text-cyan-500 flex items-center justify-center hover:bg-cyan-950 hover:text-cyan-300 transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)]"
        >
          ?
        </button>

        <AnimatePresence>
          {showHelp && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-14 right-0 w-64 bg-[#0f172a]/95 backdrop-blur-2xl border border-cyan-900/50 rounded-2xl p-5 shadow-[0_0_30px_rgba(6,182,212,0.2)] origin-bottom-right"
            >
              <h4 className="text-[10px] font-bold text-cyan-500 tracking-widest uppercase mb-4 border-b border-cyan-900/30 pb-2">Navigation Matrix</h4>
              <div className="space-y-3 text-[11px] text-slate-300 font-mono">
                <div className="flex justify-between"><span>[L_DRAG]</span><span className="text-cyan-300">PAN</span></div>
                <div className="flex justify-between"><span>[SCROLL]</span><span className="text-cyan-300">ZOOM</span></div>
                <div className="flex justify-between"><span>[CLICK]</span><span className="text-cyan-300">DRILL DOWN</span></div>
                <div className="flex justify-between"><span>[ESC]</span><span className="text-cyan-300">ABORT LEVEL</span></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

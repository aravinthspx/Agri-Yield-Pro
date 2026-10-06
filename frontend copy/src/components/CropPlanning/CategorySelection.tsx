import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Category } from './index';
import { API_BASE } from './index';

interface Props {
  onSelect: (cat: Category) => void;
}

const FALLBACK_CATEGORIES: Category[] = [
  { id: 'cereals', name: 'Cereals / Grains', icon: '🌾', description: 'Staple food grains that form the backbone of agriculture', color: '#fbbf24', bg_color: 'rgba(251,191,36,0.08)', crop_count: 8, crops: ['rice','wheat','maize','sorghum','pearl_millet','finger_millet','barley','oats'] },
  { id: 'vegetables', name: 'Vegetables', icon: '🥬', description: 'Short-duration and high-value seasonal vegetable crops', color: '#22c55e', bg_color: 'rgba(34,197,94,0.08)', crop_count: 12, crops: ['tomato','potato','onion','brinjal','cabbage','cauliflower','carrot','okra','spinach','cucumber','green_chilli','capsicum'] },
  { id: 'fruits', name: 'Fruits', icon: '🍎', description: 'Perennial and seasonal high-value fruit crops', color: '#f43f5e', bg_color: 'rgba(244,63,94,0.08)', crop_count: 10, crops: ['mango','banana','apple','orange','grapes','guava','papaya','pineapple','pomegranate','watermelon'] },
  { id: 'pulses', name: 'Pulses / Legumes', icon: '🌱', description: 'Nitrogen-fixing protein-rich legume crops for soil health', color: '#10b981', bg_color: 'rgba(16,185,129,0.08)', crop_count: 7, crops: ['chickpea','green_gram','black_gram','pigeon_pea','lentil','peas','kidney_bean'] },
  { id: 'oilseeds', name: 'Oilseeds', icon: '🛢️', description: 'Oil-bearing crops for edible oil and industrial use', color: '#f97316', bg_color: 'rgba(249,115,22,0.08)', crop_count: 7, crops: ['groundnut','sunflower','mustard','sesame','soybean','rapeseed','safflower'] },
  { id: 'commercial', name: 'Commercial / Cash Crops', icon: '🧵', description: 'High-value commercial and export-oriented industrial crops', color: '#a78bfa', bg_color: 'rgba(167,139,250,0.08)', crop_count: 8, crops: ['cotton','sugarcane','jute','tobacco','rubber','tea','coffee','cocoa'] },
  { id: 'spices', name: 'Spices', icon: '🌶️', description: 'High-value aromatic and flavoring crops with premium pricing', color: '#fb923c', bg_color: 'rgba(251,146,60,0.08)', crop_count: 8, crops: ['chilli','turmeric','ginger','garlic','coriander','cumin','black_pepper','cardamom'] },
];

export default function CategorySelection({ onSelect }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/crop-categories`)
      .then(r => r.json())
      .then(d => setCategories(d.categories || FALLBACK_CATEGORIES))
      .catch(() => setCategories(FALLBACK_CATEGORIES))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4"
          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <span className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Step 1 of 5</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-neutral-100 mb-3" style={{ fontFamily: 'Space Grotesk' }}>
          What type of crop do you want to grow?
        </h1>
        <p className="text-neutral-500 text-base max-w-xl mx-auto">
          Select a crop category to explore available crops, view detailed profiles, and create a personalized AI farming plan.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-400" size={32} /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((cat, idx) => (
            <button
              key={cat.id}
              id={`category-${cat.id}`}
              onClick={() => onSelect(cat)}
              onMouseEnter={() => setHoveredId(cat.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="text-left transition-all duration-300 animate-slide-up"
              style={{
                animationDelay: `${idx * 0.06}s`,
                animationFillMode: 'both',
              }}
            >
              <div
                className="relative overflow-hidden rounded-2xl p-5 h-full transition-all duration-300"
                style={{
                  background: hoveredId === cat.id ? cat.bg_color : 'rgba(15,23,42,0.6)',
                  border: `1px solid ${hoveredId === cat.id ? cat.color + '40' : 'rgba(255,255,255,0.06)'}`,
                  boxShadow: hoveredId === cat.id ? `0 0 30px -8px ${cat.color}30` : 'none',
                  backdropFilter: 'blur(20px)',
                  transform: hoveredId === cat.id ? 'translateY(-2px)' : 'none',
                }}
              >
                {/* Glow blob */}
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full blur-2xl opacity-20 transition-opacity duration-300"
                  style={{ background: cat.color, opacity: hoveredId === cat.id ? 0.25 : 0.08 }} />

                <div className="relative z-10">
                  {/* Icon */}
                  <div className="text-4xl mb-3 transition-transform duration-200" style={{
                    transform: hoveredId === cat.id ? 'scale(1.15)' : 'scale(1)',
                    filter: hoveredId === cat.id ? `drop-shadow(0 0 12px ${cat.color}80)` : 'none',
                  }}>
                    {cat.icon}
                  </div>

                  <h3 className="font-bold text-base text-neutral-100 mb-1" style={{ fontFamily: 'Space Grotesk' }}>
                    {cat.name}
                  </h3>
                  <p className="text-xs text-neutral-500 mb-3 leading-relaxed">{cat.description}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: cat.bg_color, color: cat.color, border: `1px solid ${cat.color}30` }}>
                      {cat.crop_count} crops
                    </span>
                    <span className="text-xs font-medium transition-all duration-200"
                      style={{ color: hoveredId === cat.id ? cat.color : '#4b5563' }}>
                      Explore →
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Demo note */}
      <div className="mt-8 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-600 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Tip: Start with a Demo Farm — select Vegetables → Tomato for a complete walkthrough
        </span>
      </div>
    </div>
  );
}

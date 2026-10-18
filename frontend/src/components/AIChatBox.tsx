import React, { useState, useEffect, useRef } from 'react';
import {
  X, Send, Loader2, Mic, Volume2, VolumeX, Copy, Check, ThumbsUp, ThumbsDown,
  RotateCcw, ChevronDown, MapPin, Thermometer, CloudRain, Sprout, Sparkles,
} from 'lucide-react';
import { API_BASE } from '../config';
import { useFarmLocation } from '../lib/farmLocation';

interface FarmContext {
  crop?: string;
  variety?: string;
  age_days?: number;
  area?: number;
  soil_ph?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  soil_moisture?: string;
  temperature?: number;
  rain_probability?: number;
  is_simulation?: boolean;
  lat?: number;
  lon?: number;
  state?: string | null;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  sources?: string[];
  action?: string;
  time: string;
}

interface AIChatBoxProps {
  userId?: number;
  farmId?: string;
  farmContext?: FarmContext;
}

const CHAT_ACTIONS: Record<string, { label: string; nav: string }> = {
  VIEW_WEATHER: { label: 'See weather', nav: 'nav-dashboard' },
  VIEW_SOIL: { label: 'See soil health', nav: 'nav-dashboard' },
  VIEW_CROP_HEALTH: { label: 'See crop health', nav: 'nav-dashboard' },
  OPEN_MARKET: { label: 'See mandi prices', nav: 'nav-mospi' },
  VIEW_YIELD_PREDICTION: { label: 'Open yield optimizer', nav: 'nav-yield-optimizer' },
  VIEW_CROP_PLAN: { label: 'Open my crop plan', nav: 'nav-crop-planning' },
  UPDATE_PLAN: { label: 'Update my crop plan', nav: 'nav-crop-planning' },
  CREATE_FARM_TASK: { label: 'Add to my crop plan', nav: 'nav-crop-planning' },
  POSTPONE_IRRIGATION: { label: 'Adjust irrigation in plan', nav: 'nav-crop-planning' },
};

// Follow-up ideas shown after an answer, keyed by the answer's action.
const FOLLOW_UPS: Record<string, string[]> = {
  VIEW_WEATHER: ['Is it good to spray today?', 'Can I irrigate today?', 'Any pest risk?'],
  OPEN_MARKET: ['When should I harvest?', 'What is my expected yield?', 'Will it rain today?'],
  VIEW_CROP_PLAN: ['When should I apply fertilizer?', 'Any pest risk?', 'Can I irrigate today?'],
  UPDATE_PLAN: ['What should I do today?', 'Will it rain today?'],
  POSTPONE_IRRIGATION: ['When should I apply fertilizer?', 'Will it rain today?'],
  VIEW_YIELD_PREDICTION: ['How can I improve my yield?', 'What is the market price?'],
  default: ['Will it rain today?', 'What is the market price?', 'Any pest risk?'],
};

// South Indian languages first; the rest sit in "More".
const CHAT_LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', speech: 'en-IN' },
  { code: 'ta', label: 'தமிழ்', short: 'தமிழ்', speech: 'ta-IN' },
  { code: 'te', label: 'తెలుగు', short: 'తెలుగు', speech: 'te-IN' },
  { code: 'kn', label: 'ಕನ್ನಡ', short: 'ಕನ್ನಡ', speech: 'kn-IN' },
  { code: 'ml', label: 'മലയാളം', short: 'മലയാളം', speech: 'ml-IN' },
  { code: 'hi', label: 'हिन्दी', short: 'हिं', speech: 'hi-IN' },
  { code: 'mr', label: 'मराठी', short: 'मरा', speech: 'mr-IN' },
  { code: 'bn', label: 'বাংলা', short: 'বাং', speech: 'bn-IN' },
  { code: 'gu', label: 'ગુજરાતી', short: 'ગુજ', speech: 'gu-IN' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', short: 'ਪੰਜਾ', speech: 'pa-IN' },
];
const PILL_LANGS = CHAT_LANGUAGES.slice(0, 5);

const TOPICS = [
  { icon: '🌦️', title: 'Weather', sub: 'Rain today?', query: 'Will it rain today?', from: '#3A86C8', to: '#7FB8E6' },
  { icon: '💧', title: 'Irrigation', sub: 'Water today?', query: 'Can I irrigate today?', from: '#1E8C9E', to: '#6CC3CF' },
  { icon: '💰', title: 'Mandi price', sub: 'Today\'s rate', query: 'What is the market price?', from: '#D98E0B', to: '#F2C14E' },
  { icon: '🌱', title: 'Crop health', sub: 'How is it?', query: 'How healthy is my crop?', from: '#2F7D32', to: '#7CB342' },
  { icon: '🧪', title: 'Fertilizer', sub: 'What & when', query: 'When should I apply fertilizer?', from: '#7E57C2', to: '#B39DDB' },
  { icon: '🐛', title: 'Pests', sub: 'Any risk?', query: 'Is there any pest risk?', from: '#C0392B', to: '#E57373' },
  { icon: '📈', title: 'Yield', sub: 'Expected harvest', query: 'What is my expected yield?', from: '#558B2F', to: '#AED581' },
  { icon: '🌾', title: 'Harvest', sub: 'When to cut', query: 'When should I harvest?', from: '#8B5A2B', to: '#C9A46A' },
];

const now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

// ─── Answer parsing: the backend marks sections with emoji headings ─────────

type SectionKind = 'answer' | 'why' | 'todo' | 'watch' | 'weather' | 'data' | 'next' | 'plain';
interface Section { kind: SectionKind; title: string; lines: string[] }

const MARKERS: [string, SectionKind][] = [
  ['🌾', 'answer'], ['📌', 'why'], ['✅', 'todo'], ['⚠️', 'watch'], ['🌦', 'weather'], ['📊', 'data'], ['📅', 'next'],
];

function parseAnswer(text: string): Section[] {
  const sections: Section[] = [];
  let cur: Section = { kind: 'plain', title: '', lines: [] };
  for (const raw of (text || '').split('\n')) {
    const line = raw.trim();
    const marker = MARKERS.find(([m]) => line.startsWith(m));
    if (marker) {
      if (cur.lines.length || cur.title) sections.push(cur);
      cur = { kind: marker[1], title: line.replace(marker[0], '').replace(/^️/, '').trim(), lines: [] };
    } else if (line) {
      cur.lines.push(line);
    }
  }
  if (cur.lines.length || cur.title) sections.push(cur);
  return sections;
}

const plainText = (text: string) =>
  parseAnswer(text).filter(s => s.kind !== 'data' && s.kind !== 'next').flatMap(s => s.lines).join('. ');

function AnswerCard({ text }: { text: string }) {
  const [showWhy, setShowWhy] = useState(false);
  const sections = parseAnswer(text);
  return (
    <div className="space-y-2.5">
      {sections.map((s, i) => {
        switch (s.kind) {
          case 'answer':
          case 'plain':
            return <div key={i} className="text-[15px] font-semibold text-neutral-100 leading-snug">{s.lines.map((l, j) => <p key={j}>{l}</p>)}</div>;
          case 'why':
            return (
              <div key={i}>
                <button onClick={() => setShowWhy(v => !v)} className="text-xs font-bold text-blue-400 flex items-center gap-1 hover:underline">
                  💡 {s.title ? s.title.charAt(0) + s.title.slice(1).toLowerCase() : 'Why'}? <ChevronDown size={12} className={showWhy ? 'rotate-180' : ''} />
                </button>
                {showWhy && <div className="mt-1 text-sm text-neutral-300 leading-relaxed animate-fade-in">{s.lines.map((l, j) => <p key={j}>{l}</p>)}</div>}
              </div>
            );
          case 'todo':
            return (
              <div key={i} className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
                <div className="text-[11px] font-extrabold tracking-wider text-emerald-400 mb-1.5">✅ WHAT TO DO</div>
                <ul className="space-y-1.5">
                  {s.lines.map((l, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-neutral-200">
                      <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-emerald-500 text-cream text-[11px] font-bold flex items-center justify-center">{j + 1}</span>
                      <span>{l.replace(/^\d+[.)]\s*/, '').replace(/^-\s*/, '')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          case 'watch':
            return (
              <div key={i} className="rounded-xl bg-amber-500/15 border border-amber-500/40 p-3 text-sm text-neutral-200 flex gap-2">
                <span className="text-lg leading-none">⚠️</span>
                <div><div className="text-[11px] font-extrabold tracking-wider text-amber-400">WATCH FOR</div>{s.lines.map((l, j) => <p key={j}>{l}</p>)}</div>
              </div>
            );
          case 'weather':
            return (
              <div key={i} className="flex flex-wrap gap-1.5">
                {s.lines.join(' | ').split('|').map(p => p.trim()).filter(Boolean).map((p, j) => (
                  <span key={j} className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold">
                    {/temp/i.test(p) ? '🌡️' : /rain/i.test(p) ? '🌧️' : '🌤️'} {p}
                  </span>
                ))}
              </div>
            );
          case 'data':
            return (
              <div key={i} className="rounded-xl bg-neutral-950/70 border border-neutral-800 p-3">
                <div className="text-[11px] font-extrabold tracking-wider text-neutral-400 mb-1">📊 {s.title || 'DETAILS'}</div>
                <ul className="space-y-1">
                  {s.lines.map((l, j) => {
                    const [name, price] = l.replace(/^-\s*/, '').split(/:\s*(?=₹)/);
                    return (
                      <li key={j} className="flex justify-between gap-2 text-sm">
                        <span className="text-neutral-300 truncate">{name}</span>
                        {price && <span className="font-extrabold text-neutral-100 shrink-0">{price}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          case 'next':
            return (
              <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold">
                📅 {s.title ? `${s.title.charAt(0)}${s.title.slice(1).toLowerCase()}: ` : ''}{s.lines.join(' ')}
              </div>
            );
        }
      })}
    </div>
  );
}

function sourceStyle(src: string) {
  if (src.includes('LIVE')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  if (src.includes('OFFICIAL')) return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  if (src.includes('USER')) return 'bg-amber-500/15 text-amber-400 border-amber-500/40';
  if (src.includes('SIMULATION')) return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
  return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
}

// ─── Component ───────────────────────────────────────────────────────────────

const AIChatBox: React.FC<AIChatBoxProps> = ({ userId, farmId, farmContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<'farmer' | 'expert'>('farmer');
  const [chatLang, setChatLang] = useState<string>('en');
  const [localFarmContext, setLocalFarmContext] = useState<FarmContext | undefined>(farmContext);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const [showTeaser, setShowTeaser] = useState(false);
  const [unread, setUnread] = useState(true);
  const place = useFarmLocation().location.name;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleContextUpdate = (e: any) => setLocalFarmContext(e.detail);
    setLocalFarmContext(prev => prev ?? (window as any).__farmContext);
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('updateFarmContext', handleContextUpdate);
    window.addEventListener('openAIChat', handleOpenChat);
    return () => {
      window.removeEventListener('updateFarmContext', handleContextUpdate);
      window.removeEventListener('openAIChat', handleOpenChat);
    };
  }, []);

  // A friendly teaser bubble next to the launcher, shown once shortly after load.
  useEffect(() => {
    const show = window.setTimeout(() => setShowTeaser(true), 2500);
    const hide = window.setTimeout(() => setShowTeaser(false), 11000);
    return () => { window.clearTimeout(show); window.clearTimeout(hide); };
  }, []);

  useEffect(() => { if (isOpen) { setUnread(false); setShowTeaser(false); } }, [isOpen]);

  const fetchHistory = async () => {
    try {
      const url = new URL(`${API_BASE || window.location.origin}/api/ai/chat/history`);
      url.searchParams.append('user_id', String(userId || 1));
      url.searchParams.append('farm_id', farmId || 'farm-1');
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      if (data && data.length > 0) {
        const historyMsgs: Message[] = [];
        data.slice(-10).forEach((log: any) => {
          const time = log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
          historyMsgs.push({ id: `user-${log.id}`, sender: 'user', text: log.message, time });
          historyMsgs.push({ id: `ai-${log.id}`, sender: 'ai', text: log.response, sources: log.sources, time });
        });
        setMessages(historyMsgs);
      }
    } catch (e) {
      console.error('Error fetching chat history', e);
    }
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const runChatAction = (action: string) => {
    document.getElementById(CHAT_ACTIONS[action]?.nav ?? 'nav-dashboard')?.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsOpen(false);
  };

  const handleSend = async (overrideInput?: string) => {
    const textToSend = (overrideInput ?? input).trim();
    if (!textToSend || isTyping) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: textToSend, time: now() }]);
    setInput('');
    setIsTyping(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          user_id: userId || 1,
          farm_id: farmId || 'farm-1',
          language: chatLang,
          mode,
          context: localFarmContext || {},
        }),
      });
      if (!res.ok) throw new Error('Failed to fetch AI response');
      const data = await res.json();
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), sender: 'ai', text: data.response, sources: data.sources, action: data.action, time: now(),
      }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), sender: 'ai', time: now(),
        text: '🌾 ANSWER\nSorry, I could not reach the farm server right now.\n\n✅ WHAT TO DO\n1. Check that the backend is running.\n2. Try your question again in a moment.',
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', time: now(), text: '🌾 ANSWER\nVoice input does not work in this browser. Please type your question, or try Chrome.' }]);
      return;
    }
    const recognition = new SR();
    recognition.lang = CHAT_LANGUAGES.find(l => l.code === chatLang)?.speech ?? 'en-IN';
    recognition.interimResults = false;
    recognition.onresult = (event: any) => { setInput(event.results[0][0].transcript); setIsListening(false); inputRef.current?.focus(); };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    setIsListening(true);
    recognition.start();
  };

  const speak = (msg: Message) => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speakingId === msg.id) { synth.cancel(); setSpeakingId(null); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(plainText(msg.text));
    u.lang = CHAT_LANGUAGES.find(l => l.code === chatLang)?.speech ?? 'en-IN';
    u.onend = () => setSpeakingId(null);
    setSpeakingId(msg.id);
    synth.speak(u);
  };

  const copy = async (msg: Message) => {
    try {
      await navigator.clipboard.writeText(plainText(msg.text));
      setCopiedId(msg.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch { /* clipboard blocked */ }
  };

  const clearChat = () => { window.speechSynthesis?.cancel(); setMessages([]); setFeedback({}); };

  const lastAi = [...messages].reverse().find(m => m.sender === 'ai');
  const followUps = !isTyping && lastAi ? (FOLLOW_UPS[lastAi.action ?? ''] ?? FOLLOW_UPS.default) : [];
  const ctx = localFarmContext;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] flex flex-col items-end font-sans">
      {isOpen && (
        <div
          role="dialog" aria-label="Krishi Mitra farm assistant"
          className="chat-pop mb-3 w-[calc(100vw-32px)] sm:w-[25rem] rounded-[28px] overflow-hidden flex flex-col bg-neutral-950 shadow-2xl border border-neutral-800"
          style={{ height: 'min(40rem, calc(100dvh - 110px))', boxShadow: '0 24px 60px -12px rgba(59,42,26,0.35)' }}
        >
          {/* Header */}
          <div className="farm-banner !rounded-none px-4 pt-4 pb-5 shrink-0">
            <div className="relative z-10 flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-cream/95 flex items-center justify-center text-2xl shadow-md">🧑‍🌾</div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#7CFC8A] border-2 border-[#2F7D32]" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-cream leading-tight" style={{ fontFamily: 'Baloo 2' }}>Krishi Mitra</h3>
                  <p className="text-[11px] text-cream/85 font-semibold">Your farm friend · replies instantly</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button onClick={clearChat} title="Start a new chat" className="p-2 rounded-xl text-cream/90 hover:bg-cream/20"><RotateCcw size={16} /></button>
                )}
                <button onClick={() => setIsOpen(false)} title="Close" className="p-2 rounded-xl text-cream/90 hover:bg-cream/20"><X size={18} /></button>
              </div>
            </div>

            {/* Live farm context */}
            <div className="relative z-10 flex flex-wrap gap-1.5 mt-3">
              {place && <span className="ctx-chip"><MapPin size={11} /> {place}</span>}
              {ctx?.crop && <span className="ctx-chip"><Sprout size={11} /> {ctx.crop}</span>}
              {ctx?.temperature != null && <span className="ctx-chip"><Thermometer size={11} /> {Math.round(ctx.temperature)}°C</span>}
              {ctx?.rain_probability != null && <span className="ctx-chip"><CloudRain size={11} /> {ctx.rain_probability}% rain</span>}
            </div>

            {/* Language + mode */}
            <div className="relative z-10 flex items-center justify-between gap-2 mt-3">
              <div className="flex gap-1 overflow-x-auto scrollbar-none">
                {PILL_LANGS.map(l => (
                  <button key={l.code} onClick={() => setChatLang(l.code)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors ${chatLang === l.code ? 'bg-cream text-emerald-400' : 'bg-cream/15 text-cream hover:bg-cream/25'}`}>
                    {l.short}
                  </button>
                ))}
                <select
                  value={PILL_LANGS.some(l => l.code === chatLang) ? '' : chatLang}
                  onChange={e => e.target.value && setChatLang(e.target.value)}
                  className="bg-cream/15 text-cream text-[11px] font-bold rounded-full px-2 py-1 outline-none cursor-pointer"
                  aria-label="More languages"
                >
                  <option value="">More</option>
                  {CHAT_LANGUAGES.slice(5).map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
              <div className="flex shrink-0 rounded-full bg-cream/15 p-0.5">
                {(['farmer', 'expert'] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${mode === m ? 'bg-cream text-emerald-400' : 'text-cream'}`}>
                    {m === 'farmer' ? '🧑‍🌾 Simple' : '🔬 Expert'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Messages / welcome */}
          <div className="flex-1 overflow-y-auto px-4 py-4 -mt-3 rounded-t-[24px] bg-neutral-950 relative z-10 space-y-4">
            {messages.length === 0 ? (
              <div className="animate-fade-in">
                <div className="text-center mb-4">
                  <div className="text-5xl mb-1 chat-float">🌾</div>
                  <h4 className="text-xl font-extrabold text-neutral-100" style={{ fontFamily: 'Baloo 2' }}>{greeting}! Vanakkam 🙏</h4>
                  <p className="text-sm text-neutral-500">What would you like to know about your farm today?</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TOPICS.map((tp, i) => (
                    <button key={tp.title} onClick={() => handleSend(tp.query)}
                      className="topic-tile group text-left rounded-2xl p-3 text-cream relative overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${tp.from}, ${tp.to})`, animationDelay: `${i * 40}ms` }}>
                      <span className="absolute -right-2 -bottom-3 text-5xl opacity-25 group-hover:scale-110 transition-transform">{tp.icon}</span>
                      <div className="text-2xl leading-none mb-1">{tp.icon}</div>
                      <div className="font-extrabold text-sm leading-tight">{tp.title}</div>
                      <div className="text-[11px] opacity-90">{tp.sub}</div>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-neutral-500 text-center mt-3">🎙️ Tap the mic to ask by voice in your language</p>
              </div>
            ) : messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} chat-msg`}>
                {msg.sender === 'ai' && <div className="w-8 h-8 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-base">🧑‍🌾</div>}
                <div className={`max-w-[85%] ${msg.sender === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={msg.sender === 'user'
                    ? 'rounded-2xl rounded-br-md px-4 py-2.5 text-sm font-semibold text-cream shadow-md'
                    : 'rounded-2xl rounded-tl-md px-4 py-3 bg-paper border border-neutral-800 shadow-sm'}
                    style={msg.sender === 'user' ? { background: 'linear-gradient(135deg, #2F7D32, #558B2F)' } : undefined}>
                    {msg.sender === 'ai' ? <AnswerCard text={msg.text} /> : msg.text}
                  </div>

                  {msg.sender === 'ai' && (
                    <>
                      {typeof msg.action === 'string' && CHAT_ACTIONS[msg.action] && (
                        <button onClick={() => runChatAction(msg.action!)}
                          className="mt-2 px-3 py-1.5 rounded-full text-xs font-bold text-cream shadow-sm hover:-translate-y-0.5 transition-transform"
                          style={{ background: 'linear-gradient(135deg, #F07F1A, #F2A71B)' }}>
                          {CHAT_ACTIONS[msg.action].label} →
                        </button>
                      )}
                      <div className="flex flex-wrap items-center gap-1 mt-1.5">
                        {(msg.sources ?? []).map((src, i) => (
                          <span key={i} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${sourceStyle(src)}`}>{src}</span>
                        ))}
                        <span className="text-[10px] text-neutral-500 ml-1">{msg.time}</span>
                        <span className="flex items-center ml-auto">
                          <button onClick={() => speak(msg)} title={speakingId === msg.id ? 'Stop' : 'Read aloud'}
                            className={`p-1 rounded-md hover:bg-white/5 ${speakingId === msg.id ? 'text-emerald-400' : 'text-neutral-500'}`}>
                            {speakingId === msg.id ? <VolumeX size={13} /> : <Volume2 size={13} />}
                          </button>
                          <button onClick={() => copy(msg)} title="Copy" className="p-1 rounded-md hover:bg-white/5 text-neutral-500">
                            {copiedId === msg.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                          </button>
                          <button onClick={() => setFeedback(f => ({ ...f, [msg.id]: 'up' }))} title="Helpful"
                            className={`p-1 rounded-md hover:bg-white/5 ${feedback[msg.id] === 'up' ? 'text-emerald-400' : 'text-neutral-500'}`}><ThumbsUp size={13} /></button>
                          <button onClick={() => setFeedback(f => ({ ...f, [msg.id]: 'down' }))} title="Not helpful"
                            className={`p-1 rounded-md hover:bg-white/5 ${feedback[msg.id] === 'down' ? 'text-red-400' : 'text-neutral-500'}`}><ThumbsDown size={13} /></button>
                        </span>
                      </div>
                    </>
                  )}
                  {msg.sender === 'user' && <span className="text-[10px] text-neutral-500 mt-1">{msg.time}</span>}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 chat-msg">
                <div className="w-8 h-8 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-base">🧑‍🌾</div>
                <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-paper border border-neutral-800 flex items-center gap-2">
                  <span className="text-xs font-semibold text-neutral-500">Checking your farm</span>
                  <span className="flex gap-1">
                    {[0, 1, 2].map(i => <span key={i} className="typing-seed" style={{ animationDelay: `${i * 0.15}s` }}>🌱</span>)}
                  </span>
                </div>
              </div>
            )}

            {followUps.length > 0 && messages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-10 animate-fade-in">
                {followUps.map(q => (
                  <button key={q} onClick={() => handleSend(q)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-cream transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Topic strip once chatting */}
          {messages.length > 0 && (
            <div className="shrink-0 px-3 pt-2 flex gap-1.5 overflow-x-auto scrollbar-none bg-neutral-950">
              {TOPICS.map(tp => (
                <button key={tp.title} onClick={() => handleSend(tp.query)} disabled={isTyping}
                  className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border border-neutral-800 bg-paper text-neutral-300 hover:border-emerald-400 hover:text-emerald-400 disabled:opacity-50">
                  {tp.icon} {tp.title}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="shrink-0 p-3 bg-neutral-950">
            <div className="flex items-center gap-1.5 rounded-full bg-paper border-2 border-neutral-800 focus-within:border-emerald-400 p-1 pl-1.5 shadow-sm transition-colors">
              <button onClick={handleVoice} title="Ask by voice"
                className={`relative w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-colors ${isListening ? 'bg-red-500 text-cream' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}>
                {isListening && <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />}
                <Mic size={18} className="relative" />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                placeholder={isListening ? 'Listening… speak now' : 'Ask about your farm…'}
                className="flex-1 min-w-0 bg-transparent outline-none text-sm font-medium text-neutral-100 px-1 placeholder:text-neutral-500"
              />
              <button onClick={() => handleSend()} disabled={!input.trim() || isTyping} title="Send"
                className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-cream disabled:opacity-40 transition-transform enabled:hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #2F7D32, #F2A71B)' }}>
                {isTyping ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
              </button>
            </div>
            <p className="text-[10px] text-neutral-500 text-center mt-1.5 flex items-center justify-center gap-1">
              <Sparkles size={10} /> Uses live weather & mandi prices for your farm
            </p>
          </div>
        </div>
      )}

      {/* Launcher */}
      {!isOpen && (
        <div className="relative flex items-end gap-2">
          {showTeaser && (
            <button onClick={() => setIsOpen(true)}
              className="chat-teaser mb-2 max-w-[220px] text-left rounded-2xl rounded-br-md bg-paper border border-neutral-800 shadow-xl px-3.5 py-2.5">
              <div className="text-sm font-extrabold text-neutral-100">Vanakkam! 🙏</div>
              <div className="text-xs text-neutral-400">Ask me about rain, mandi prices or pests.</div>
            </button>
          )}
          <button onClick={() => setIsOpen(true)} aria-label="Open Krishi Mitra assistant"
            className="chat-launcher relative w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-2xl hover:scale-110 active:scale-95 transition-transform"
            style={{ background: 'linear-gradient(135deg, #2F7D32 0%, #7CB342 55%, #F2A71B 100%)' }}>
            <span className="absolute inset-0 rounded-full chat-ring" />
            <span className="relative">🧑‍🌾</span>
            {unread && <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-red-500 border-2 border-paper text-[10px] font-bold text-cream flex items-center justify-center">1</span>}
          </button>
        </div>
      )}
    </div>
  );
};

export default AIChatBox;

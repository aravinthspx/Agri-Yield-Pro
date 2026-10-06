import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, MessageSquare, Loader2, Mic, Sun, Thermometer, Droplets, Leaf, ShieldAlert, CheckCircle, BarChart3, Database, Info, Activity } from 'lucide-react';

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
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  sources?: string[];
  action?: string;
}

interface AIChatBoxProps {
  userId?: number;
  farmId?: string;
  farmContext?: FarmContext;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const CHAT_LANGUAGES = [
  { code: 'en', label: 'English', speech: 'en-IN' },
  { code: 'hi', label: 'हिन्दी', speech: 'hi-IN' },
  { code: 'te', label: 'తెలుగు', speech: 'te-IN' },
  { code: 'ml', label: 'മലയാളം', speech: 'ml-IN' },
  { code: 'ta', label: 'தமிழ்', speech: 'ta-IN' },
  { code: 'kn', label: 'ಕನ್ನಡ', speech: 'kn-IN' },
  { code: 'mr', label: 'मराठी', speech: 'mr-IN' },
  { code: 'bn', label: 'বাংলা', speech: 'bn-IN' },
  { code: 'gu', label: 'ગુજરાતી', speech: 'gu-IN' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', speech: 'pa-IN' },
];

const AIChatBox: React.FC<AIChatBoxProps> = ({ userId, farmId, farmContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<'farmer' | 'expert'>('farmer');
  const [chatLang, setChatLang] = useState<string>('en');
  const [localFarmContext, setLocalFarmContext] = useState<FarmContext | undefined>(farmContext);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleContextUpdate = (e: any) => {
      setLocalFarmContext(e.detail);
    };
    const handleOpenChat = () => {
      setIsOpen(true);
    };
    window.addEventListener('updateFarmContext', handleContextUpdate);
    window.addEventListener('openAIChat', handleOpenChat);
    return () => {
      window.removeEventListener('updateFarmContext', handleContextUpdate);
      window.removeEventListener('openAIChat', handleOpenChat);
    };
  }, []);

  const QUICK_QUESTIONS = [
    { label: '🌦 Weather', query: 'Will it rain today?' },
    { label: '💧 Irrigation', query: 'Can I irrigate today?' },
    { label: '🌱 Health', query: 'How healthy is my crop?' },
    { label: '🌾 Fertilizer', query: 'When should I apply fertilizer?' },
    { label: '📈 Yield', query: 'What is my expected yield?' },
    { label: '🦠 Pests', query: 'Is there any pest risk?' },
    { label: '🌻 Harvest', query: 'When should I harvest?' },
    { label: '💰 Market', query: 'What is the market price?' },
  ];

  const fetchHistory = async () => {
    const effectiveUserId = userId || 1;
    const effectiveFarmId = farmId || "farm-1";
    
    try {
      const url = new URL(`${API_BASE}/api/ai/chat/history`);
      url.searchParams.append('user_id', effectiveUserId.toString());
      url.searchParams.append('farm_id', effectiveFarmId);
      
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch history');
      
      const data = await res.json();
      if (data && data.length > 0) {
        const historyMsgs: Message[] = [];
        data.forEach((log: any) => {
          historyMsgs.push({ id: `user-${log.id}`, sender: 'user', text: log.message });
          historyMsgs.push({ id: `ai-${log.id}`, sender: 'ai', text: log.response, sources: log.sources });
        });
        setMessages(historyMsgs);
      } else {
        addGreeting();
      }
    } catch (e) {
      console.error("Error fetching chat history", e);
      addGreeting();
    }
  };

  const addGreeting = () => {
    setMessages([
      {
        id: '1',
        sender: 'ai',
        text: '🌾 ANSWER\nHello! I am your Agri-Yield AI assistant.\n\n📌 HOW I CAN HELP\nI can help you with crop planning, weather intelligence, and farm management.\n\n✅ WHAT TO DO\nSelect a quick question below or ask me anything.',
        sources: ['🟣 AI PREDICTION']
      }
    ]);
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      fetchHistory();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: textToSend.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const payload = {
        message: textToSend.trim(),
        user_id: userId || 1, // Default user_id if not provided
        farm_id: farmId || "farm-1",
        language: chatLang,
        mode: mode,
        context: localFarmContext || {}
      };
      
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Failed to fetch AI response');
      const data = await res.json();
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.response,
        sources: data.sources,
        action: data.action
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: 'Sorry, I am having trouble connecting to the farm intelligence network right now.',
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    
    setIsListening(true);
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    const langObj = CHAT_LANGUAGES.find(l => l.code === chatLang);
    recognition.lang = langObj ? langObj.speech : 'en-IN';
    recognition.interimResults = false;
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    
    recognition.onerror = () => {
      setIsListening(false);
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    recognition.start();
  };

  const getSourceIcon = (src: string) => {
    if (!src || typeof src !== 'string') return <Info size={12} />;
    if (src.includes('LIVE')) return <Activity size={12} />;
    if (src.includes('OFFICIAL')) return <CheckCircle size={12} />;
    if (src.includes('USER')) return <Database size={12} />;
    if (src.includes('AI')) return <Bot size={12} />;
    if (src.includes('SIMULATION')) return <Sun size={12} />;
    return <Info size={12} />;
  };

  const getSourceColor = (src: string) => {
    if (!src || typeof src !== 'string') return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    if (src.includes('LIVE')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (src.includes('OFFICIAL')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (src.includes('USER')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (src.includes('AI')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (src.includes('SIMULATION')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  // Structured message parser
  const renderFormattedMessage = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('🌾')) {
        return <h4 key={idx} className="font-bold text-emerald-400 mb-1 flex items-center gap-1"><Leaf size={14} /> {line.replace('🌾', '').trim()}</h4>;
      }
      if (line.startsWith('📌')) {
        return <h4 key={idx} className="font-bold text-blue-400 mt-3 mb-1 flex items-center gap-1"><Info size={14} /> {line.replace('📌', '').trim()}</h4>;
      }
      if (line.startsWith('✅')) {
        return <h4 key={idx} className="font-bold text-green-400 mt-3 mb-1 flex items-center gap-1"><CheckCircle size={14} /> {line.replace('✅', '').trim()}</h4>;
      }
      if (line.startsWith('⚠️')) {
        return <h4 key={idx} className="font-bold text-yellow-400 mt-3 mb-1 flex items-center gap-1"><ShieldAlert size={14} /> {line.replace('⚠️', '').trim()}</h4>;
      }
      if (line.startsWith('🌦')) {
        return <h4 key={idx} className="font-bold text-cyan-400 mt-3 mb-1 flex items-center gap-1"><Sun size={14} /> {line.replace('🌦', '').trim()}</h4>;
      }
      if (line.startsWith('📊')) {
        return <h4 key={idx} className="font-bold text-purple-400 mt-3 mb-1 flex items-center gap-1"><Database size={14} /> {line.replace('📊', '').trim()}</h4>;
      }
      if (line.startsWith('📅')) {
        return <h4 key={idx} className="font-bold text-orange-400 mt-3 mb-1 flex items-center gap-1"><BarChart3 size={14} /> {line.replace('📅', '').trim()}</h4>;
      }
      if (line.trim() === '') return <br key={idx} />;
      return <p key={idx} className="mb-0.5">{line}</p>;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end font-sans">
      {isOpen && (
        <div className="mb-4 w-[24rem] sm:w-[26rem] rounded-2xl overflow-hidden border border-emerald-500/30 shadow-2xl shadow-emerald-900/20 transform transition-all duration-300 flex flex-col"
          style={{ 
            height: '38rem',
            background: 'rgba(5, 10, 14, 0.90)', 
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)'
          }}>
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10"
               style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(52,211,153,0.05))' }}>
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide" style={{ fontFamily: 'Space Grotesk' }}>AI Farmer Assistant</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400/80"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online</span>
                  <div className="h-2 w-[1px] bg-white/20"></div>
                  <button onClick={() => setMode(mode === 'farmer' ? 'expert' : 'farmer')} className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${mode === 'expert' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'}`}>
                    {mode === 'expert' ? 'Expert' : 'Farmer'}
                  </button>
                  <div className="h-2 w-[1px] bg-white/20"></div>
                  <select
                    value={chatLang}
                    onChange={(e) => setChatLang(e.target.value)}
                    className="text-[10px] bg-white/5 text-emerald-300 border border-white/10 rounded px-1 py-0.5 outline-none cursor-pointer"
                  >
                    {CHAT_LANGUAGES.map(l => (
                      <option key={l.code} value={l.code} className="bg-neutral-900 text-white">
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg">
              <X size={20} />
            </button>
          </div>

          {/* Quick Questions */}
          <div className="p-3 border-b border-white/5 bg-black/20 flex gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
            {QUICK_QUESTIONS.map((q, i) => (
              <button 
                key={i} 
                onClick={() => handleSend(q.query)}
                className="text-xs px-3 py-1.5 rounded-full bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 text-neutral-300 hover:text-emerald-400 transition-all flex items-center gap-1"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
                <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg ${
                  msg.sender === 'user' 
                    ? 'bg-emerald-600 text-white rounded-br-sm' 
                    : 'bg-white/5 border border-white/10 text-neutral-200 rounded-bl-sm backdrop-blur-md'
                }`}>
                  {msg.sender === 'ai' ? renderFormattedMessage(msg.text) : msg.text}
                </div>
                
                {msg.sender === 'ai' && Array.isArray(msg.sources) && (
                  <div className="flex flex-wrap gap-2 mt-2 ml-1">
                    {msg.sources.map((src, i) => (
                      <span key={i} className={`flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded border ${getSourceColor(src)}`}>
                        {getSourceIcon(src)}
                        {src}
                      </span>
                    ))}
                  </div>
                )}
                
                {msg.sender === 'ai' && typeof msg.action === 'string' && (
                  <div className="mt-2 ml-1">
                    <button className="text-[11px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg transition-colors">
                      Confirm Action: {msg.action.replace(/_/g, ' ')}
                    </button>
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-400/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-emerald-400/60 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-white/10 bg-neutral-950/80">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1 pr-1.5 focus-within:border-emerald-500/50 transition-colors">
              <button 
                onClick={handleVoice}
                className={`p-2 rounded-lg transition-colors ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-neutral-400 hover:text-emerald-400 hover:bg-white/5'}`}
              >
                <Mic size={18} />
              </button>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening..." : "Ask your Agri Assistant..."} 
                className="flex-1 bg-transparent border-none outline-none text-sm text-white px-2 py-2 placeholder:text-neutral-500"
              />
              <button 
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="p-2.5 rounded-lg bg-emerald-500 text-neutral-950 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              >
                {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <div className="relative group">
          <div className="absolute -inset-1 rounded-full bg-emerald-500/20 blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <button 
            onClick={() => setIsOpen(true)}
            className="relative p-4 rounded-full shadow-2xl shadow-emerald-500/30 transform transition-all duration-300 hover:scale-110 active:scale-95 bg-gradient-to-r from-emerald-500 to-emerald-400 text-neutral-950 hover:shadow-emerald-500/40 border border-emerald-300/20"
          >
            <MessageSquare size={26} className="drop-shadow-sm" />
            <div className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-neutral-950 rounded-full shadow-sm animate-pulse"></div>
          </button>
        </div>
      )}
    </div>
  );
};

export default AIChatBox;

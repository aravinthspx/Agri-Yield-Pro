import React, { useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Sprout, LayoutDashboard, Map, LogOut, UserPlus, Brain } from 'lucide-react'
import Dashboard from './components/Dashboard'
import CropPlanning from './components/CropPlanning'
import MospiExplorer from './components/MospiExplorer/MospiExplorer'
import YieldOptimizer from './components/YieldOptimizer/YieldOptimizer'
import AIChatBox from './components/AIChatBox'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './components/auth/Login'
import Register from './components/auth/Register'

type AppTab = 'dashboard' | 'yield-optimizer' | 'crop-planning' | 'mospi-explorer'

function MainApp() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard')
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleAddAccount = () => {
    navigate('/register');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-emerald-500/30">
      <nav
        className="sticky top-0 z-50 border-b border-white/5"
        style={{ background: 'rgba(5,10,14,0.85)', backdropFilter: 'blur(20px)' }}
      >
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 flex items-center gap-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mr-4">
            <div className="p-1.5 rounded-xl"
              style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(16,185,129,0.1))', border: '1px solid rgba(52,211,153,0.2)' }}>
              <Sprout size={18} className="text-emerald-400" />
            </div>
            <span className="text-sm font-bold gradient-text-emerald hidden sm:block" style={{ fontFamily: 'Space Grotesk' }}>
              Agri-Yield Pro
            </span>
          </div>

          {/* Nav Tabs */}
          <div className="flex gap-1">
            <button
              id="nav-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'dashboard'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                }`}
            >
              <LayoutDashboard size={15} />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <button
              id="nav-yield-optimizer"
              onClick={() => setActiveTab('yield-optimizer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'yield-optimizer'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                }`}
            >
              <Brain size={15} />
              <span className="hidden sm:inline">AI Yield Optimizer</span>
            </button>
            <button
              id="nav-crop-planning"
              onClick={() => setActiveTab('crop-planning')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'crop-planning'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                }`}
            >
              <Sprout size={15} />
              <span className="hidden sm:inline">Crop Planning</span>
            </button>
            <button
              id="nav-mospi"
              onClick={() => setActiveTab('mospi-explorer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'mospi-explorer'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                }`}
            >
              <Map size={15} />
              <span className="hidden sm:inline">India Agriculture</span>
            </button>
          </div>

          <div className="flex-1" />

          {/* User Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddAccount}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all border border-transparent hover:border-emerald-500/20"
            >
              <UserPlus size={15} />
              <span className="hidden sm:inline">Add Account</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Page Content ── */}
      {/* ── Page Content ── */}
      <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
        <Dashboard />
      </div>
      <div style={{ display: activeTab === 'yield-optimizer' ? 'block' : 'none' }}>
        <YieldOptimizer />
      </div>
      <div style={{ display: activeTab === 'crop-planning' ? 'block' : 'none' }}>
        <CropPlanning />
      </div>
      <div style={{ display: activeTab === 'mospi-explorer' ? 'block' : 'none' }}>
        <MospiExplorer />
      </div>
      
      <ErrorBoundary>
        <AIChatBox />
      </ErrorBoundary>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<MainApp />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App

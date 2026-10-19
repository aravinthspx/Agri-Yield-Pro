import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Sprout, LayoutDashboard, Map, Brain } from 'lucide-react'
import Dashboard from './components/Dashboard'
import CropPlanning from './components/CropPlanning'
import IndiaAgriculture from './components/IndiaAgriculture/IndiaAgriculture'
import YieldOptimizer from './components/YieldOptimizer/YieldOptimizer'
import AIChatBox from './components/AIChatBox'
import NotificationCenter from './components/NotificationCenter'
import AccountMenu from './components/auth/AccountMenu'
import { getToken, clearSession, authJson, saveUser, type AuthUser } from './lib/auth'
import ErrorBoundary from './components/ErrorBoundary'
import ServerWakeBanner from './components/ServerWakeBanner'
import Login from './components/auth/Login'
import Register from './components/auth/Register'

type AppTab = 'dashboard' | 'yield-optimizer' | 'crop-planning' | 'mospi-explorer'

function MainApp() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard')


  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans selection:bg-emerald-500/30">
      <nav
        className="sticky top-0 z-50 border-b border-white/5"
        style={{ background: 'rgba(251,246,234,0.85)', backdropFilter: 'blur(20px)' }}
      >
        <div className="max-w-[1600px] mx-auto px-3 md:px-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5 justify-self-start">
            <div className="p-1.5 rounded-xl"
              style={{ background: 'linear-gradient(135deg, rgba(47,125,50,0.2), rgba(47,125,50,0.1))', border: '1px solid rgba(47,125,50,0.2)' }}>
              <Sprout size={18} className="text-emerald-400" />
            </div>
            <span className="text-sm font-bold gradient-text-emerald hidden sm:block" style={{ fontFamily: 'Baloo 2' }}>
              Agri-Yield Pro
            </span>
          </div>

          {/* Nav Tabs */}
          <div className="flex gap-0.5 sm:gap-1 justify-self-center">
            <button
              id="nav-dashboard"
              title="Dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-2 sm:px-3 lg:px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'dashboard'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                }`}
            >
              <LayoutDashboard size={15} />
              <span className="hidden lg:inline">Dashboard</span>
            </button>
            <button
              id="nav-yield-optimizer"
              title="AI Yield Optimizer"
              onClick={() => setActiveTab('yield-optimizer')}
              className={`flex items-center gap-2 px-2 sm:px-3 lg:px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'yield-optimizer'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                }`}
            >
              <Brain size={15} />
              <span className="hidden lg:inline">AI Yield Optimizer</span>
            </button>
            <button
              id="nav-crop-planning"
              title="Crop Planning"
              onClick={() => setActiveTab('crop-planning')}
              className={`flex items-center gap-2 px-2 sm:px-3 lg:px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'crop-planning'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                }`}
            >
              <Sprout size={15} />
              <span className="hidden lg:inline">Crop Planning</span>
            </button>
            <button
              id="nav-mospi"
              title="India Agriculture"
              onClick={() => setActiveTab('mospi-explorer')}
              className={`flex items-center gap-2 px-2 sm:px-3 lg:px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'mospi-explorer'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                }`}
            >
              <Map size={15} />
              <span className="hidden lg:inline">India Agriculture</span>
            </button>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-0.5 sm:gap-2 justify-self-end">
            <NotificationCenter />
            <AccountMenu />
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
        <IndiaAgriculture />
      </div>
      
      <ErrorBoundary>
        <AIChatBox />
      </ErrorBoundary>
    </div>
  )
}

/** Sends visitors without a valid session to the login page. */
function RequireAuth({ children }: { children: React.ReactElement }) {
  const navigate = useNavigate();
  const token = getToken();
  useEffect(() => {
    if (!token) return;
    authJson<AuthUser>('/api/auth/me')
      .then(saveUser)
      .catch(err => {
        if (/log in|expired|not found/i.test(String(err?.message))) { clearSession(); navigate('/login', { replace: true }); }
      });
  }, [token, navigate]);
  return token ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <>
    <ServerWakeBanner />
    <Routes>
      <Route path="/" element={<Navigate to={getToken() ? '/dashboard' : '/login'} replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<RequireAuth><MainApp /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </>
  )
}

export default App

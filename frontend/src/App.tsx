import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
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

const TABS: { id: AppTab; domId: string; label: string; Icon: typeof Sprout }[] = [
  { id: 'dashboard', domId: 'nav-dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'yield-optimizer', domId: 'nav-yield-optimizer', label: 'AI Yield Optimizer', Icon: Brain },
  { id: 'crop-planning', domId: 'nav-crop-planning', label: 'Crop Planning', Icon: Sprout },
  { id: 'mospi-explorer', domId: 'nav-mospi', label: 'India Agriculture', Icon: Map },
]

/** Page tabs; a highlight slides to the active one. Button ids are used by other components to switch tabs. */
function NavTabs({ active, onChange }: { active: AppTab; onChange: (t: AppTab) => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ left: 0, width: 0 })
  useLayoutEffect(() => {
    const measure = () => {
      const el = wrap.current?.querySelector<HTMLElement>(`[data-tab="${active}"]`)
      if (el) setBox({ left: el.offsetLeft, width: el.offsetWidth })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [active])
  return (
    <div ref={wrap} className="relative flex gap-0.5 sm:gap-1 justify-self-center p-1 rounded-2xl bg-neutral-900/60">
      <span className="tab-indicator" style={{ left: box.left, width: box.width, opacity: box.width ? 1 : 0 }} aria-hidden />
      {TABS.map(({ id, domId, label, Icon }) => (
        <button key={id} id={domId} data-tab={id} title={label} onClick={() => onChange(id)} aria-current={active === id ? 'page' : undefined}
          className={`relative z-10 flex items-center gap-2 px-2.5 sm:px-3 lg:px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${active === id ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-200'}`}>
          <Icon size={15} />
          <span className="hidden lg:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}

function MainApp() {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard')


  return (
    <div className="min-h-screen text-white font-sans selection:bg-emerald-500/30">
      <nav className="sticky top-0 z-50 px-2 sm:px-4 pt-2 sm:pt-3">
        <div className="nav-float max-w-[1500px] mx-auto px-2 sm:px-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2.5 justify-self-start">
            <div className="p-1.5 rounded-xl shadow-sm" style={{ background: 'linear-gradient(135deg, #2F7D32, #7CB342)' }}>
              <Sprout size={18} className="text-cream" />
            </div>
            <span className="text-base font-extrabold hidden sm:block bg-clip-text text-transparent"
              style={{ fontFamily: 'Baloo 2', backgroundImage: 'linear-gradient(135deg, #2F7D32, #6FA83A 60%, #D98E0B)' }}>
              Agri-Yield Pro
            </span>
          </div>

          {/* Nav Tabs with a sliding highlight */}
          <NavTabs active={activeTab} onChange={setActiveTab} />

          {/* User Actions */}
          <div className="flex items-center gap-0.5 sm:gap-2 justify-self-end">
            <NotificationCenter />
            <AccountMenu />
          </div>
        </div>
      </nav>

      {/* ── Page Content ── */}
      <div className={activeTab === 'dashboard' ? 'page-enter' : ''} style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>
        <Dashboard />
      </div>
      <div className={activeTab === 'yield-optimizer' ? 'page-enter' : ''} style={{ display: activeTab === 'yield-optimizer' ? 'block' : 'none' }}>
        <YieldOptimizer />
      </div>
      <div className={activeTab === 'crop-planning' ? 'page-enter' : ''} style={{ display: activeTab === 'crop-planning' ? 'block' : 'none' }}>
        <CropPlanning />
      </div>
      <div className={activeTab === 'mospi-explorer' ? 'page-enter' : ''} style={{ display: activeTab === 'mospi-explorer' ? 'block' : 'none' }}>
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

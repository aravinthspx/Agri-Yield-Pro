import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { User, KeyRound, UserPlus, LogOut, X, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth, authJson, saveUser, clearSession, passwordProblems, cleanPhone, validPhone, type AuthUser } from '../../lib/auth';
import { PasswordChecklist } from './Login';

const field = 'w-full bg-paper border-2 border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm font-medium text-neutral-100 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/15';
const SOUTH_STATES = ['Tamil Nadu', 'Kerala', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Puducherry'];

function Avatar({ user, size = 32 }: { user: AuthUser | null; size?: number }) {
  const initials = (user?.full_name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return user?.profile_photo
    ? <img src={user.profile_photo} alt="" referrerPolicy="no-referrer" className="rounded-full object-cover" style={{ width: size, height: size }} />
    : (
      <span className="rounded-full flex items-center justify-center font-extrabold text-cream"
        style={{ width: size, height: size, fontSize: size * 0.4, background: 'linear-gradient(135deg, #2F7D32, #F2A71B)' }}>
        {initials}
      </span>
    );
}

export default function AccountMenu() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<'profile' | 'password' | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const logout = () => { clearSession(); navigate('/login'); };

  return (
    <div ref={boxRef} className="relative">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="Account menu"
        className={`flex items-center gap-2 p-1 sm:pr-3 rounded-full border transition-colors ${open ? 'border-emerald-400 bg-emerald-500/10' : 'border-neutral-800 hover:border-emerald-400'}`}>
        <Avatar user={user} />
        <span className="hidden md:inline text-sm font-bold text-neutral-200 max-w-[110px] truncate">{user?.full_name?.split(' ')[0] ?? 'Account'}</span>
      </button>

      {open && (
        <div className="chat-pop absolute right-0 mt-2 w-72 glass-card !rounded-2xl shadow-2xl overflow-hidden z-[60]" style={{ transformOrigin: 'top right' }}>
          <div className="flex items-center gap-3 p-4 border-b border-neutral-800">
            <Avatar user={user} size={44} />
            <div className="min-w-0">
              <div className="font-extrabold text-neutral-100 truncate">{user?.full_name ?? 'Guest'}</div>
              <div className="text-xs text-neutral-500 truncate">{user?.email}</div>
              {user?.phone && <div className="text-xs text-neutral-500">{user.phone}</div>}
              <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {user?.auth_provider === 'google' ? 'Google account' : 'Agri-Yield account'}
              </span>
            </div>
          </div>
          {[
            { icon: <User size={16} />, label: 'My profile', onClick: () => setDialog('profile') },
            { icon: <KeyRound size={16} />, label: user?.has_password === false ? 'Set a password' : 'Change password', onClick: () => setDialog('password') },
            { icon: <UserPlus size={16} />, label: 'Add another account', onClick: () => navigate('/register') },
          ].map(item => (
            <button key={item.label} onClick={() => { setOpen(false); item.onClick(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-neutral-200 hover:bg-emerald-500/10 hover:text-emerald-400">
              {item.icon}{item.label}
            </button>
          ))}
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/10 border-t border-neutral-800">
            <LogOut size={16} /> Log out
          </button>
        </div>
      )}

      {dialog && user && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && setDialog(null)}>
          <div className="chat-pop glass-card w-full max-w-md p-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-extrabold text-neutral-100" style={{ fontFamily: 'Baloo 2' }}>
                {dialog === 'profile' ? '👤 My profile' : user.has_password ? '🔑 Change password' : '🔑 Set a password'}
              </h3>
              <button onClick={() => setDialog(null)} className="p-1.5 rounded-lg hover:bg-white/5" aria-label="Close"><X size={18} /></button>
            </div>
            {dialog === 'profile' ? <ProfileForm user={user} onDone={() => setDialog(null)} /> : <PasswordForm user={user} onDone={() => setDialog(null)} />}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function ProfileForm({ user, onDone }: { user: AuthUser; onDone: () => void }) {
  const [form, setForm] = useState({
    full_name: user.full_name ?? '', phone: (user.phone ?? '').replace(/^\+91/, ''), state: user.state ?? '',
    district: user.district ?? '', village: user.village ?? '', preferred_language: user.preferred_language ?? 'English',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const digits = cleanPhone(form.phone);
    if (digits && !validPhone(digits)) { setError('Enter a valid 10-digit mobile number.'); return; }
    setSaving(true);
    try {
      saveUser(await authJson<AuthUser>('/api/auth/me', 'PATCH', { ...form, phone: digits || null }));
      onDone();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not save'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm font-semibold text-neutral-300">Full name<input value={form.full_name} onChange={set('full_name')} className={`${field} mt-1`} required /></label>
      <label className="block text-sm font-semibold text-neutral-300">Mobile number <span className="font-normal text-neutral-500">(for OTP login & password reset)</span>
        <div className="relative mt-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-neutral-400">+91</span>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: cleanPhone(e.target.value) }))} inputMode="numeric" className={`${field} !pl-12 tracking-wider`} placeholder="98765 43210" />
        </div>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-semibold text-neutral-300">State
          <select value={form.state} onChange={set('state')} className={`${field} mt-1`}>
            <option value="">Choose…</option>
            {SOUTH_STATES.map(s => <option key={s}>{s}</option>)}
            {form.state && !SOUTH_STATES.includes(form.state) && <option>{form.state}</option>}
          </select>
        </label>
        <label className="block text-sm font-semibold text-neutral-300">District<input value={form.district} onChange={set('district')} className={`${field} mt-1`} /></label>
      </div>
      <label className="block text-sm font-semibold text-neutral-300">Village / town<input value={form.village} onChange={set('village')} className={`${field} mt-1`} /></label>
      <label className="block text-sm font-semibold text-neutral-300">Preferred language
        <select value={form.preferred_language} onChange={set('preferred_language')} className={`${field} mt-1`}>
          {['English', 'தமிழ் (Tamil)', 'తెలుగు (Telugu)', 'ಕನ್ನಡ (Kannada)', 'മലയാളം (Malayalam)', 'हिन्दी (Hindi)'].map(l => <option key={l}>{l}</option>)}
        </select>
      </label>
      {error && <p className="text-sm text-red-400">⚠️ {error}</p>}
      <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-cream font-bold flex items-center justify-center gap-2 disabled:opacity-60">
        {saving && <Loader2 size={16} className="animate-spin" />} Save profile
      </button>
    </form>
  );
}

function PasswordForm({ user, onDone }: { user: AuthUser; onDone: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const problems = passwordProblems(next);
    if (problems.length) { setError(`New password needs ${problems.join(', ')}.`); return; }
    if (next !== confirm) { setError('The two new passwords do not match.'); return; }
    setSaving(true);
    try {
      const r = await authJson<{ user: AuthUser }>('/api/auth/password/change', 'POST', { current_password: user.has_password ? current : null, new_password: next });
      saveUser(r.user);
      setDone(true);
      window.setTimeout(onDone, 1400);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not change password'); }
    finally { setSaving(false); }
  };

  if (done) return <p className="text-emerald-400 font-bold flex items-center gap-2"><ShieldCheck size={18} /> Password updated.</p>;

  return (
    <form onSubmit={submit} className="space-y-3">
      {!user.has_password && <p className="text-sm text-neutral-400">You signed in with Google. Set a password to also log in with your email.</p>}
      {user.has_password && (
        <label className="block text-sm font-semibold text-neutral-300">Current password
          <input type={show ? 'text' : 'password'} autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} className={`${field} mt-1`} required />
        </label>
      )}
      <label className="block text-sm font-semibold text-neutral-300">New password
        <div className="relative mt-1">
          <input type={show ? 'text' : 'password'} autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} className={`${field} !pr-11`} required />
          <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" aria-label={show ? 'Hide passwords' : 'Show passwords'}>
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </label>
      <label className="block text-sm font-semibold text-neutral-300">Type new password again
        <input type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} className={`${field} mt-1`} required />
      </label>
      <PasswordChecklist pw={next} match={!!confirm && next === confirm} />
      {error && <p className="text-sm text-red-400">⚠️ {error}</p>}
      <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-cream font-bold flex items-center justify-center gap-2 disabled:opacity-60">
        {saving && <Loader2 size={16} className="animate-spin" />} {user.has_password ? 'Change password' : 'Set password'}
      </button>
      <p className="text-xs text-neutral-500">Forgot your current password? Log out and use "Forgot password?" to reset it with an SMS code.</p>
    </form>
  );
}

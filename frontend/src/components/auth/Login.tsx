import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sprout, Mail, Lock, Phone, ArrowLeft, Loader2, ShieldCheck, KeyRound } from 'lucide-react';
import { getJson, wakeBackend } from '../../lib/live';
import {
  saveSession, useAuthConfig, loadGoogleScript, passwordProblems, cleanPhone, validPhone, type Session,
} from '../../lib/auth';
import OtpInput from './OtpInput';

type View = 'email' | 'phone' | 'forgot';
interface OtpSent { sent_to: string; expires_in: number; resend_after: number; sms_mode: string; dev_code?: string }

const post = <T,>(path: string, body: unknown) =>
  getJson<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const inputBox = 'w-full bg-paper border-2 border-neutral-800 rounded-xl py-3 pl-11 pr-4 text-neutral-100 font-medium focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/15 transition-all';

function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => setLeft(l => l - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);
  return [left, setLeft] as const;
}

export default function Login() {
  const navigate = useNavigate();
  const config = useAuthConfig();
  useEffect(() => { wakeBackend(); }, []);  // free hosting sleeps; start waking it now
  const [view, setView] = useState<View>('email');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // email
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // phone OTP (login + reset)
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState<OtpSent | null>(null);
  const [code, setCode] = useState('');
  const [resendIn, setResendIn] = useCountdown();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const googleBtn = useRef<HTMLDivElement>(null);

  const finish = (s: Session) => { saveSession(s); navigate('/dashboard'); };
  const switchView = (v: View) => { setView(v); setError(''); setSuccess(''); setOtpSent(null); setCode(''); };
  const run = async (fn: () => Promise<void>) => {
    setLoading(true); setError('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong'); }
    finally { setLoading(false); }
  };

  // ── Google ──
  useEffect(() => {
    if (!config?.google_client_id || !googleBtn.current) return;
    loadGoogleScript().then(() => {
      const g = (window as any).google.accounts.id;
      g.initialize({
        client_id: config.google_client_id,
        callback: (resp: { credential: string }) => run(async () => finish(await post<Session>('/api/auth/google', { credential: resp.credential }))),
        ux_mode: 'popup',
      });
      g.renderButton(googleBtn.current, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: googleBtn.current!.offsetWidth || 360 });
    }).catch(err => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.google_client_id, view]);

  // ── Actions ──
  const emailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => finish(await post<Session>('/api/login', { email, password })));
  };

  const sendOtp = (purpose: 'login' | 'reset') => run(async () => {
    const digits = cleanPhone(phone);
    if (!validPhone(digits)) throw new Error('Enter your 10-digit mobile number (starts with 6, 7, 8 or 9).');
    const r = await post<OtpSent>('/api/auth/otp/send', { phone: digits, purpose });
    setOtpSent(r); setCode(''); setResendIn(r.resend_after);
  });

  const verifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (code.length !== 6) throw new Error('Enter all 6 digits of the code.');
      finish(await post<Session>('/api/auth/otp/verify', { phone: cleanPhone(phone), code }));
    });
  };

  const resetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (code.length !== 6) throw new Error('Enter all 6 digits of the code.');
      const problems = passwordProblems(newPassword);
      if (problems.length) throw new Error(`New password needs ${problems.join(', ')}.`);
      if (newPassword !== confirmPassword) throw new Error('The two passwords do not match.');
      const s = await post<Session & { message: string }>('/api/auth/password/reset', { phone: cleanPhone(phone), code, new_password: newPassword });
      setSuccess('Password changed! Taking you to your farm…');
      window.setTimeout(() => finish(s), 1200);
    });
  };

  const phoneField = (
    <div>
      <label className="block text-sm font-semibold text-neutral-300 mb-1.5">Mobile number</label>
      <div className="relative">
        <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
        <span className="absolute left-11 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">+91</span>
        <input type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} disabled={!!otpSent}
          onChange={e => setPhone(cleanPhone(e.target.value))} placeholder="98765 43210"
          className={`${inputBox} !pl-[4.6rem] tracking-wider disabled:opacity-70`} />
      </div>
      {otpSent && (
        <button type="button" onClick={() => { setOtpSent(null); setCode(''); }} className="text-xs font-semibold text-emerald-400 mt-1 hover:underline">
          Change number
        </button>
      )}
    </div>
  );

  const otpBlock = otpSent && (
    <div className="space-y-3 animate-fade-in">
      <p className="text-sm text-neutral-400">Enter the 6-digit code sent to <b className="text-neutral-200">{otpSent.sent_to}</b></p>
      {otpSent.dev_code && (
        <div className="rounded-xl bg-amber-500/15 border border-amber-500/40 p-3 text-sm text-amber-400 flex items-center justify-between gap-2">
          <span>🧪 Test mode (SMS not set up). Code: <b className="tracking-widest text-neutral-100">{otpSent.dev_code}</b></span>
          <button type="button" onClick={() => setCode(otpSent.dev_code!)} className="font-bold underline shrink-0">Fill in</button>
        </div>
      )}
      <OtpInput value={code} onChange={setCode} disabled={loading} />
      <div className="text-xs text-neutral-500 flex justify-between">
        <span>Code valid for {Math.round(otpSent.expires_in / 60)} minutes</span>
        {resendIn > 0
          ? <span>Resend in {resendIn}s</span>
          : <button type="button" onClick={() => sendOtp(view === 'forgot' ? 'reset' : 'login')} className="font-bold text-emerald-400 hover:underline">Resend code</button>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex font-sans text-neutral-100 overflow-hidden">
      {/* Left: farm welcome panel */}
      <div className="hidden lg:flex lg:w-1/2 farm-banner !rounded-none items-center justify-center p-12">
        <div className="relative z-10 text-center text-cream max-w-md">
          <div className="text-8xl mb-6 chat-float">🌾</div>
          <h1 className="text-5xl font-extrabold mb-4" style={{ fontFamily: 'Baloo 2' }}>Vanakkam, Farmer!</h1>
          <p className="text-lg text-cream/90">Live weather, today's mandi prices and AI crop advice for your field — in your language.</p>
          <div className="flex justify-center gap-3 mt-8 text-sm font-bold">
            {['🌦️ Live weather', '💰 Mandi prices', '🤖 AI advice'].map(x => (
              <span key={x} className="px-3 py-1.5 rounded-full bg-cream/20">{x}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right: forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-6 justify-center lg:justify-start">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30"><Sprout size={24} className="text-emerald-400" /></div>
            <span className="text-xl font-extrabold text-emerald-400" style={{ fontFamily: 'Baloo 2' }}>Agri-Yield Pro</span>
          </div>

          {view === 'forgot' ? (
            <>
              <button onClick={() => switchView('email')} className="flex items-center gap-1 text-sm font-semibold text-neutral-400 hover:text-emerald-400 mb-4">
                <ArrowLeft size={16} /> Back to login
              </button>
              <h2 className="text-3xl font-extrabold mb-1" style={{ fontFamily: 'Baloo 2' }}>Reset your password 🔑</h2>
              <p className="text-neutral-500 mb-6">We'll send a code to the mobile number on your account.</p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-extrabold mb-1" style={{ fontFamily: 'Baloo 2' }}>Welcome back 👋</h2>
              <p className="text-neutral-500 mb-6">Log in to see your farm.</p>
              <div className="flex p-1 rounded-xl bg-neutral-900 mb-6">
                {([['email', 'Email', <Mail size={15} key="m" />], ['phone', 'Mobile OTP', <Phone size={15} key="p" />]] as const).map(([v, label, icon]) => (
                  <button key={v} onClick={() => switchView(v)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${view === v ? 'bg-paper shadow text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'}`}>
                    {icon}{label}
                  </button>
                ))}
              </div>
            </>
          )}

          {error && <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">⚠️ {error}</div>}
          {success && <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold">✅ {success}</div>}

          {view === 'email' && (
            <form onSubmit={emailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className={inputBox} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-neutral-300">Password</label>
                  <button type="button" onClick={() => switchView('forgot')} className="text-xs font-bold text-emerald-400 hover:underline">Forgot password?</button>
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required
                    placeholder="Your password" className={`${inputBox} !pr-12`} />
                  <button type="button" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-cream font-bold flex items-center justify-center gap-2 disabled:opacity-60 shadow-md">
                {loading ? <Loader2 size={18} className="animate-spin" /> : null} Log in
              </button>
            </form>
          )}

          {view === 'phone' && (
            <form onSubmit={verifyOtp} className="space-y-4">
              {phoneField}
              {otpBlock}
              {!otpSent ? (
                <button type="button" onClick={() => sendOtp('login')} disabled={loading || !validPhone(phone)}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-cream font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-md">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />} Send OTP
                </button>
              ) : (
                <button type="submit" disabled={loading || code.length !== 6}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-cream font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-md">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null} Verify & log in
                </button>
              )}
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={resetPassword} className="space-y-4">
              {phoneField}
              {otpBlock}
              {otpSent && (
                <div className="space-y-3 animate-fade-in">
                  <div className="relative">
                    <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className={inputBox} />
                  </div>
                  <div className="relative">
                    <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Type it again" className={inputBox} />
                  </div>
                  <PasswordChecklist pw={newPassword} match={!!confirmPassword && newPassword === confirmPassword} />
                </div>
              )}
              {!otpSent ? (
                <button type="button" onClick={() => sendOtp('reset')} disabled={loading || !validPhone(phone)}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-cream font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-md">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />} Send reset code
                </button>
              ) : (
                <button type="submit" disabled={loading || !!success}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-cream font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-md">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : null} Set new password
                </button>
              )}
              <p className="text-xs text-neutral-500">Signed up with Google and no phone on your account? Use "Continue with Google" instead.</p>
            </form>
          )}

          {view !== 'forgot' && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-neutral-800" /><span className="text-xs font-semibold text-neutral-500">or</span><div className="flex-1 h-px bg-neutral-800" />
              </div>
              {config?.google_client_id ? (
                <div ref={googleBtn} className="w-full flex justify-center min-h-[44px]" />
              ) : (
                <button type="button" onClick={() => setError('Google sign-in is not set up yet. The app owner needs to add a Google OAuth client ID (GOOGLE_CLIENT_ID) on the server.')}
                  className="w-full py-3 rounded-full border-2 border-neutral-800 bg-paper hover:border-emerald-400 font-bold flex items-center justify-center gap-3">
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
                  </svg>
                  Continue with Google
                </button>
              )}
              <p className="text-center text-sm text-neutral-500 mt-6">
                New here? <Link to="/register" className="font-bold text-emerald-400 hover:underline">Create an account</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function PasswordChecklist({ pw, match }: { pw: string; match?: boolean }) {
  const items = [
    { ok: pw.length >= 8, label: '8+ characters' },
    { ok: /[A-Za-z]/.test(pw), label: 'a letter' },
    { ok: /\d/.test(pw), label: 'a number' },
    ...(match === undefined ? [] : [{ ok: match, label: 'both match' }]),
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(i => (
        <span key={i.label} className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${i.ok ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-neutral-900 text-neutral-500 border-neutral-800'}`}>
          {i.ok ? '✓' : '○'} {i.label}
        </span>
      ))}
    </div>
  );
}

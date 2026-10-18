import { useEffect, useState } from 'react';
import { getJson } from './live';

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  state: string | null;
  district: string | null;
  village: string | null;
  preferred_language: string | null;
  profile_photo: string | null;
  auth_provider: string;
  has_password: boolean;
}

export interface Session { access_token: string; user: AuthUser }

const EVENT = 'authChange';

export const getToken = () => { try { return localStorage.getItem('token'); } catch { return null; } };
export const getUser = (): AuthUser | null => {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
};

export function saveSession(s: Session) {
  try {
    localStorage.setItem('token', s.access_token);
    localStorage.setItem('user', JSON.stringify(s.user));
  } catch { /* storage blocked */ }
  window.dispatchEvent(new Event(EVENT));
}

export function saveUser(user: AuthUser) {
  try { localStorage.setItem('user', JSON.stringify(user)); } catch { /* storage blocked */ }
  window.dispatchEvent(new Event(EVENT));
}

export function clearSession() {
  try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch { /* storage blocked */ }
  (window as any).google?.accounts?.id?.disableAutoSelect?.();
  window.dispatchEvent(new Event(EVENT));
}

/** JSON request with the login token attached. */
export function authJson<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  return getJson<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Current user, kept in sync across components. */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getUser);
  const [token, setToken] = useState<string | null>(getToken);
  useEffect(() => {
    const sync = () => { setUser(getUser()); setToken(getToken()); };
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  return { user, token, loggedIn: !!token };
}

export interface AuthConfig { google_client_id: string | null; sms_mode: 'live' | 'development' }

let configPromise: Promise<AuthConfig> | null = null;
export function useAuthConfig() {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  useEffect(() => {
    configPromise ??= getJson<AuthConfig>('/api/auth/config').catch(() => ({ google_client_id: null, sms_mode: 'development' as const }));
    configPromise.then(setConfig);
  }, []);
  return config;
}

/** Load Google Identity Services once. */
let gisPromise: Promise<void> | null = null;
export function loadGoogleScript(): Promise<void> {
  if ((window as any).google?.accounts?.id) return Promise.resolve();
  gisPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { gisPromise = null; reject(new Error('Could not load Google sign-in')); };
    document.head.appendChild(s);
  });
  return gisPromise;
}

export const passwordProblems = (pw: string) => [
  pw.length < 8 && 'at least 8 characters',
  !/[A-Za-z]/.test(pw) && 'a letter',
  !/\d/.test(pw) && 'a number',
].filter(Boolean) as string[];

export const cleanPhone = (raw: string) => raw.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '').slice(0, 10);
export const validPhone = (digits: string) => /^[6-9]\d{9}$/.test(digits);

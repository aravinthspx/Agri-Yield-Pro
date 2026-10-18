// Backend base URL. Production builds default to "" so requests go to
// relative /api/* paths and are proxied by the Vercel rewrite in vercel.json.
// Set VITE_API_URL to override (e.g. a different backend host).
export const API_BASE: string =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');

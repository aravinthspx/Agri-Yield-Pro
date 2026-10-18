// Backend base URL. Dev falls back to the local FastAPI server; production
// builds default to "" (same-origin /api/*). Set VITE_API_URL to override.
export const API_BASE: string =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '');

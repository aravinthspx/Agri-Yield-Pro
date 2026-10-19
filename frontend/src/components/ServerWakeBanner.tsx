import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

/** Friendly notice while the free backend wakes up (see fetchWithWake in lib/live.ts). */
export default function ServerWakeBanner() {
  const [waking, setWaking] = useState(false);
  useEffect(() => {
    const on = (e: Event) => setWaking(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener('serverWaking', on);
    return () => window.removeEventListener('serverWaking', on);
  }, []);
  if (!waking) return null;
  return (
    <div role="status" className="notification-toast fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[min(420px,calc(100vw-32px))] glass-card !rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
      <Loader2 size={18} className="animate-spin text-emerald-400 shrink-0" />
      <div className="text-sm">
        <div className="font-bold text-neutral-100">Waking up the server…</div>
        <div className="text-xs text-neutral-500">It sleeps when nobody is using it. This can take up to a minute — please wait.</div>
      </div>
    </div>
  );
}

import { useRef } from 'react';

/** Six separate boxes for a one-time code; supports paste and SMS autofill. */
export default function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

  const setAt = (i: number, d: string) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join('').slice(0, 6));
  };

  return (
    <div className="flex justify-between gap-2" onPaste={e => {
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      if (pasted) { e.preventDefault(); onChange(pasted); refs.current[Math.min(pasted.length, 5)]?.focus(); }
    }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          value={d}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={i === 0 ? 6 : 1}
          aria-label={`Digit ${i + 1}`}
          onChange={e => {
            const v = e.target.value.replace(/\D/g, '');
            if (v.length > 1) { onChange(v.slice(0, 6)); refs.current[Math.min(v.length, 5)]?.focus(); return; }
            setAt(i, v);
            if (v && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={e => {
            if (e.key === 'Backspace' && !d && i > 0) { setAt(i - 1, ''); refs.current[i - 1]?.focus(); }
            if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
          }}
          className={`w-12 h-14 text-center text-2xl font-extrabold rounded-xl border-2 bg-paper text-neutral-100 outline-none transition-colors
            ${d ? 'border-emerald-400' : 'border-neutral-800'} focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/15 disabled:opacity-60`}
        />
      ))}
    </div>
  );
}

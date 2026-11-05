/** Decorative animated farm landscape (sun, clouds, hills, crops). Purely visual. */
export default function FarmScene({ className = '' }: { className?: string }) {
  const stalks = Array.from({ length: 14 }, (_, i) => i);
  return (
    <svg className={className} viewBox="0 0 600 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="fs-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF3C4" />
          <stop offset="60%" stopColor="#FFD54F" />
          <stop offset="100%" stopColor="#F2A71B" />
        </radialGradient>
        <linearGradient id="fs-hill-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9CCC65" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#558B2F" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="fs-hill-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7CB342" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#33691E" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id="fs-hill-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#558B2F" />
          <stop offset="100%" stopColor="#1F5A22" />
        </linearGradient>
      </defs>

      {/* Sun */}
      <g transform="translate(490 78) scale(0.75)">
        <g className="scene-sun-rays" opacity="0.55">
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x="-3" y="-70" width="6" height="22" rx="3" fill="#FFE082" transform={`rotate(${i * 30})`} />
          ))}
        </g>
        <circle r="40" fill="url(#fs-sun)" />
      </g>

      {/* Clouds */}
      <g className="scene-cloud" fill="#FFFDF7" opacity="0.85">
        <g transform="translate(120 60)">
          <ellipse cx="0" cy="0" rx="34" ry="14" /><ellipse cx="24" cy="-8" rx="22" ry="14" /><ellipse cx="-22" cy="-4" rx="18" ry="11" />
        </g>
        <g transform="translate(320 40) scale(0.75)">
          <ellipse cx="0" cy="0" rx="34" ry="14" /><ellipse cx="24" cy="-8" rx="22" ry="14" /><ellipse cx="-22" cy="-4" rx="18" ry="11" />
        </g>
      </g>

      {/* Hills */}
      <path d="M0 210 C 90 160, 180 170, 270 200 S 460 150, 600 190 L600 300 L0 300 Z" fill="url(#fs-hill-back)" />
      <path d="M0 235 C 120 200, 220 215, 320 238 S 500 205, 600 230 L600 300 L0 300 Z" fill="url(#fs-hill-mid)" />
      {/* Ploughed furrows on the front field */}
      <path d="M0 262 C 150 240, 300 250, 600 255 L600 300 L0 300 Z" fill="url(#fs-hill-front)" />
      {[0, 1, 2, 3].map(i => (
        <path key={i} d={`M0 ${272 + i * 8} C 160 ${254 + i * 8}, 320 ${262 + i * 8}, 600 ${266 + i * 8}`}
          stroke="#FFFDF7" strokeOpacity="0.08" strokeWidth="2" fill="none" />
      ))}

      {/* Paddy / wheat stalks swaying */}
      <g>
        {stalks.map(i => {
          const x = 24 + i * 42 + (i % 2) * 8;
          const h = 34 + (i % 3) * 8;
          return (
            // Position on the outer group; sway on the inner one (a CSS transform would replace the translate).
            <g key={i} transform={`translate(${x} 262)`}>
              <g className="scene-crop" style={{ animationDelay: `${(i % 5) * 0.35}s` }}>
                <path d={`M0 0 Q 2 ${-h / 2} 0 ${-h}`} stroke="#2F7D32" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d={`M0 ${-h * 0.45} q 10 -6 14 -16`} stroke="#43A047" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d={`M0 ${-h * 0.6} q -10 -6 -13 -15`} stroke="#43A047" strokeWidth="2" fill="none" strokeLinecap="round" />
                <ellipse cx="0" cy={-h - 6} rx="4" ry="9" fill="#F2C14E" />
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

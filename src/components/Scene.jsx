// Flat illustrated scenes per category: shown while photos load and wherever photos are unavailable.
// viewBox 400×260, cropped to fill.
const S = {
  desert: (
    <>
      <defs>
        <linearGradient id="g-ds" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb547" />
          <stop offset="1" stopColor="#ffe2a6" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#g-ds)" />
      <circle cx="292" cy="92" r="34" fill="#fff4d6" />
      <path d="M0 170 C80 120 150 130 220 160 S340 130 400 150 V260 H0Z" fill="#f29a3a" />
      <path d="M0 200 C90 160 170 175 250 200 S360 180 400 196 V260 H0Z" fill="#d9772a" />
      <path d="M0 232 C70 210 160 214 230 236 S350 222 400 230 V260 H0Z" fill="#a8551c" />
      <path d="M96 188 l10 -14 l6 8 l8 -4 l4 10" stroke="#7a3d14" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  sea: (
    <>
      <defs>
        <linearGradient id="g-se" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb36b" />
          <stop offset=".55" stopColor="#ffd8a1" />
          <stop offset=".56" stopColor="#1aa3b0" />
          <stop offset="1" stopColor="#05545c" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#g-se)" />
      <circle cx="120" cy="128" r="30" fill="#fff2d8" />
      <g fill="#04434a">
        <rect x="246" y="78" width="12" height="66" />
        <rect x="262" y="96" width="10" height="48" />
        <rect x="276" y="60" width="9" height="84" />
        <rect x="289" y="88" width="12" height="56" />
        <rect x="304" y="104" width="9" height="40" />
      </g>
      <path d="M150 168 h96 l-14 16 h-70z" fill="#0b2a2e" />
      <path d="M198 166 V112 l34 50z" fill="#fff" />
      <g stroke="#9fe3e8" strokeWidth="3" strokeLinecap="round" opacity=".7">
        <path d="M30 200 h40 M110 214 h56 M260 196 h48 M320 222 h40 M60 236 h30" />
      </g>
    </>
  ),
  sky: (
    <>
      <defs>
        <linearGradient id="g-sk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d3c7a" />
          <stop offset="1" stopColor="#7b8fe0" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#g-sk)" />
      <g fill="#ffe08a">
        <circle cx="60" cy="40" r="2" />
        <circle cx="140" cy="70" r="1.6" />
        <circle cx="330" cy="36" r="2" />
        <circle cx="280" cy="80" r="1.4" />
        <circle cx="96" cy="110" r="1.4" />
      </g>
      <g fill="#0f2350">
        <path d="M196 260 V120 l6 -8 V60 l3 -16 l3 16 v52 l6 8 V260z" />
        <rect x="120" y="170" width="26" height="90" />
        <rect x="150" y="150" width="22" height="110" />
        <rect x="230" y="160" width="24" height="100" />
        <rect x="258" y="186" width="30" height="74" />
        <rect x="80" y="196" width="34" height="64" />
        <rect x="294" y="140" width="20" height="120" />
      </g>
      <g fill="#ffc531" opacity=".8">
        <rect x="126" y="182" width="4" height="4" />
        <rect x="156" y="170" width="4" height="4" />
        <rect x="236" y="176" width="4" height="4" />
        <rect x="298" y="160" width="4" height="4" />
        <rect x="264" y="200" width="4" height="4" />
      </g>
    </>
  ),
  thrill: (
    <>
      <rect width="400" height="260" fill="#38b6c1" />
      <circle cx="320" cy="60" r="26" fill="#ffe08a" />
      <path d="M-10 220 C60 220 80 120 140 120 S200 220 250 150 S300 60 340 110 S380 200 420 190" stroke="#05545c" strokeWidth="10" fill="none" />
      <path d="M-10 230 C60 230 80 130 140 130 S200 230 250 160 S300 70 340 120 S380 210 420 200" stroke="#ffc531" strokeWidth="4" fill="none" />
      <g stroke="#05545c" strokeWidth="5">
        <path d="M60 210 V260 M140 130 V260 M210 200 V260 M290 92 V260 M360 150 V260" />
      </g>
      <rect y="250" width="400" height="10" fill="#05545c" />
    </>
  ),
  water: (
    <>
      <rect width="400" height="260" fill="#8fe2ea" />
      <circle cx="70" cy="56" r="24" fill="#fff4d6" />
      <path d="M260 0 C260 90 160 110 160 180 S120 230 60 236" stroke="#ffc531" strokeWidth="34" fill="none" strokeLinecap="round" />
      <path d="M260 0 C260 90 160 110 160 180 S120 230 60 236" stroke="#ff9f1c" strokeWidth="8" fill="none" strokeLinecap="round" opacity=".6" />
      <path d="M0 220 C40 210 80 230 120 220 S200 210 240 222 S320 212 400 220 V260 H0Z" fill="#1aa3b0" />
      <g stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".8">
        <path d="M40 240 h30 M150 246 h40 M290 238 h36" />
      </g>
    </>
  ),
  city: (
    <>
      <defs>
        <linearGradient id="g-ci" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3d2577" />
          <stop offset="1" stopColor="#8a5cd6" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#g-ci)" />
      <path d="M90 180 A110 60 0 0 1 310 180Z" fill="#c9b6f2" opacity=".9" />
      <g fill="none" stroke="#3d2577" strokeWidth="2" opacity=".5">
        <path d="M120 176 L280 150 M140 160 L300 176 M200 122 V180" />
      </g>
      <rect x="70" y="180" width="260" height="12" fill="#2a1854" />
      <g fill="#2a1854">
        <path d="M86 192 h28 v68 h-28z M136 192 h28 v68 h-28z M186 192 h28 v68 h-28z M236 192 h28 v68 h-28z M286 192 h28 v68 h-28z" />
      </g>
      <g fill="#ffc531">
        <circle cx="40" cy="60" r="3" />
        <circle cx="360" cy="40" r="3" />
        <circle cx="330" cy="96" r="2" />
      </g>
    </>
  ),
  trips: (
    <>
      <rect width="400" height="260" fill="#bfe9d6" />
      <circle cx="300" cy="64" r="26" fill="#fff4d6" />
      <path d="M0 150 L80 70 L150 140 L230 50 L330 150 L400 100 V260 H0Z" fill="#24a37a" />
      <path d="M0 180 L100 120 L200 180 L300 110 L400 170 V260 H0Z" fill="#0f5a44" />
      <path d="M170 260 L196 170 h8 L230 260Z" fill="#2b3a3c" />
      <path d="M200 176 v10 M200 196 v14 M200 222 v20" stroke="#ffc531" strokeWidth="3" />
    </>
  ),
  group: (
    <>
      <defs>
        <linearGradient id="g-gr" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff9a62" />
          <stop offset="1" stopColor="#ffd59a" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#g-gr)" />
      <circle cx="80" cy="70" r="28" fill="#fff4d6" />
      <path d="M0 196 C100 180 300 180 400 196 V260 H0Z" fill="#c8662e" />
      <rect y="206" width="400" height="54" fill="#3a3a3a" />
      <path d="M0 232 h400" stroke="#ffc531" strokeWidth="4" strokeDasharray="24 18" />
      <rect x="110" y="130" width="190" height="80" rx="16" fill="#00939f" />
      <rect x="110" y="178" width="190" height="10" fill="#05545c" />
      <g fill="#d9f6f8">
        <rect x="124" y="142" width="30" height="26" rx="5" />
        <rect x="162" y="142" width="30" height="26" rx="5" />
        <rect x="200" y="142" width="30" height="26" rx="5" />
        <rect x="238" y="142" width="30" height="26" rx="5" />
      </g>
      <rect x="276" y="142" width="16" height="44" rx="4" fill="#ffc531" />
      <circle cx="148" cy="212" r="13" fill="#1d1d1d" />
      <circle cx="262" cy="212" r="13" fill="#1d1d1d" />
      <circle cx="148" cy="212" r="5" fill="#9aa" />
      <circle cx="262" cy="212" r="5" fill="#9aa" />
    </>
  ),
  events: (
    <>
      <rect width="400" height="260" fill="#e0534a" />
      <g fill="#fff">
        {Array.from({ length: 8 }).map((_, r) =>
          Array.from({ length: 10 }).map((__, c) =>
            (r + c) % 2 === 0 ? <rect key={`${r}-${c}`} x={190 + c * 22} y={30 + r * 22} width="22" height="22" opacity={0.9 - r * 0.07} /> : null
          )
        )}
      </g>
      <path d="M0 220 C120 200 260 200 400 230 V260 H0Z" fill="#7d1f1a" />
      <path d="M0 236 C120 216 260 216 400 246" stroke="#ffc531" strokeWidth="4" strokeDasharray="18 12" fill="none" />
    </>
  ),
}

export default function Scene({ cat }) {
  return (
    <svg className="scene" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {S[cat] || S.city}
    </svg>
  )
}

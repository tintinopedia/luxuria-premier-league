'use client';
import { LENGTHS, ZONES } from '@/lib/constants';

const C = 120, R = 112;
const pt = (deg, r) => [C + r * Math.cos((deg * Math.PI) / 180), C + r * Math.sin((deg * Math.PI) / 180)];

// Round ground split into 6 clickable sectors. Top = bowler's end (straight).
export default function GroundZones({ value, onChange, heat, max = 1, readOnly }) {
  return (
    <svg viewBox="0 0 240 240" className="w-full max-w-[260px] select-none">
      <circle cx={C} cy={C} r={R + 4} fill="#0f2a1c" stroke="#1f5137" strokeWidth="2" />
      {ZONES.map((z, i) => {
        const a0 = -120 + i * 60, a1 = a0 + 60;
        const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R);
        const [lx, ly] = pt(a0 + 30, R * 0.68);
        const on = value === z;
        const h = heat ? heat[z] / max : 0;
        const fill = on ? 'rgba(245,185,66,0.55)' : heat ? `rgba(245,185,66,${0.08 + h * 0.6})` : 'rgba(34,197,94,0.10)';
        return (
          <g key={z} onClick={() => !readOnly && onChange?.(on ? null : z)} className={readOnly ? '' : 'cursor-pointer'}>
            <path d={`M${C},${C} L${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1} Z`} fill={fill} stroke="#1f5137" strokeWidth="1.5"
              className={readOnly ? '' : 'transition hover:fill-[rgba(245,185,66,0.3)]'} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="600" fill={on ? '#fff' : '#cbd5e1'} pointerEvents="none">{z}</text>
            {heat && <text x={lx} y={ly + 13} textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffd479" pointerEvents="none">{heat[z]}</text>}
          </g>
        );
      })}
      <circle cx={C} cy={C} r={R * 0.42} fill="none" stroke="rgba(255,255,255,0.12)" strokeDasharray="3 4" pointerEvents="none" />
      <rect x={C - 6} y={C - 22} width="12" height="44" rx="2" fill="#c8a46a" opacity="0.85" pointerEvents="none" />
    </svg>
  );
}

// Pitch strip from the bowler's end (top) to the batter (bottom)
const BANDS = { 'Half Line': 30, Length: 18, 'Good Length': 18, Yorker: 14, 'Full Toss': 20 };
export function PitchMap({ value, onChange }) {
  let y = 22;
  return (
    <svg viewBox="0 0 200 270" className="w-full max-w-[220px] select-none">
      <rect x="55" y="10" width="90" height="250" rx="6" fill="#b08a55" opacity="0.9" />
      <line x1="55" y1="22" x2="145" y2="22" stroke="#fff" strokeWidth="1.5" />
      <line x1="55" y1="248" x2="145" y2="248" stroke="#fff" strokeWidth="1.5" />
      {[90, 100, 110].map((x) => <rect key={'t' + x} x={x - 1.5} y="12" width="3" height="10" fill="#f8fafc" />)}
      {[90, 100, 110].map((x) => <rect key={'b' + x} x={x - 1.5} y="248" width="3" height="10" fill="#f8fafc" />)}
      <text x="100" y="8" textAnchor="middle" fontSize="8" fill="#94a3b8">BOWLER</text>
      <text x="100" y="268" textAnchor="middle" fontSize="8" fill="#94a3b8">BATTER</text>
      {LENGTHS.map((l) => {
        const h = (BANDS[l] / 100) * 226;
        const top = y; y += h;
        const on = value === l;
        return (
          <g key={l} onClick={() => onChange?.(on ? null : l)} className="cursor-pointer">
            <rect x="55" y={top} width="90" height={h} fill={on ? 'rgba(245,185,66,0.75)' : 'rgba(0,0,0,0.12)'} stroke="rgba(0,0,0,0.35)" className="transition hover:fill-[rgba(245,185,66,0.4)]" />
            <text x="100" y={top + h / 2} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fill={on ? '#06080f' : '#1f160a'} pointerEvents="none">{l}</text>
          </g>
        );
      })}
    </svg>
  );
}

'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useData, pname } from '@/lib/data';
import { Avatar } from './ui';

export const matchPlayer = (p, q) => {
  const s = q.trim().toLowerCase();
  return !s || (p.fullName || '').toLowerCase().includes(s) || (p.onFieldName || '').toLowerCase().includes(s);
};

export default function PlayerSearch() {
  const { players } = useData();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const results = q ? players.filter((p) => matchPlayer(p, q)).slice(0, 8) : [];
  return (
    <div className="relative w-full md:w-60">
      <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search players…" className="input py-2 pl-9" />
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">⌕</span>
      {open && q && (
        <div className="card absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto bg-ink-900 p-1">
          {results.length === 0 && <div className="px-3 py-3 text-sm text-slate-500">No players found</div>}
          {results.map((p) => (
            <Link key={p.id} href={`/players/${p.id}`} onClick={() => { setQ(''); setOpen(false); }}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5">
              <Avatar src={p.photoURL} name={p.fullName} size={32} />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-white">{p.fullName}</div>
                <div className="truncate text-xs text-slate-400">{p.onFieldName ? `"${p.onFieldName}" · ` : ''}{p.skill}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Smart picker used by scorer and CMS: search by full name or on-field name
export function PlayerPicker({ label, value, onChange, prefer = [], exclude = [], placeholder = 'Search by name or on-field name' }) {
  const { players, playerMap } = useData();
  const [q, setQ] = useState('');
  const pool = players
    .filter((p) => !exclude.includes(p.id) && matchPlayer(p, q))
    .sort((a, b) => (prefer.includes(b.id) ? 1 : 0) - (prefer.includes(a.id) ? 1 : 0) || pname(a).localeCompare(pname(b)))
    .slice(0, q ? 12 : 8);
  const sel = value ? playerMap[value] : null;
  return (
    <div>
      {label && <span className="label">{label}</span>}
      {sel ? (
        <div className="flex items-center gap-3 rounded-xl border border-gold-400/50 bg-gold-400/10 px-3 py-2">
          <Avatar src={sel.photoURL} name={sel.fullName} size={34} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-white">{sel.fullName}</div>
            <div className="truncate text-xs text-slate-400">{sel.onFieldName || sel.skill}</div>
          </div>
          <button type="button" onClick={() => onChange(null)} className="text-xs text-slate-400 hover:text-white">Change</button>
        </div>
      ) : (
        <div>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} />
          <div className="mt-2 grid max-h-56 gap-1 overflow-y-auto">
            {pool.map((p) => (
              <button type="button" key={p.id} onClick={() => { onChange(p.id); setQ(''); }}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-white/5">
                <Avatar src={p.photoURL} name={p.fullName} size={28} />
                <span className="truncate text-sm text-slate-200">{p.fullName}</span>
                {p.onFieldName && <span className="truncate text-xs text-slate-500">“{p.onFieldName}”</span>}
                {prefer.includes(p.id) && <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-gold-400">Squad</span>}
              </button>
            ))}
            {pool.length === 0 && <div className="px-2 py-2 text-xs text-slate-500">No match</div>}
          </div>
        </div>
      )}
    </div>
  );
}

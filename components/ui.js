'use client';
import { useEffect } from 'react';

export function Avatar({ src, name = '', size = 40, className = '', ring }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase() || '?';
  const style = { width: size, height: size, fontSize: size * 0.36, minWidth: size };
  if (src) return <img src={src} alt={name} style={style} className={`rounded-full object-cover bg-ink-700 ${ring ? 'ring-2 ring-gold-400/60' : ''} ${className}`} />;
  return <div style={style} className={`grid place-items-center rounded-full bg-gradient-to-br from-ink-500 to-ink-700 font-semibold text-slate-200 ${className}`}>{initials}</div>;
}

export function TeamBadge({ team, size = 32 }) {
  const style = { width: size, height: size, minWidth: size };
  if (team?.logoUrl) return <img src={team.logoUrl} alt={team.name} style={style} className="rounded-full bg-ink-700 object-cover" />;
  return (
    <div style={{ ...style, background: `linear-gradient(135deg, ${team?.color || '#3a4766'}, #0b101b)`, fontSize: size * 0.3 }}
      className="grid place-items-center rounded-full font-display font-bold text-white ring-1 ring-white/15">
      {(team?.shortName || team?.name || '?').slice(0, 3).toUpperCase()}
    </div>
  );
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-400">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-gold-400 border-t-transparent" />{label}
    </div>
  );
}

export function Empty({ children, className = '' }) {
  return <div className={`card p-8 text-center text-sm text-slate-400 ${className}`}>{children}</div>;
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className={`card max-h-[92vh] w-full overflow-y-auto rounded-b-none bg-ink-900 p-5 sm:rounded-2xl ${wide ? 'max-w-4xl' : 'max-w-lg'}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold uppercase tracking-wide text-white">{title}</h3>
          {onClose && <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white">✕</button>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-white/[0.06]">
      {tabs.map((t) => {
        const key = t.key || t;
        const on = key === active;
        return (
          <button key={key} onClick={() => onChange(key)}
            className={`relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition ${on ? 'text-gold-300' : 'text-slate-400 hover:text-slate-200'}`}>
            {t.label || t}
            {on && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-gold-400" />}
          </button>
        );
      })}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <span className="label">{label}{required && <span className="text-gold-400"> *</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function StatusPill({ label }) {
  const live = label === 'LIVE';
  const cls = live ? 'text-live' : label === 'RESULT' ? 'text-emerald-400' : label === 'INNINGS BREAK' ? 'text-amber-300' : 'text-sky-300';
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] ${cls}`}>
      {live && <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-live" />}{label}
    </span>
  );
}

export function PageShell({ title, subtitle, action, children }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {title && <SectionHeader title={title} subtitle={subtitle} action={action} />}
      {children}
    </div>
  );
}

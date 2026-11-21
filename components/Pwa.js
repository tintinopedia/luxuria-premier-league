'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';

const PwaCtx = createContext({ canInstall: false, install: () => {} });

// Registers the service worker and captures Android's install prompt
export function PwaProvider({ children }) {
  const [evt, setEvt] = useState(null);
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
    const h = (e) => { e.preventDefault(); setEvt(e); };
    window.addEventListener('beforeinstallprompt', h);
    window.addEventListener('appinstalled', () => setEvt(null));
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  const install = async () => { if (!evt) return; evt.prompt(); await evt.userChoice; setEvt(null); };
  return <PwaCtx.Provider value={{ canInstall: !!evt, install }}>{children}</PwaCtx.Provider>;
}
export const usePwa = () => useContext(PwaCtx);

export function InstallButton({ className = '' }) {
  const { canInstall, install } = usePwa();
  if (!canInstall) return null;
  return <button onClick={install} className={`btn-ghost btn-sm ${className}`}>⤓ Install app</button>;
}

// App-style bottom navigation on phones
const ITEMS = [
  { href: '/', label: 'Home', icon: '⌂' },
  { href: '/schedule', label: 'Fixtures', icon: '▦' },
  { href: '/news', label: 'News', icon: '☰' },
  { href: '/videos', label: 'Videos', icon: '▶' },
  { href: '/players', label: 'Players', icon: '☺' },
];
export function BottomNav() {
  const path = usePathname();
  if (path.startsWith('/score/')) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5">
        {ITEMS.map((i) => {
          const on = i.href === '/' ? path === '/' : path.startsWith(i.href);
          return (
            <Link key={i.href} href={i.href} className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${on ? 'text-gold-300' : 'text-slate-500'}`}>
              <span className="text-lg leading-none">{i.icon}</span>{i.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

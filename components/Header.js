'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useLive } from '@/lib/data';
import { isToday } from '@/lib/format';
import { ALL_CMS_PERMS } from '@/lib/constants';
import { Avatar } from './ui';
import PlayerSearch from './PlayerSearch';
import { InstallButton } from './Pwa';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/schedule', label: 'Fixtures' },
  { href: '/news', label: 'News' },
  { href: '/videos', label: 'Videos' },
  { href: '/photos', label: 'Photos' },
  { href: '/players', label: 'Players' },
];

export default function Header() {
  const { user, profile, isSuper, can, canAny, signIn, signOut, loading } = useAuth();
  const path = usePathname();
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(false);
  const canScore = can('score.update');
  const active = useLive(
    () => (canScore ? query(collection(db(), 'matches'), where('status', 'in', ['upcoming', 'live'])) : null),
    [canScore]
  );
  const todays = (active || []).filter((m) => m.status === 'live' || isToday(m.date));
  const showCms = isSuper || canAny(ALL_CMS_PERMS);
  const nav = showCms ? [...NAV, { href: '/cms', label: 'CMS', cms: true }] : NAV;
  const isOn = (h) => (h === '/' ? path === '/' : path.startsWith(h));
  const photo = profile?.photoURL || profile?.googlePhoto || user?.photoURL;

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <button className="rounded-lg p-2 text-slate-300 lg:hidden" onClick={() => setMobile(!mobile)} aria-label="Menu">☰</button>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-gold-300 to-gold-500 font-display text-sm font-bold text-ink-950">LPL</div>
          <div className="hidden leading-tight sm:block">
            <div className="font-display text-[15px] font-semibold uppercase tracking-wider text-white">Luxuria</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold-400">Premier League</div>
          </div>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${isOn(n.href) ? 'bg-white/[0.06] text-white' : 'text-slate-400 hover:text-white'} ${n.cms ? 'text-gold-300' : ''}`}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:block"><PlayerSearch /></div>
          <InstallButton />
          {canScore && todays.length > 0 && (
            <Link href={todays.length === 1 ? `/score/${todays[0].id}` : '/score'} className="btn-primary btn-sm">
              <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-live" /> Let&apos;s Score
            </Link>
          )}
          {!loading && !user && (
            <button onClick={signIn} className="btn-ghost btn-sm">
              <GoogleIcon /> Sign in
            </button>
          )}
          {user && (
            <div className="relative">
              <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 rounded-full p-0.5 ring-1 ring-white/10 hover:ring-gold-400/50">
                <Avatar src={photo} name={profile?.fullName || user.displayName || ''} size={32} />
              </button>
              {menu && (
                <div className="card absolute right-0 mt-2 w-60 bg-ink-900 p-2" onMouseLeave={() => setMenu(false)}>
                  <div className="px-3 py-2">
                    <div className="truncate text-sm font-semibold text-white">{profile?.fullName || user.displayName}</div>
                    <div className="truncate text-xs text-slate-400">{user.email}</div>
                    {isSuper && <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gold-400">Super Admin</div>}
                  </div>
                  {profile?.status === 'approved' && profile?.fullName && (
                    <Link onClick={() => setMenu(false)} href={`/players/${user.uid}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-white/5">My player profile</Link>
                  )}
                  <Link onClick={() => setMenu(false)} href="/profile/setup" className="block rounded-lg px-3 py-2 text-sm hover:bg-white/5">Edit profile</Link>
                  {showCms && <Link onClick={() => setMenu(false)} href="/cms" className="block rounded-lg px-3 py-2 text-sm hover:bg-white/5">CMS</Link>}
                  <button onClick={() => { setMenu(false); signOut(); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-white/5">Sign out</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {mobile && (
        <div className="border-t border-white/[0.06] px-4 py-3 lg:hidden">
          <div className="mb-3"><PlayerSearch /></div>
          <div className="grid grid-cols-3 gap-2">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setMobile(false)}
                className={`rounded-lg px-3 py-2 text-center text-sm ${isOn(n.href) ? 'bg-white/[0.08] text-white' : 'text-slate-400'}`}>{n.label}</Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

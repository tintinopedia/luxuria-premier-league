'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { CMS_TABS, ALL_CMS_PERMS } from '@/lib/constants';
import { Empty, Spinner } from '@/components/ui';

export default function CmsLayout({ children }) {
  const { user, loading, isSuper, canAny, signIn } = useAuth();
  const path = usePathname();
  if (loading) return <Spinner />;
  if (!user) return <div className="mx-auto max-w-md p-10"><Empty>Sign in to access the CMS.<div className="mt-4"><button onClick={signIn} className="btn-primary">Sign in</button></div></Empty></div>;
  if (!isSuper && !canAny(ALL_CMS_PERMS)) return <div className="mx-auto max-w-md p-10"><Empty>You don&apos;t have access to the CMS.</Empty></div>;
  const tabs = CMS_TABS.filter((t) => isSuper || canAny(t.perms));
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="rounded-lg bg-gold-400/15 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gold-300">CMS</span>
        <h1 className="font-display text-2xl font-semibold text-white">League control room</h1>
      </div>
      <div className="no-scrollbar mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.06] bg-ink-900/70 p-1">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${path.startsWith(t.href) ? 'bg-gold-400 text-ink-950' : 'text-slate-400 hover:text-white'}`}>
            {t.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}

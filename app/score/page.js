'use client';
import Link from 'next/link';
import { collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useData, useLive, tname } from '@/lib/data';
import { fmtDate, fmtTime, isToday } from '@/lib/format';
import { Empty, PageShell, Spinner, TeamBadge } from '@/components/ui';

export default function ScoreList() {
  const { can, loading } = useAuth();
  const { teamMap } = useData();
  const ok = can('score.update');
  const matches = useLive(() => (ok ? query(collection(db(), 'matches'), where('status', 'in', ['upcoming', 'live'])) : null), [ok]);
  if (loading) return <Spinner />;
  if (!ok) return <PageShell><Empty>You need the scorer permission to score matches.</Empty></PageShell>;
  const list = (matches || []).filter((m) => m.status === 'live' || isToday(m.date));
  return (
    <PageShell title="Let's Score" subtitle="Today's matches">
      {matches === undefined ? <Spinner /> : list.length === 0 ? <Empty>No matches today.</Empty> : (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((m) => (
            <Link key={m.id} href={`/score/${m.id}`} className="card card-hover p-5">
              <div className="text-xs text-slate-400">Match {m.matchNo} · {fmtDate(m.date)} · {fmtTime(m.date)}</div>
              <div className="mt-3 flex items-center gap-3">
                <TeamBadge team={teamMap[m.teamA]} /> <span className="font-semibold text-white">{tname(teamMap[m.teamA])}</span>
                <span className="text-slate-500">vs</span>
                <TeamBadge team={teamMap[m.teamB]} /> <span className="font-semibold text-white">{tname(teamMap[m.teamB])}</span>
              </div>
              <div className="mt-4 text-sm font-semibold text-gold-300">{m.status === 'live' ? 'Continue scoring →' : 'Start scoring →'}</div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}

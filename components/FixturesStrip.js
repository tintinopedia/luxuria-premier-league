'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useData, tshort } from '@/lib/data';
import { fmtDate, fmtTime, isToday, oversStr, toDate } from '@/lib/format';
import { scoreFor, sortFixtures, statusLabel, statusText } from '@/lib/match';
import { StatusPill, TeamBadge } from './ui';

export default function FixturesStrip({ matches = [], tournaments = [] }) {
  const { teamMap } = useData();
  const [filter, setFilter] = useState('all');
  const scroller = useRef(null);
  const tMap = Object.fromEntries(tournaments.map((t) => [t.id, t]));
  const visible = sortFixtures(matches.filter((m) => m.status !== 'completed' || daysAgo(m.date) <= 14));
  const chips = [{ id: 'all', label: `Matches (${visible.length})` },
    ...tournaments.map((t) => ({ id: t.id, label: `${t.name} (${visible.filter((m) => m.tournamentId === t.id).length})` }))
      .filter((c) => !c.label.endsWith('(0)'))];
  const list = (filter === 'all' ? visible : visible.filter((m) => m.tournamentId === filter)).slice(0, 16);
  const scroll = (d) => scroller.current?.scrollBy({ left: d * 340, behavior: 'smooth' });

  return (
    <section className="border-b border-white/[0.06] bg-ink-900/40">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto">
          {chips.map((c) => (
            <button key={c.id} onClick={() => setFilter(c.id)}
              className={`whitespace-nowrap rounded-xl border px-4 py-1.5 text-sm font-medium transition ${filter === c.id ? 'border-gold-400/60 bg-gold-400/10 text-white' : 'border-white/10 text-slate-400 hover:text-white'}`}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <div ref={scroller} className="no-scrollbar flex snap-x gap-3 overflow-x-auto pb-1">
            {list.length === 0 && <div className="card w-full p-6 text-center text-sm text-slate-400">No fixtures yet. They will appear here once the tournament schedule is published.</div>}
            {list.map((m) => <FixtureCard key={m.id} m={m} teamMap={teamMap} tournament={tMap[m.tournamentId]} />)}
          </div>
          {list.length > 3 && (
            <>
              <button onClick={() => scroll(-1)} className="absolute -left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-ink-800 text-white shadow-xl hover:bg-ink-700 md:grid">‹</button>
              <button onClick={() => scroll(1)} className="absolute -right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-ink-800 text-white shadow-xl hover:bg-ink-700 md:grid">›</button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

const daysAgo = (t) => { const d = toDate(t); return d ? (Date.now() - d.getTime()) / 86400000 : 999; };

function FixtureCard({ m, teamMap, tournament }) {
  const label = statusLabel(m);
  const rows = (m.innings?.length ? [m.innings[0].batting, m.innings[0].bowling] : [m.teamA, m.teamB]);
  const battingNow = m.status === 'live' && !m.live?.break ? m.innings?.[(m.live?.inn || 1) - 1]?.batting : null;
  return (
    <div className="card card-hover flex w-[300px] shrink-0 snap-start flex-col bg-ink-900 sm:w-[320px]">
      <Link href={`/match/${m.id}`} className="flex-1 p-4">
        <div className="mb-3 flex items-center justify-between gap-2 text-xs">
          <StatusPill label={label} />
          <span className="truncate text-slate-400">Match {m.matchNo || ''}{m.venue ? ` • ${m.venue}` : ''}</span>
        </div>
        {m.status === 'upcoming' ? (
          <div className="flex items-center justify-between">
            <div className="space-y-2.5">
              {rows.map((tid) => (
                <div key={tid} className="flex items-center gap-2.5">
                  <TeamBadge team={teamMap[tid]} size={26} />
                  <span className="font-semibold text-white">{tshort(teamMap[tid])}</span>
                </div>
              ))}
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">{isToday(m.date) ? 'Today' : fmtDate(m.date, { day: 'numeric', month: 'short' })}</div>
              <div className="font-display text-2xl font-semibold text-white">{fmtTime(m.date)}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rows.map((tid) => {
              const s = scoreFor(m, tid);
              const won = m.winner === tid;
              const dim = m.status === 'completed' && m.winner && !won;
              return (
                <div key={tid} className={`flex items-center justify-between ${dim ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2.5">
                    <TeamBadge team={teamMap[tid]} size={26} />
                    <span className={`font-semibold ${battingNow === tid ? 'text-gold-300' : 'text-white'}`}>{tshort(teamMap[tid])}</span>
                  </div>
                  <div className="text-right">
                    {s ? (
                      <span className="tabular-nums">
                        {s.b > 0 && <span className="mr-1.5 text-xs text-slate-400">({oversStr(s.b)} ov)</span>}
                        <span className="text-lg font-bold text-white">{s.r}{s.w < 10 ? `/${s.w}` : ''}</span>
                      </span>
                    ) : <span className="text-xs text-slate-500">Yet to bat</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 line-clamp-2 text-sm text-slate-300">{statusText(m, teamMap)}</p>
      </Link>
      <div className="flex gap-5 border-t border-white/[0.06] px-4 py-2.5 text-sm font-semibold">
        <Link href={`/tournaments/${m.tournamentId}?tab=schedule`} className="text-slate-300 hover:text-gold-300">Schedule</Link>
        <Link href={`/tournaments/${m.tournamentId}?tab=table`} className="text-slate-300 hover:text-gold-300">Table</Link>
        {tournament && <span className="ml-auto truncate text-xs font-normal text-slate-500">{tournament.name}</span>}
      </div>
    </div>
  );
}

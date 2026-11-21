'use client';
import Link from 'next/link';
import { tname } from '@/lib/data';
import { fmtDate, fmtTime, oversStr } from '@/lib/format';
import { scoreFor, statusLabel, statusText } from '@/lib/match';
import { Empty, StatusPill, TeamBadge } from './ui';

export default function Schedule({ matches, teamMap, showTournament, tMap = {} }) {
  if (!matches.length) return <Empty>No matches scheduled yet.</Empty>;
  return (
    <div className="space-y-3">
      {matches.map((m) => (
        <Link key={m.id} href={`/match/${m.id}`} className="card card-hover grid gap-3 p-4 sm:grid-cols-[150px_1fr_auto] sm:items-center">
          <div className="text-sm">
            <div className="font-semibold text-white">{fmtDate(m.date, { weekday: 'short', day: 'numeric', month: 'short' })}</div>
            <div className="text-slate-400">{fmtTime(m.date)}{m.venue ? ` · ${m.venue}` : ''}</div>
            {showTournament && tMap[m.tournamentId] && <div className="text-xs text-slate-500">{tMap[m.tournamentId].name}</div>}
          </div>
          <div className="space-y-1.5">
            {[m.teamA, m.teamB].map((tid) => {
              const s = scoreFor(m, tid);
              return (
                <div key={tid} className="flex items-center gap-2.5">
                  <TeamBadge team={teamMap[tid]} size={24} />
                  <span className={`font-medium ${m.winner === tid ? 'text-white' : 'text-slate-300'}`}>{tname(teamMap[tid])}</span>
                  {s && <span className="ml-auto tabular-nums text-sm text-white sm:ml-4">{s.r}/{s.w} <span className="text-xs text-slate-500">({oversStr(s.b)})</span></span>}
                </div>
              );
            })}
            <p className="text-xs text-slate-400">{statusText(m, teamMap)}</p>
          </div>
          <div className="flex items-center gap-3 sm:flex-col sm:items-end">
            <StatusPill label={statusLabel(m)} />
            <span className="text-xs text-slate-500">Match {m.matchNo}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}


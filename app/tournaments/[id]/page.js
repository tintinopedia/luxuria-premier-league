'use client';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { collection, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useData, useLive, tname } from '@/lib/data';
import { toDate } from '@/lib/format';
import { scoreFor } from '@/lib/match';
import { Empty, Spinner, Tabs, TeamBadge } from '@/components/ui';
import Schedule from '@/components/Schedule';

export default function Page() {
  return <Suspense fallback={<Spinner />}><TournamentPage /></Suspense>;
}

function TournamentPage() {
  const { id } = useParams();
  const sp = useSearchParams();
  const [tab, setTab] = useState(sp.get('tab') || 'schedule');
  const { teamMap } = useData();
  const t = useLive(() => doc(db(), 'tournaments', id), [id]);
  const matches = useLive(() => query(collection(db(), 'matches'), where('tournamentId', '==', id)), [id]);
  if (t === undefined || matches === undefined) return <Spinner />;
  if (!t) return <div className="mx-auto max-w-3xl p-8"><Empty>Tournament not found.</Empty></div>;
  const sorted = [...(matches || [])].sort((a, b) => (toDate(a.date)?.getTime() || 0) - (toDate(b.date)?.getTime() || 0));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-gold-400">{t.overs} overs a side</div>
        <h1 className="font-display text-4xl font-semibold text-white">{t.name}</h1>
      </div>
      <Tabs tabs={[{ key: 'schedule', label: 'Schedule' }, { key: 'table', label: 'Points Table' }, { key: 'teams', label: 'Teams' }]} active={tab} onChange={setTab} />
      <div className="mt-6">
        {tab === 'schedule' && <Schedule matches={sorted} teamMap={teamMap} />}
        {tab === 'table' && <PointsTable t={t} matches={sorted} teamMap={teamMap} />}
        {tab === 'teams' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(t.teams || []).map((tid) => (
              <div key={tid} className="card flex items-center gap-3 p-4">
                <TeamBadge team={teamMap[tid]} size={44} />
                <div><div className="font-semibold text-white">{tname(teamMap[tid])}</div><div className="text-xs text-slate-400">{(teamMap[tid]?.members || []).length} players</div></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PointsTable({ t, matches, teamMap }) {
  const rows = Object.fromEntries((t.teams || []).map((id) => [id, { id, p: 0, w: 0, l: 0, nr: 0, pts: 0, rf: 0, bf: 0, ra: 0, bb: 0 }]));
  const full = (t.overs || 20) * 6;
  for (const m of matches.filter((x) => x.status === 'completed')) {
    const [a, b] = [m.teamA, m.teamB];
    if (!rows[a] || !rows[b]) continue;
    rows[a].p++; rows[b].p++;
    if (m.winner === a || m.winner === b) {
      const loser = m.winner === a ? b : a;
      rows[m.winner].w++; rows[m.winner].pts += 2; rows[loser].l++;
    } else { rows[a].nr++; rows[b].nr++; rows[a].pts++; rows[b].pts++; }
    for (const tid of [a, b]) {
      const s = scoreFor(m, tid), o = scoreFor(m, tid === a ? b : a);
      if (s) { rows[tid].rf += s.r; rows[tid].bf += s.allOut ? full : s.b; }
      if (o) { rows[tid].ra += o.r; rows[tid].bb += o.allOut ? full : o.b; }
    }
  }
  const nrr = (r) => (r.bf && r.bb ? ((r.rf / r.bf) * 6 - (r.ra / r.bb) * 6) : 0);
  const list = Object.values(rows).sort((x, y) => y.pts - x.pts || nrr(y) - nrr(x));
  if (!list.length) return <Empty>Add teams to this tournament to see the table.</Empty>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[560px]">
        <thead className="bg-white/[0.03]"><tr><th className="th">Team</th><th className="th">P</th><th className="th">W</th><th className="th">L</th><th className="th">NR</th><th className="th">NRR</th><th className="th">Pts</th></tr></thead>
        <tbody>
          {list.map((r, i) => (
            <tr key={r.id} className="border-t border-white/[0.04]">
              <td className="td"><span className="flex items-center gap-3"><span className="w-4 text-slate-500">{i + 1}</span><TeamBadge team={teamMap[r.id]} size={26} /><span className="font-medium text-white">{tname(teamMap[r.id])}</span></span></td>
              <td className="td">{r.p}</td><td className="td">{r.w}</td><td className="td">{r.l}</td><td className="td">{r.nr}</td>
              <td className="td text-slate-400">{nrr(r) >= 0 ? '+' : ''}{nrr(r).toFixed(3)}</td><td className="td font-bold text-gold-300">{r.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

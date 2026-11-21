'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collectionGroup, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useData } from '@/lib/data';
import { econ, oversStr, sr } from '@/lib/format';
import { batRuns, bowlerRuns } from '@/lib/scoring';
import { BOWLER_CREDIT, LENGTHS, ZONES } from '@/lib/constants';
import { Avatar, Empty, Spinner, TeamBadge } from '@/components/ui';
import GroundZones from '@/components/GroundZones';

async function fetchBalls(field, id) {
  const s = await getDocs(query(collectionGroup(db(), 'balls'), where(field, '==', id)));
  return s.docs.map((d) => ({ id: d.id, matchId: d.ref.parent.parent.id, ...d.data() }));
}

function computeStats(id, batBalls, bowlBalls, outBalls) {
  const inns = {};
  for (const b of batBalls) {
    const k = `${b.matchId}-${b.inn}`;
    const x = (inns[k] ||= { r: 0, b: 0, out: false });
    if (b.type !== 'wide') { x.b++; x.r += batRuns(b); }
  }
  for (const b of outBalls) { const k = `${b.matchId}-${b.inn}`; (inns[k] ||= { r: 0, b: 0, out: false }).out = true; }
  const list = Object.values(inns);
  const runs = list.reduce((s, x) => s + x.r, 0);
  const faced = list.reduce((s, x) => s + x.b, 0);
  const outs = list.filter((x) => x.out).length;
  const hsInn = list.reduce((m, x) => (!m || x.r > m.r ? x : m), null);
  const fours = batBalls.filter((b) => batRuns(b) === 4).length;
  const sixes = batBalls.filter((b) => batRuns(b) === 6).length;
  const zoneRuns = Object.fromEntries(ZONES.map((z) => [z, 0]));
  batBalls.forEach((b) => { if (b.zone && batRuns(b)) zoneRuns[b.zone] += batRuns(b); });

  const spells = {};
  let legal = 0, conceded = 0, wkts = 0;
  const lengthStats = Object.fromEntries(LENGTHS.map((l) => [l, { balls: 0, runs: 0, w: 0 }]));
  for (const b of bowlBalls) {
    const k = `${b.matchId}-${b.inn}`;
    const sp = (spells[k] ||= { w: 0, r: 0 });
    const rc = bowlerRuns(b);
    conceded += rc; sp.r += rc;
    if (b.type === 'legit') legal++;
    const w = b.wicket && BOWLER_CREDIT.includes(b.wicket.kind);
    if (w) { wkts++; sp.w++; }
    if (b.length && lengthStats[b.length]) { const l = lengthStats[b.length]; l.balls++; l.runs += rc; if (w) l.w++; }
  }
  const best = Object.values(spells).sort((a, b) => b.w - a.w || a.r - b.r)[0];
  const matches = new Set([...batBalls, ...bowlBalls].map((b) => b.matchId)).size;
  return {
    matches, innings: list.length, runs, faced, outs, hs: hsInn ? `${hsInn.r}${hsInn.out ? '' : '*'}` : '-',
    avg: outs ? (runs / outs).toFixed(2) : list.length ? '-' : '-', sr: sr(runs, faced), fours, sixes,
    fifties: list.filter((x) => x.r >= 50 && x.r < 100).length, hundreds: list.filter((x) => x.r >= 100).length,
    legal, conceded, wkts, econ: econ(conceded, legal), bAvg: wkts ? (conceded / wkts).toFixed(2) : '-',
    best: best ? `${best.w}/${best.r}` : '-', zoneRuns, lengthStats,
  };
}

export default function PlayerProfile() {
  const { id } = useParams();
  const { playerMap, teams } = useData();
  const p = playerMap[id];
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let off = false;
    Promise.all([fetchBalls('batter', id), fetchBalls('bowler', id), fetchBalls('outPlayer', id)])
      .then(([a, b, c]) => !off && setStats(computeStats(id, a, b, c)))
      .catch((e) => { console.error(e); !off && setStats(computeStats(id, [], [], [])); });
    return () => { off = true; };
  }, [id]);

  if (!p) return Object.keys(playerMap).length ? <div className="mx-auto max-w-3xl p-8"><Empty>Player not found.</Empty></div> : <Spinner />;
  const myTeams = teams.filter((t) => (t.members || []).includes(id));
  const maxZone = stats ? Math.max(1, ...Object.values(stats.zoneRuns)) : 1;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <Avatar src={p.photoURL} name={p.fullName} size={132} ring />
          <div>
            <h1 className="font-display text-4xl font-semibold text-white">{p.fullName}</h1>
            {p.onFieldName && <div className="text-lg text-gold-300">“{p.onFieldName}”</div>}
            <div className="mt-3 flex flex-wrap gap-2">
              {p.skill && <span className="chip">{p.skill}</span>}
              {p.battingStyle && <span className="chip">Bats: {p.battingStyle}</span>}
              {p.bowlingStyle && <span className="chip">Bowls: {p.bowlingStyle}</span>}
              {p.age && <span className="chip">Age {p.age}</span>}
            </div>
            {myTeams.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {myTeams.map((t) => (
                  <span key={t.id} className="flex items-center gap-2 text-sm text-slate-300">
                    <TeamBadge team={t} size={24} />{t.name}
                    {t.captain === id && <span className="text-[10px] font-bold text-gold-400">CAPTAIN</span>}
                    {t.wicketKeeper === id && <span className="text-[10px] font-bold text-sky-300">WK</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {!stats ? <Spinner label="Crunching stats" /> : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <StatBlock title="Batting" rows={[
              ['Matches', stats.matches], ['Innings', stats.innings], ['Runs', stats.runs], ['Highest', stats.hs],
              ['Average', stats.avg], ['Strike rate', stats.sr], ['4s', stats.fours], ['6s', stats.sixes], ['50s', stats.fifties], ['100s', stats.hundreds],
            ]} />
            <StatBlock title="Bowling" rows={[
              ['Overs', oversStr(stats.legal)], ['Wickets', stats.wkts], ['Runs conceded', stats.conceded], ['Economy', stats.econ],
              ['Average', stats.bAvg], ['Best', stats.best],
            ]} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card p-5">
              <h3 className="section-title mb-1 !text-base">Scoring zones</h3>
              <p className="mb-4 text-xs text-slate-400">Runs by area of the ground</p>
              <div className="flex flex-col items-center gap-6 sm:flex-row">
                <GroundZones heat={stats.zoneRuns} max={maxZone} readOnly />
                <div className="w-full space-y-2 text-sm">
                  {ZONES.map((z) => (
                    <div key={z} className="flex items-center gap-3"><span className="w-24 text-slate-400">{z}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-700"><div className="h-full rounded-full bg-gold-400" style={{ width: `${(stats.zoneRuns[z] / maxZone) * 100}%` }} /></div>
                      <span className="w-8 text-right tabular-nums text-white">{stats.zoneRuns[z]}</span></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="card p-5">
              <h3 className="section-title mb-1 !text-base">Bowling lengths</h3>
              <p className="mb-4 text-xs text-slate-400">Where the ball pitched</p>
              <table className="w-full">
                <thead><tr><th className="th">Length</th><th className="th">Balls</th><th className="th">Runs</th><th className="th">Wkts</th><th className="th">Econ</th></tr></thead>
                <tbody>{LENGTHS.map((l) => { const x = stats.lengthStats[l]; return (
                  <tr key={l} className="border-t border-white/[0.04]"><td className="td">{l}</td><td className="td">{x.balls}</td><td className="td">{x.runs}</td><td className="td font-bold text-white">{x.w}</td><td className="td text-slate-400">{econ(x.runs, x.balls)}</td></tr>
                ); })}</tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatBlock({ title, rows }) {
  return (
    <div className="card p-5">
      <h3 className="section-title mb-4 !text-base">{title}</h3>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {rows.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white/[0.03] p-3">
            <div className="font-display text-2xl font-semibold text-white">{v}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{k}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

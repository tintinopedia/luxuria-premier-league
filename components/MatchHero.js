'use client';
import Link from 'next/link';
import { useData, pname, tname } from '@/lib/data';
import { econ, fmtDate, oversStr, rr, sr } from '@/lib/format';
import { battingOrder, scoreFor, statusLabel, statusText, tossText } from '@/lib/match';
import { ballLabel, ballTone, batRuns, computeInnings, lastNOvers } from '@/lib/scoring';
import { Avatar, StatusPill, TeamBadge } from './ui';

export default function MatchHero({ match: m, balls = [], tournament, showKnowMore }) {
  const { teamMap, playerMap } = useData();
  if (!m) return null;
  const inn = m.live?.inn || 1;
  const curBalls = balls.filter((b) => b.inn === inn);
  const st = computeInnings(curBalls);
  const isLive = m.status === 'live' && !m.live?.break;
  const order = battingOrder(m);
  const last5 = lastNOvers(curBalls, 5);
  const lastOver = curBalls.length ? curBalls[curBalls.length - 1].over : -1;
  const thisOver = curBalls.filter((b) => b.over === lastOver);
  const curScore = m.score?.[inn];

  return (
    <section className="card overflow-hidden">
      <div className="relative p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="text-sm text-slate-400">
            <StatusPill label={statusLabel(m)} />
            <div className="mt-1.5">
              Match {m.matchNo || ''}{m.venue ? `, ${m.venue}` : ''}, {fmtDate(m.date, { day: 'numeric', month: 'long', year: 'numeric' })}
              {tournament && <>, <Link href={`/tournaments/${tournament.id}`} className="text-slate-300 underline decoration-slate-600 underline-offset-4 hover:text-gold-300">{tournament.name}</Link></>}
            </div>
          </div>
          {showKnowMore && (
            <Link href={`/match/${m.id}`} className="btn-primary">Know More →</Link>
          )}
        </div>

        <div className="mt-6 space-y-4">
          {order.map((tid, i) => {
            const s = scoreFor(m, tid);
            const batting = isLive && m.innings?.[inn - 1]?.batting === tid;
            return (
              <div key={tid || i} className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <TeamBadge team={teamMap[tid]} size={48} />
                  <span className={`truncate font-display text-3xl font-semibold sm:text-4xl ${batting ? 'text-white' : 'text-slate-300'}`}>{tname(teamMap[tid])}</span>
                  {batting && <span className="hidden text-gold-400 sm:inline">●</span>}
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  {s ? (
                    <>
                      {s.b > 0 && <span className="mr-2 text-lg text-slate-400">({oversStr(s.b)} ov)</span>}
                      <span className={`font-display text-3xl font-bold sm:text-4xl ${batting ? 'text-white' : 'text-slate-300'}`}>{s.r}{s.w < 10 ? `/${s.w}` : ''}</span>
                    </>
                  ) : <span className="text-sm text-slate-500">{m.status === 'upcoming' ? '' : 'Yet to bat'}</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <p className="text-lg font-semibold text-white">{statusText(m, teamMap)}</p>
          {isLive && curScore && (
            <p className="mt-1 text-sm text-slate-400">
              Current RR: {rr(curScore.r, curScore.b)}
              {last5.legal >= 6 && <> • Last {Math.floor(last5.legal / 6)} ov (RR): {last5.runs}/{last5.wkts} ({rr(last5.runs, last5.legal)})</>}
            </p>
          )}
          {m.toss?.winner && m.status !== 'upcoming' && <p className="mt-1 text-sm text-slate-500">Toss: {tossText(m, teamMap)}</p>}
        </div>
      </div>

      {isLive && (m.live?.striker || m.live?.bowler) && (
        <div className="border-t border-white/[0.06]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead className="bg-white/[0.03]"><tr>
                <th className="th">Batters</th><th className="th">R</th><th className="th">B</th><th className="th">4s</th><th className="th">6s</th><th className="th">SR</th>
              </tr></thead>
              <tbody>
                {[m.live.striker, m.live.nonStriker].filter(Boolean).map((id) => {
                  const b = st.batters[id] || { r: 0, b: 0, f: 0, s: 0 };
                  const striker = id === m.live.striker;
                  return (
                    <tr key={id} className="border-t border-white/[0.04]">
                      <td className="td"><Link href={`/players/${id}`} className="font-medium text-white hover:text-gold-300">{pname(playerMap[id])}{striker && <span className="text-gold-400">*</span>}</Link>
                        <span className="ml-1.5 text-xs text-slate-500">{playerMap[id]?.battingStyle === 'Left Hand' ? 'lhb' : 'rhb'}</span></td>
                      <td className="td font-bold text-white">{b.r}</td><td className="td text-slate-400">{b.b}</td><td className="td text-slate-400">{b.f}</td><td className="td text-slate-400">{b.s}</td><td className="td text-slate-400">{sr(b.r, b.b)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <thead className="bg-white/[0.03]"><tr>
                <th className="th">Bowlers</th><th className="th">O</th><th className="th">M</th><th className="th">R</th><th className="th">W</th><th className="th">Econ</th><th className="th">0s</th><th className="th">4s</th><th className="th">6s</th>
              </tr></thead>
              <tbody>
                {[m.live.bowler, m.live.prevBowler].filter((x, i, a) => x && a.indexOf(x) === i).map((id) => {
                  const b = st.bowlers[id] || { balls: 0, runs: 0, w: 0, maidens: 0, dots: 0, f: 0, s: 0 };
                  return (
                    <tr key={id} className="border-t border-white/[0.04]">
                      <td className="td"><Link href={`/players/${id}`} className="font-medium text-white hover:text-gold-300">{pname(playerMap[id])}{id === m.live.bowler && <span className="text-gold-400">*</span>}</Link></td>
                      <td className="td">{oversStr(b.balls)}</td><td className="td text-slate-400">{b.maidens}</td><td className="td">{b.runs}</td><td className="td font-bold text-white">{b.w}</td>
                      <td className="td text-slate-400">{econ(b.runs, b.balls)}</td><td className="td text-slate-400">{b.dots}</td><td className="td text-slate-400">{b.f}</td><td className="td text-slate-400">{b.s}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {thisOver.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] px-5 py-3 text-xs text-slate-400">
              <span className="mr-1 font-semibold uppercase tracking-wider">This over</span>
              {thisOver.map((b) => <span key={b.id} className={`grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-[11px] font-bold ${ballTone(b)}`}>{ballLabel(b)}</span>)}
            </div>
          )}
        </div>
      )}

      {m.status === 'completed' && m.manOfMatch && (
        <PlayerOfMatch id={m.manOfMatch} player={playerMap[m.manOfMatch]} balls={balls} teamMap={teamMap} />
      )}
    </section>
  );
}

function PlayerOfMatch({ id, player, balls, teamMap }) {
  let r = 0, b = 0, w = 0, rc = 0, lb = 0;
  for (const x of balls) {
    if (x.batter === id && x.type !== 'wide') { r += batRuns(x); b++; }
    if (x.bowler === id) {
      if (x.type === 'legit') lb++;
      rc += x.type === 'wide' ? 1 + (x.runs || 0) : x.type === 'noball' ? 1 + batRuns(x) : batRuns(x);
      if (x.wicket && !['Run Out', 'Retired Out'].includes(x.wicket.kind)) w++;
    }
  }
  const team = Object.values(teamMap).find((t) => (t.members || []).includes(id));
  return (
    <div className="relative overflow-hidden border-t border-white/[0.06] bg-gradient-to-r from-gold-400/15 via-transparent to-transparent p-5 sm:p-7">
      <div className="flex items-center gap-5">
        <Avatar src={player?.photoURL} name={player?.fullName || ''} size={104} ring />
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-gold-400">Player of the Match</div>
          <Link href={`/players/${id}`} className="mt-1 block font-display text-3xl font-semibold text-white hover:text-gold-300">{player?.fullName || 'Player'}</Link>
          <div className="text-sm text-slate-400">{team ? team.name : ''}{player?.skill ? ` · ${player.skill}` : ''}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {b > 0 && <span className="chip">{r} ({b})</span>}
            {lb > 0 && <span className="chip">{w}/{rc} ({oversStr(lb)} ov)</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

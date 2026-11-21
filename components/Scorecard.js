'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useData, pname, tname } from '@/lib/data';
import { econ, oversStr, sr } from '@/lib/format';
import { ballDescription, ballLabel, ballTone, computeInnings, dismissalText, groupByOver, totalRuns } from '@/lib/scoring';
import { Empty } from './ui';

export function Scorecard({ match: m, balls = [] }) {
  const { teamMap, playerMap } = useData();
  const name = (id) => pname(playerMap[id]);
  if (!m.innings?.length) {
    const sides = [m.teamA, m.teamB].map((t) => ({ t, xi: m.playingXI?.[t] })).filter((x) => x.xi?.confirmed);
    if (!sides.length) return <Empty>The scorecard will be available once the toss is done.</Empty>;
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {sides.map(({ t, xi }) => (
          <div key={t} className="card p-4">
            <h3 className="mb-3 font-display text-lg font-semibold text-white">{tname(teamMap[t])} <span className="text-sm font-normal text-slate-400">Playing XI</span></h3>
            <ol className="space-y-1.5 text-sm">
              {xi.players.map((id, i) => (
                <li key={id} className="flex gap-3"><span className="w-5 text-slate-500">{i + 1}</span>
                  <Link href={`/players/${id}`} className="text-slate-200 hover:text-gold-300">{name(id)}{xi.captain === id && ' (c)'}{xi.wicketKeeper === id && ' †'}</Link></li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-8">
      {m.innings.map((inn, i) => {
        const ib = balls.filter((b) => b.inn === i + 1);
        if (!ib.length && (m.live?.inn || 1) < i + 1) return null;
        const st = computeInnings(ib);
        const team = teamMap[inn.batting];
        const xi = m.playingXI?.[inn.batting];
        const dnb = (xi?.players || team?.members || []).filter((id) => !st.order.includes(id));
        const capt = xi?.captain ?? team?.captain, keeper = xi?.wicketKeeper ?? team?.wicketKeeper;
        return (
          <div key={i} className="card overflow-hidden">
            <div className="flex items-center justify-between bg-white/[0.03] px-4 py-3">
              <h3 className="font-display text-lg font-semibold text-white">{tname(team)} <span className="text-sm font-normal text-slate-400">Innings</span></h3>
              <span className="font-display text-lg text-white">{st.runs}/{st.wkts} <span className="text-sm text-slate-400">({oversStr(st.legal)} ov)</span></span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead><tr><th className="th">Batter</th><th className="th !text-left"></th><th className="th">R</th><th className="th">B</th><th className="th">4s</th><th className="th">6s</th><th className="th">SR</th></tr></thead>
                <tbody>
                  {st.order.map((id) => {
                    const b = st.batters[id];
                    const notOut = !b.out;
                    return (
                      <tr key={id} className="border-t border-white/[0.04]">
                        <td className="td"><Link href={`/players/${id}`} className="font-medium text-white hover:text-gold-300">{name(id)}{capt === id && ' (c)'}{keeper === id && ' †'}</Link></td>
                        <td className="td !text-left text-xs text-slate-400">{notOut ? (m.status === 'completed' ? 'not out' : 'batting') : dismissalText(b.out, name)}</td>
                        <td className="td font-bold text-white">{b.r}</td><td className="td text-slate-400">{b.b}</td><td className="td text-slate-400">{b.f}</td><td className="td text-slate-400">{b.s}</td><td className="td text-slate-400">{sr(b.r, b.b)}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-white/[0.06]"><td className="td text-slate-300">Extras</td><td className="td !text-left text-xs text-slate-400">(b {st.extras.b}, lb {st.extras.lb}, w {st.extras.w}, nb {st.extras.nb})</td><td className="td font-semibold">{st.extras.b + st.extras.lb + st.extras.w + st.extras.nb}</td><td colSpan={4} /></tr>
                  <tr className="border-t border-white/[0.06] bg-white/[0.02]"><td className="td font-semibold text-white">Total</td><td className="td !text-left text-xs text-slate-400">{oversStr(st.legal)} Ov (RR: {st.legal ? ((st.runs / st.legal) * 6).toFixed(2) : '0.00'})</td><td className="td font-bold text-white">{st.runs}/{st.wkts}</td><td colSpan={4} /></tr>
                </tbody>
              </table>
            </div>
            {dnb.length > 0 && <p className="border-t border-white/[0.04] px-4 py-3 text-xs text-slate-400"><span className="font-semibold text-slate-300">Did not bat: </span>{dnb.map(name).join(', ')}</p>}
            {st.fow.length > 0 && (
              <p className="border-t border-white/[0.04] px-4 py-3 text-xs text-slate-400"><span className="font-semibold text-slate-300">Fall of wickets: </span>
                {st.fow.map((f) => `${f.wkt}-${f.runs} (${name(f.player)}, ${oversStr(f.legal)} ov)`).join(' · ')}</p>
            )}
            <div className="overflow-x-auto border-t border-white/[0.06]">
              <table className="w-full min-w-[640px]">
                <thead><tr><th className="th">Bowler</th><th className="th">O</th><th className="th">M</th><th className="th">R</th><th className="th">W</th><th className="th">Econ</th><th className="th">0s</th><th className="th">4s</th><th className="th">6s</th><th className="th">WD</th><th className="th">NB</th></tr></thead>
                <tbody>
                  {st.bowlOrder.map((id) => {
                    const b = st.bowlers[id];
                    return (
                      <tr key={id} className="border-t border-white/[0.04]">
                        <td className="td"><Link href={`/players/${id}`} className="font-medium text-white hover:text-gold-300">{name(id)}</Link></td>
                        <td className="td">{oversStr(b.balls)}</td><td className="td text-slate-400">{b.maidens}</td><td className="td">{b.runs}</td><td className="td font-bold text-white">{b.w}</td>
                        <td className="td text-slate-400">{econ(b.runs, b.balls)}</td><td className="td text-slate-400">{b.dots}</td><td className="td text-slate-400">{b.f}</td><td className="td text-slate-400">{b.s}</td><td className="td text-slate-400">{b.wd}</td><td className="td text-slate-400">{b.nb}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Commentary({ match: m, balls = [] }) {
  const { teamMap, playerMap } = useData();
  const name = (id) => pname(playerMap[id]);
  const [inn, setInn] = useState(m.live?.inn || 1);
  const ib = balls.filter((b) => b.inn === inn);
  if (!balls.length) return <Empty>Ball-by-ball commentary will appear once play begins.</Empty>;
  const overs = groupByOver(ib).reverse();
  let running = 0, wk = 0;
  const totalsAfterOver = {};
  for (const o of groupByOver(ib)) { for (const b of o.balls) { running += totalRuns(b); if (b.wicket) wk++; } totalsAfterOver[o.over] = `${running}/${wk}`; }
  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(m.innings || []).map((x, i) => (
          <button key={i} onClick={() => setInn(i + 1)} className={`chip ${inn === i + 1 ? '!border-gold-400 !text-gold-300' : ''}`}>{tname(teamMap[x.batting])}</button>
        ))}
      </div>
      <div className="space-y-4">
        {overs.map((o) => {
          const runs = o.balls.reduce((s, b) => s + totalRuns(b), 0);
          return (
            <div key={o.over} className="card overflow-hidden">
              <div className="flex items-center justify-between bg-white/[0.03] px-4 py-2.5 text-sm">
                <span className="font-semibold text-white">Over {o.over + 1}</span>
                <span className="text-slate-400">{runs} run{runs === 1 ? '' : 's'} · {totalsAfterOver[o.over]}</span>
              </div>
              {[...o.balls].reverse().map((b) => (
                <div key={b.id} className="flex gap-4 border-t border-white/[0.04] px-4 py-3">
                  <div className="w-10 shrink-0 pt-1 text-sm tabular-nums text-slate-400">{b.display}</div>
                  <span className={`mt-0.5 grid h-8 min-w-8 shrink-0 place-items-center rounded-full px-1.5 text-xs font-bold ${ballTone(b)}`}>{ballLabel(b)}</span>
                  <div className="min-w-0 text-sm">
                    <div className="text-slate-200"><span className="font-semibold">{name(b.bowler)} to {name(b.batter)}</span>, <span className={b.wicket ? 'font-semibold text-red-300' : ''}>{ballDescription(b)}</span></div>
                    {b.commentary && <p className="mt-1 text-slate-400">{b.commentary}</p>}
                    {(b.zone || b.length) && (
                      <div className="mt-1.5 flex gap-2">
                        {b.zone && <span className="chip !py-0.5 !text-[10px]">Zone: {b.zone}</span>}
                        {b.length && <span className="chip !py-0.5 !text-[10px]">Length: {b.length}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

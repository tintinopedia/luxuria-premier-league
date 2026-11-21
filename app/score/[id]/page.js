'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { collection, doc, orderBy, query, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useData, useLive, pname, tname } from '@/lib/data';
import { oversStr, rr } from '@/lib/format';
import { WICKETS } from '@/lib/constants';
import { ballDescription, ballLabel, ballTone, computeInnings, nextState, summary } from '@/lib/scoring';
import { PlayerPicker } from '@/components/PlayerSearch';
import GroundZones, { PitchMap } from '@/components/GroundZones';
import { Avatar, Empty, Field, Modal, Spinner, TeamBadge } from '@/components/ui';
import { XIGate, xiPlayers, xiReady } from '@/components/PlayingXI';

export default function ScorerPage() {
  const { id } = useParams();
  const { can, loading } = useAuth();
  const { teamMap } = useData();
  const match = useLive(() => doc(db(), 'matches', id), [id]);
  const balls = useLive(() => query(collection(db(), 'matches', id, 'balls'), orderBy('seq')), [id]);

  if (loading || match === undefined || balls === undefined) return <Spinner />;
  if (!can('score.update')) return <Wrap><Empty>You need the &quot;Update Ball-by-Ball Score&quot; permission to score.</Empty></Wrap>;
  if (!match) return <Wrap><Empty>Match not found.</Empty></Wrap>;
  const mref = doc(db(), 'matches', id);

  if (match.status === 'completed') return (
    <Wrap><div className="card p-8 text-center">
      <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-400">Match complete</div>
      <p className="mt-2 text-lg font-semibold text-white">{match.result}</p>
      <Link href={`/match/${id}`} className="btn-primary mt-6">View match centre</Link>
    </div></Wrap>
  );
  if (!match.toss?.winner && !xiReady(match)) return <Wrap><XIGate match={match} /></Wrap>;
  if (!match.toss?.winner) return <Wrap><TossStep match={match} mref={mref} teamMap={teamMap} /></Wrap>;

  const inn = match.live?.inn || 1;
  const innings = match.innings[inn - 1];
  const batTeam = teamMap[innings.batting], bowlTeam = teamMap[innings.bowling];
  if (match.live?.break) return <Wrap><BreakStep match={match} mref={mref} teamMap={teamMap} /></Wrap>;

  const curBalls = balls.filter((b) => b.inn === inn);
  const st = computeInnings(curBalls);
  const live = match.live || { inn };
  const started = !!(live.striker || live.nonStriker || live.bowler || curBalls.length);
  // the confirmed playing XI drives who can be picked and when the innings is all out
  const batXI = xiPlayers(match, innings.batting) || batTeam?.members || [];
  const bowlXI = xiPlayers(match, innings.bowling) || bowlTeam?.members || [];
  const teamSize = Math.max(2, batXI.length || 11);
  const maxBalls = (match.overs || 20) * 6;
  const target = inn === 2 ? (match.score?.[1]?.r || 0) + 1 : null;
  const inningsOver = st.legal >= maxBalls || st.wkts >= teamSize - 1 || (target && st.runs >= target);
  const ctx = { match, mref, balls, curBalls, st, live, inn, batTeam, bowlTeam, teamSize, target, maxBalls, batXI, bowlXI };

  return (
    <Wrap>
      <ScoreHeader {...ctx} />
      <div className="mt-5 overflow-hidden">
        <div className="flex items-start transition-transform duration-500 ease-out" style={{ transform: `translateX(-${started ? 100 : 0}%)` }}>
          <div className={`w-full shrink-0 ${started ? 'h-0 overflow-hidden' : ''}`}>
            {!started && <OpeningSetup {...ctx} />}
          </div>
          <div className={`w-full shrink-0 ${started ? '' : 'h-0 overflow-hidden'}`}>
            {started && (
              inningsOver ? <InningsDone {...ctx} />
                : (live.needNewBatter || !live.striker || !live.nonStriker) ? <NewBatter {...ctx} />
                  : (live.needNewBowler || !live.bowler) ? <NewBowler {...ctx} />
                    : <BallEntry {...ctx} />
            )}
          </div>
        </div>
      </div>
      {started && <Toolbar {...ctx} />}
      {started && <RecentBalls {...ctx} />}
    </Wrap>
  );
}

const Wrap = ({ children }) => <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">{children}</div>;

function ScoreHeader({ match, st, inn, batTeam, live, curBalls, target, maxBalls }) {
  const { playerMap } = useData();
  const lastOver = curBalls.length ? curBalls[curBalls.length - 1].over : -1;
  const thisOver = curBalls.filter((b) => b.over === lastOver);
  const bat = (pid) => st.batters[pid] || { r: 0, b: 0 };
  const bw = live.bowler && (st.bowlers[live.bowler] || { balls: 0, runs: 0, w: 0 });
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-2"><TeamBadge team={batTeam} size={22} /> Innings {inn} · {tname(batTeam)}</span>
        <Link href={`/match/${match.id}`} className="hover:text-gold-300">Match centre ↗</Link>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div className="font-display text-5xl font-bold text-white">{st.runs}/{st.wkts}</div>
        <div className="text-right">
          <div className="font-display text-2xl text-white">Over {oversStr(st.legal) || '0'}</div>
          <div className="text-xs text-slate-400">of {match.overs} · CRR {rr(st.runs, st.legal)}</div>
        </div>
      </div>
      {target && <p className="mt-2 text-sm font-semibold text-gold-300">Target {target} · need {Math.max(0, target - st.runs)} from {maxBalls - st.legal} balls</p>}
      {(live.striker || live.nonStriker) && (
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          {[live.striker, live.nonStriker].map((pid, i) => (
            <div key={i} className="rounded-xl bg-white/[0.03] p-2.5">
              <div className="truncate font-semibold text-white">{pid ? pname(playerMap[pid]) : '—'}{i === 0 && pid && <span className="text-gold-400">*</span>}</div>
              {pid && <div className="tabular-nums text-slate-400">{bat(pid).r} ({bat(pid).b})</div>}
            </div>
          ))}
          <div className="rounded-xl bg-white/[0.03] p-2.5">
            <div className="truncate font-semibold text-white">{live.bowler ? pname(playerMap[live.bowler]) : '—'}</div>
            {bw && <div className="tabular-nums text-slate-400">{bw.w}-{bw.runs} ({oversStr(bw.balls)})</div>}
          </div>
        </div>
      )}
      {thisOver.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {thisOver.map((b) => <span key={b.id} className={`grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-[11px] font-bold ${ballTone(b)}`}>{ballLabel(b)}</span>)}
        </div>
      )}
    </div>
  );
}

function TossStep({ match, mref, teamMap }) {
  const [w, setW] = useState('');
  const [d, setD] = useState('bat');
  const [busy, setBusy] = useState(false);
  const other = (t) => (t === match.teamA ? match.teamB : match.teamA);
  async function go() {
    setBusy(true);
    const bat = d === 'bat' ? w : other(w);
    await updateDoc(mref, {
      toss: { winner: w, decision: d },
      innings: [{ batting: bat, bowling: other(bat) }, { batting: other(bat), bowling: bat }],
      status: 'live', live: { inn: 1 }, score: {}, startedAt: serverTimestamp(),
    });
    setBusy(false);
  }
  return (
    <div className="card space-y-6 p-6">
      <h2 className="section-title">Toss</h2>
      <Field label="Toss won by">
        <div className="grid grid-cols-2 gap-3">
          {[match.teamA, match.teamB].map((t) => (
            <button key={t} onClick={() => setW(t)} className={`choice flex items-center gap-3 ${w === t ? 'choice-on' : ''}`}><TeamBadge team={teamMap[t]} size={28} />{tname(teamMap[t])}</button>
          ))}
        </div>
      </Field>
      <Field label="Elected to">
        <div className="grid grid-cols-2 gap-3">
          {[['bat', 'Bat'], ['bowl', 'Bowl']].map(([k, l]) => <button key={k} onClick={() => setD(k)} className={`choice ${d === k ? 'choice-on' : ''}`}>{l}</button>)}
        </div>
      </Field>
      <button disabled={!w || busy} onClick={go} className="btn-primary w-full">Start match</button>
    </div>
  );
}

function BreakStep({ match, mref, teamMap }) {
  const target = (match.score?.[1]?.r || 0) + 1;
  return (
    <div className="card p-8 text-center">
      <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-300">Innings break</div>
      <p className="mt-2 text-lg text-white">{tname(teamMap[match.innings[1].batting])} need <b>{target}</b> to win from {match.overs} overs</p>
      <button onClick={() => updateDoc(mref, { live: { inn: 2 } })} className="btn-primary mt-6">Start 2nd innings</button>
    </div>
  );
}

function OpeningSetup({ mref, inn, batTeam, bowlTeam, batXI, bowlXI }) {
  const [bowler, setBowler] = useState(null);
  const [a, setA] = useState(null);
  const [b, setB] = useState(null);
  const [striker, setStriker] = useState(null);
  const { playerMap } = useData();
  const ok = bowler && a && b && a !== b && striker;
  async function go() {
    await updateDoc(mref, { live: { inn, striker, nonStriker: striker === a ? b : a, bowler, prevBowler: null, needNewBatter: false, needNewBowler: false } });
  }
  return (
    <div className="card space-y-6 p-6">
      <div>
        <h2 className="section-title">Start of innings {inn}</h2>
        <p className="text-sm text-slate-400">{tname(batTeam)} batting · {tname(bowlTeam)} bowling</p>
      </div>
      <PlayerPicker label="Who is bowling?" value={bowler} onChange={setBowler} only={bowlXI} exclude={[a, b].filter(Boolean)} />
      <div className="grid gap-5 sm:grid-cols-2">
        <PlayerPicker label="Opening batsman 1" value={a} onChange={(v) => { setA(v); if (striker === a) setStriker(null); }} only={batXI} exclude={[b, bowler].filter(Boolean)} />
        <PlayerPicker label="Opening batsman 2" value={b} onChange={(v) => { setB(v); if (striker === b) setStriker(null); }} only={batXI} exclude={[a, bowler].filter(Boolean)} />
      </div>
      {a && b && (
        <Field label="Who takes strike?">
          <div className="grid grid-cols-2 gap-3">
            {[a, b].map((pid) => (
              <button key={pid} onClick={() => setStriker(pid)} className={`choice flex items-center gap-3 ${striker === pid ? 'choice-on' : ''}`}>
                <Avatar src={playerMap[pid]?.photoURL} name={playerMap[pid]?.fullName || ''} size={28} />{pname(playerMap[pid])}
              </button>
            ))}
          </div>
        </Field>
      )}
      <button disabled={!ok} onClick={go} className="btn-primary w-full">Continue to first ball →</button>
    </div>
  );
}

function NewBatter({ mref, live, st, batXI }) {
  const [pid, setPid] = useState(null);
  const outIds = st.order.filter((x) => st.batters[x].out);
  const slot = !live.striker ? 'striker' : 'nonStriker';
  return (
    <div className="card space-y-5 p-6">
      <h2 className="section-title">New batsman</h2>
      <p className="-mt-3 text-sm text-slate-400">Comes in at the {slot === 'striker' ? "striker's" : "non-striker's"} end</p>
      <PlayerPicker value={pid} onChange={setPid} only={batXI} exclude={[...outIds, live.striker, live.nonStriker].filter(Boolean)} />
      <button disabled={!pid} onClick={() => updateDoc(mref, { live: { ...live, [slot]: pid, needNewBatter: false } })} className="btn-primary w-full">Confirm</button>
    </div>
  );
}

function NewBowler({ mref, live, bowlXI, st }) {
  const [pid, setPid] = useState(null);
  return (
    <div className="card space-y-5 p-6">
      <h2 className="section-title">Over {Math.floor(st.legal / 6) + 1}: who bowls?</h2>
      <PlayerPicker value={pid} onChange={setPid} only={bowlXI} exclude={[live.prevBowler].filter(Boolean)} />
      <button disabled={!pid} onClick={() => updateDoc(mref, { live: { ...live, bowler: pid, needNewBowler: false } })} className="btn-primary w-full">Start over</button>
    </div>
  );
}

function BallEntry({ match, mref, balls, curBalls, st, live, inn, bowlXI }) {
  const { user, can } = useAuth();
  const { playerMap } = useData();
  const [type, setType] = useState('legit');
  const [runs, setRuns] = useState(0);
  const [custom, setCustom] = useState('');
  const [runsTo, setRunsTo] = useState('bat');
  const [wk, setWk] = useState(false);
  const [wkKind, setWkKind] = useState('Bowled');
  const [outWho, setOutWho] = useState('striker');
  const [fielder, setFielder] = useState('');
  const [zone, setZone] = useState(null);
  const [length, setLength] = useState(null);
  const [comm, setComm] = useState('');
  const [busy, setBusy] = useState(false);
  const fielders = bowlXI.length ? bowlXI : Object.keys(playerMap);

  function reset() {
    setType('legit'); setRuns(0); setCustom(''); setRunsTo('bat'); setWk(false); setWkKind('Bowled');
    setOutWho('striker'); setFielder(''); setZone(null); setLength(null); setComm('');
  }

  async function submit() {
    const r = runs === 'more' ? Math.max(0, parseInt(custom, 10) || 0) : runs;
    const legalBefore = st.legal;
    const over = Math.floor(legalBefore / 6);
    const outId = wk ? (wkKind === 'Run Out' && outWho === 'nonStriker' ? live.nonStriker : live.striker) : null;
    const ball = {
      inn, seq: (balls.length ? balls[balls.length - 1].seq : 0) + 1, over, display: `${over}.${(legalBefore % 6) + 1}`,
      type, runs: r, runsTo: type === 'wide' ? 'wide' : runsTo,
      batter: live.striker, nonStriker: live.nonStriker, bowler: live.bowler,
      wicket: wk ? { kind: wkKind, out: outId, fielder: fielder || null } : null, outPlayer: outId,
      zone: zone || null, length: length || null,
      commentary: can('commentary.update') ? comm.trim() : '',
      stateBefore: { ...live }, createdAt: serverTimestamp(), by: user.uid,
    };
    const legalAfter = legalBefore + (type === 'legit' ? 1 : 0);
    const newLive = nextState(live, ball, type === 'legit' ? ((legalAfter - 1) % 6) + 1 : -1);
    const st2 = computeInnings([...curBalls, ball]);
    setBusy(true);
    try {
      const batch = writeBatch(db());
      batch.set(doc(collection(db(), 'matches', match.id, 'balls')), ball);
      batch.update(mref, { live: newLive, [`score.${inn}`]: summary(st2), lastBallAt: serverTimestamp() });
      await batch.commit();
      reset();
    } catch (e) { alert(e.message); }
    setBusy(false);
  }

  const needsFielder = ['Caught', 'Run Out', 'Stumped'].includes(wkKind);
  return (
    <div className="card space-y-6 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Ball {Math.floor(st.legal / 6)}.{(st.legal % 6) + 1}</h2>
        <span className="text-xs text-slate-400">{pname(playerMap[live.bowler])} to {pname(playerMap[live.striker])}</span>
      </div>

      <Field label="Delivery">
        <div className="grid grid-cols-3 gap-2">
          {[['legit', 'Legit Delivery', '●'], ['noball', 'No Ball', 'NB'], ['wide', 'Wide Ball', 'WD']].map(([k, l, ic]) => (
            <button key={k} onClick={() => { setType(k); if (k === 'wide') setRunsTo('bat'); }} className={`choice flex flex-col items-center gap-1 py-4 ${type === k ? 'choice-on' : ''}`}>
              <span className="font-display text-xl">{ic}</span><span className="text-xs">{l}</span>
            </button>
          ))}
        </div>
      </Field>

      <Field label={type === 'wide' ? 'Additional runs (on top of the wide)' : 'Runs'}>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button key={n} onClick={() => setRuns(n)} className={`choice py-3 font-display text-xl ${runs === n ? 'choice-on' : ''}`}>{n}</button>
          ))}
          <button onClick={() => setRuns('more')} className={`choice text-xs ${runs === 'more' ? 'choice-on' : ''}`}>8+</button>
        </div>
        {runs === 'more' && <input autoFocus type="number" min="8" className="input mt-2" placeholder="Enter runs" value={custom} onChange={(e) => setCustom(e.target.value)} />}
      </Field>

      {type !== 'wide' && (
        <Field label="Bye or Player">
          <div className="grid grid-cols-3 gap-2">
            {[['bat', 'Player'], ['bye', 'Bye'], ['legbye', 'Leg Bye']].map(([k, l]) => (
              <button key={k} onClick={() => setRunsTo(k)} className={`choice ${runsTo === k ? 'choice-on' : ''}`}>{l}</button>
            ))}
          </div>
        </Field>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Scoring zone (optional)">
          <div className="flex justify-center rounded-2xl bg-white/[0.02] p-3"><GroundZones value={zone} onChange={setZone} /></div>
          <div className="mt-1 text-center text-xs text-slate-400">{zone || 'Tap where the ball went'}</div>
        </Field>
        <Field label="Pitch length (optional)">
          <div className="flex justify-center rounded-2xl bg-white/[0.02] p-3"><PitchMap value={length} onChange={setLength} /></div>
          <div className="mt-1 text-center text-xs text-slate-400">{length || 'Tap where the ball landed'}</div>
        </Field>
      </div>

      <div className="rounded-2xl border border-white/[0.06] p-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" checked={wk} onChange={(e) => setWk(e.target.checked)} className="h-5 w-5 accent-red-500" />
          <span className="font-semibold text-white">Wicket on this ball</span>
        </label>
        {wk && (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {WICKETS.map((k) => <button key={k} onClick={() => setWkKind(k)} className={`chip ${wkKind === k ? '!border-live !bg-live/15 !text-red-200' : ''}`}>{k}</button>)}
            </div>
            {['Run Out', 'Retired Out'].includes(wkKind) && (
              <div className="grid grid-cols-2 gap-2">
                {[['striker', live.striker], ['nonStriker', live.nonStriker]].map(([k, pid]) => (
                  <button key={k} onClick={() => setOutWho(k)} className={`choice ${outWho === k ? 'choice-on' : ''}`}>{pname(playerMap[pid])} out</button>
                ))}
              </div>
            )}
            {needsFielder && (
              <select className="input" value={fielder} onChange={(e) => setFielder(e.target.value)}>
                <option value="">Fielder (optional)</option>
                {fielders.map((pid) => <option key={pid} value={pid}>{pname(playerMap[pid])}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {can('commentary.update') && (
        <Field label="Commentary (optional)">
          <textarea rows={2} className="input" value={comm} onChange={(e) => setComm(e.target.value)} placeholder="e.g. Full and wide, driven through cover for four" />
        </Field>
      )}

      <button disabled={busy || (runs === 'more' && !custom)} onClick={submit} className="btn-primary w-full py-3.5 text-base">
        {busy ? 'Saving…' : 'Record ball'}
      </button>
    </div>
  );
}

function InningsDone({ inn, st, ...ctx }) {
  const [endOpen, setEndOpen] = useState(false);
  return (
    <div className="card p-8 text-center">
      <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-gold-400">Innings complete</div>
      <p className="mt-2 text-lg text-white">{st.runs}/{st.wkts} in {oversStr(st.legal)} overs</p>
      {inn === 1
        ? <button onClick={() => endInnings({ inn, st, ...ctx })} className="btn-primary mt-6">End innings</button>
        : <button onClick={() => setEndOpen(true)} className="btn-primary mt-6">End match</button>}
      {endOpen && <EndMatch open onClose={() => setEndOpen(false)} inn={inn} st={st} {...ctx} />}
    </div>
  );
}

async function endInnings({ mref, inn, st, teamSize }) {
  if (!confirm('End this innings?')) return;
  await updateDoc(mref, { live: { inn: 2, break: true }, [`score.${inn}`]: { ...summary(st), allOut: st.wkts >= teamSize - 1 } });
}

function Toolbar(ctx) {
  const { can } = useAuth();
  const { mref, live, curBalls, inn, st } = ctx;
  const [endOpen, setEndOpen] = useState(false);
  async function undo() {
    const last = curBalls[curBalls.length - 1];
    if (!last || !confirm(`Delete the last ball (${last.display})?`)) return;
    const batch = writeBatch(db());
    batch.delete(doc(db(), 'matches', ctx.match.id, 'balls', last.id));
    batch.update(mref, { live: last.stateBefore || live, [`score.${inn}`]: summary(computeInnings(curBalls.slice(0, -1))) });
    await batch.commit();
  }
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {can('score.delete') && curBalls.length > 0 && <button onClick={undo} className="btn-ghost btn-sm">↶ Undo last ball</button>}
      <button onClick={() => updateDoc(mref, { live: { ...live, striker: live.nonStriker, nonStriker: live.striker } })} className="btn-ghost btn-sm">⇄ Swap strike</button>
      {live.bowler && <button onClick={() => confirm('Replace the current bowler?') && updateDoc(mref, { live: { ...live, bowler: null } })} className="btn-ghost btn-sm">Change bowler</button>}
      {inn === 1 && <button onClick={() => endInnings(ctx)} className="btn-ghost btn-sm">End innings</button>}
      <button onClick={() => setEndOpen(true)} className="btn-danger btn-sm ml-auto">End match</button>
      {endOpen && <EndMatch open onClose={() => setEndOpen(false)} {...ctx} st={st} />}
    </div>
  );
}

function EndMatch({ open, onClose, match, mref, inn, st, teamSize }) {
  const { teamMap } = useData();
  const t1 = match.innings[0].batting, t2 = match.innings[1].batting;
  const s1 = inn === 1 ? summary(st) : match.score?.[1] || { r: 0, w: 0 };
  const s2 = inn === 2 ? summary(st) : { r: 0, w: 0 };
  let sw = '', sr2 = 'No result';
  if (inn === 2) {
    if (s2.r > s1.r) { sw = t2; sr2 = `${tname(teamMap[t2])} won by ${Math.max(1, teamSize - 1 - s2.w)} wickets`; }
    else if (s1.r > s2.r) { sw = t1; sr2 = `${tname(teamMap[t1])} won by ${s1.r - s2.r} runs`; }
    else { sw = 'tie'; sr2 = 'Match tied'; }
  }
  const [winner, setWinner] = useState(sw);
  const [result, setResult] = useState(sr2);
  const [mom, setMom] = useState(null);
  const pool = [...(xiPlayers(match, t1) || teamMap[t1]?.members || []), ...(xiPlayers(match, t2) || teamMap[t2]?.members || [])];
  async function save() {
    await updateDoc(mref, {
      status: 'completed', winner: winner || null, result, manOfMatch: mom || null, completedAt: serverTimestamp(),
      [`score.${inn}`]: { ...summary(st), allOut: st.wkts >= teamSize - 1 },
    });
    onClose();
  }
  return (
    <Modal open={open} onClose={onClose} title="End match">
      <div className="space-y-5">
        <Field label="Winner">
          <select className="input" value={winner} onChange={(e) => setWinner(e.target.value)}>
            <option value="">No result</option><option value="tie">Tie</option>
            {[t1, t2].map((t) => <option key={t} value={t}>{tname(teamMap[t])}</option>)}
          </select>
        </Field>
        <Field label="Result text"><input className="input" value={result} onChange={(e) => setResult(e.target.value)} /></Field>
        <PlayerPicker label="Player of the match" value={mom} onChange={setMom} only={pool.length ? pool : null} />
        <button onClick={save} className="btn-primary w-full">Confirm &amp; end match</button>
      </div>
    </Modal>
  );
}

function RecentBalls({ match, curBalls, mref, inn }) {
  const { can } = useAuth();
  const { playerMap } = useData();
  const [edit, setEdit] = useState(null);
  const canEdit = can('score.edit') || can('commentary.update') || can('commentary.delete');
  const list = [...curBalls].reverse().slice(0, 18);
  if (!list.length) return null;
  return (
    <div className="mt-6">
      <h3 className="label">Recent balls</h3>
      <div className="card divide-y divide-white/[0.04]">
        {list.map((b) => (
          <div key={b.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <span className="w-9 tabular-nums text-slate-500">{b.display}</span>
            <span className={`grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-[11px] font-bold ${ballTone(b)}`}>{ballLabel(b)}</span>
            <span className="min-w-0 flex-1 truncate text-slate-300">{pname(playerMap[b.bowler])} to {pname(playerMap[b.batter])}, {ballDescription(b)}{b.commentary ? ` · ${b.commentary}` : ''}</span>
            {canEdit && <button onClick={() => setEdit(b)} className="text-xs text-slate-400 hover:text-gold-300">Edit</button>}
          </div>
        ))}
      </div>
      {edit && <EditBall ball={edit} onClose={() => setEdit(null)} match={match} mref={mref} curBalls={curBalls} inn={inn} />}
    </div>
  );
}

function EditBall({ ball, onClose, match, mref, curBalls, inn }) {
  const { can } = useAuth();
  const [f, setF] = useState({ type: ball.type, runs: ball.runs, runsTo: ball.runsTo === 'wide' ? 'bat' : ball.runsTo, zone: ball.zone, length: ball.length, commentary: ball.commentary || '' });
  const scoreEdit = can('score.edit');
  async function save(clearComm) {
    const patch = {};
    if (scoreEdit) Object.assign(patch, { type: f.type, runs: Number(f.runs) || 0, runsTo: f.type === 'wide' ? 'wide' : f.runsTo, zone: f.zone || null, length: f.length || null });
    if (can('commentary.update')) patch.commentary = f.commentary.trim();
    if (clearComm) patch.commentary = '';
    await updateDoc(doc(db(), 'matches', match.id, 'balls', ball.id), patch);
    if (scoreEdit) {
      const updated = curBalls.map((b) => (b.id === ball.id ? { ...b, ...patch } : b));
      await updateDoc(mref, { [`score.${inn}`]: summary(computeInnings(updated)) });
    }
    onClose();
  }
  return (
    <Modal open onClose={onClose} title={`Edit ball ${ball.display}`}>
      <div className="space-y-4">
        {scoreEdit && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[['legit', 'Legit'], ['noball', 'No Ball'], ['wide', 'Wide']].map(([k, l]) => <button key={k} onClick={() => setF({ ...f, type: k })} className={`choice ${f.type === k ? 'choice-on' : ''}`}>{l}</button>)}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Runs"><input type="number" min="0" className="input" value={f.runs} onChange={(e) => setF({ ...f, runs: e.target.value })} /></Field>
              {f.type !== 'wide' && (
                <Field label="Bye or Player">
                  <select className="input" value={f.runsTo} onChange={(e) => setF({ ...f, runsTo: e.target.value })}>
                    <option value="bat">Player</option><option value="bye">Bye</option><option value="legbye">Leg Bye</option>
                  </select>
                </Field>
              )}
            </div>
            <p className="text-xs text-slate-500">Changing runs here won&apos;t re-rotate strike. Use &quot;Swap strike&quot; if needed.</p>
          </>
        )}
        {can('commentary.update') && <Field label="Commentary"><textarea rows={3} className="input" value={f.commentary} onChange={(e) => setF({ ...f, commentary: e.target.value })} /></Field>}
        <div className="flex gap-2">
          <button onClick={() => save(false)} className="btn-primary flex-1">Save</button>
          {can('commentary.delete') && ball.commentary && <button onClick={() => save(true)} className="btn-danger">Delete commentary</button>}
        </div>
      </div>
    </Modal>
  );
}

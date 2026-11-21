import { BOWLER_CREDIT } from './constants';

// Ball doc shape:
// { inn, seq, over, display, type: 'legit'|'noball'|'wide', runs, runsTo: 'bat'|'bye'|'legbye'|'wide',
//   batter, nonStriker, bowler, wicket: {kind, out, fielder}|null, outPlayer, zone, length, commentary, stateBefore }

export const batRuns = (b) => (b.type !== 'wide' && b.runsTo === 'bat' ? b.runs || 0 : 0);
export function extraRuns(b) {
  const r = b.runs || 0;
  if (b.type === 'wide') return 1 + r;
  if (b.type === 'noball') return 1 + (b.runsTo === 'bat' ? 0 : r);
  return b.runsTo === 'bat' ? 0 : r;
}
export const totalRuns = (b) => batRuns(b) + extraRuns(b);
export function bowlerRuns(b) {
  if (b.type === 'wide') return 1 + (b.runs || 0);
  if (b.type === 'noball') return 1 + batRuns(b);
  return batRuns(b);
}

export function computeInnings(balls = []) {
  const s = {
    runs: 0, wkts: 0, legal: 0, extras: { w: 0, nb: 0, b: 0, lb: 0 },
    batters: {}, order: [], bowlers: {}, bowlOrder: [], fow: [],
  };
  const bat = (id) => {
    if (!id) return null;
    if (!s.batters[id]) { s.batters[id] = { id, r: 0, b: 0, f: 0, s: 0, out: null }; s.order.push(id); }
    return s.batters[id];
  };
  const bowl = (id) => {
    if (!id) return null;
    if (!s.bowlers[id]) { s.bowlers[id] = { id, balls: 0, runs: 0, w: 0, dots: 0, f: 0, s: 0, wd: 0, nb: 0, perOver: {} }; s.bowlOrder.push(id); }
    return s.bowlers[id];
  };
  for (const b of balls) {
    const bt = bat(b.batter); bat(b.nonStriker);
    const bw = bowl(b.bowler);
    const br = batRuns(b);
    const r = b.runs || 0;
    s.runs += totalRuns(b);
    if (b.type === 'wide') s.extras.w += 1 + r;
    else {
      if (b.type === 'noball') s.extras.nb += 1;
      if (b.runsTo === 'bye') s.extras.b += r;
      if (b.runsTo === 'legbye') s.extras.lb += r;
      if (bt) { bt.b += 1; bt.r += br; if (br === 4) bt.f++; if (br === 6) bt.s++; }
    }
    if (bw) {
      const conceded = bowlerRuns(b);
      bw.runs += conceded;
      if (br === 4) bw.f++;
      if (br === 6) bw.s++;
      if (b.type === 'wide') bw.wd++;
      if (b.type === 'noball') bw.nb++;
      const o = (bw.perOver[b.over] ||= { legal: 0, runs: 0 });
      o.runs += conceded;
      if (b.type === 'legit') { bw.balls++; o.legal++; if (conceded === 0) bw.dots++; }
    }
    if (b.type === 'legit') s.legal++;
    if (b.wicket) {
      s.wkts++;
      const outId = b.wicket.out || b.batter;
      const ob = bat(outId);
      if (ob) ob.out = { kind: b.wicket.kind, bowler: b.bowler, fielder: b.wicket.fielder || null };
      if (bw && BOWLER_CREDIT.includes(b.wicket.kind)) bw.w++;
      s.fow.push({ wkt: s.wkts, runs: s.runs, player: outId, legal: s.legal });
    }
  }
  for (const id of s.bowlOrder) {
    const bw = s.bowlers[id];
    bw.maidens = Object.values(bw.perOver).filter((o) => o.legal === 6 && o.runs === 0).length;
  }
  return s;
}

export const summary = (st) => ({ r: st.runs, w: st.wkts, b: st.legal });

export function ballLabel(b) {
  const r = b.runs || 0;
  if (b.wicket) return 'W';
  if (b.type === 'wide') return `${1 + r}wd`;
  if (b.type === 'noball') return `${b.runsTo === 'bat' ? r : ''}nb${b.runsTo === 'bye' && r ? r + 'b' : ''}${b.runsTo === 'legbye' && r ? r + 'lb' : ''}`;
  if (b.runsTo === 'bye') return `${r}b`;
  if (b.runsTo === 'legbye') return `${r}lb`;
  return r === 0 ? '•' : String(r);
}

export function ballTone(b) {
  if (b.wicket) return 'bg-live text-white';
  const br = batRuns(b);
  if (br === 6) return 'bg-violet-500 text-white';
  if (br === 4) return 'bg-sky-500 text-white';
  if (b.type !== 'legit') return 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40';
  if (totalRuns(b) === 0) return 'bg-ink-600 text-slate-400';
  return 'bg-ink-600 text-slate-100';
}

export function ballDescription(b) {
  const r = b.runs || 0;
  let t;
  if (b.type === 'wide') t = r ? `wide, ${1 + r} runs` : 'wide';
  else if (b.type === 'noball') t = `no ball${r ? `, ${r} ${b.runsTo === 'bat' ? 'run' + (r > 1 ? 's' : '') : b.runsTo === 'bye' ? 'bye' + (r > 1 ? 's' : '') : 'leg bye' + (r > 1 ? 's' : '')}` : ''}`;
  else if (b.runsTo === 'bye') t = `${r} bye${r > 1 ? 's' : ''}`;
  else if (b.runsTo === 'legbye') t = `${r} leg bye${r > 1 ? 's' : ''}`;
  else if (r === 4) t = 'FOUR';
  else if (r === 6) t = 'SIX';
  else if (r === 0) t = 'no run';
  else t = `${r} run${r > 1 ? 's' : ''}`;
  if (b.wicket) t = `OUT! ${b.wicket.kind}${b.runs ? `, ${t}` : ''}`;
  return t;
}

export function dismissalText(out, name) {
  if (!out) return 'not out';
  const bw = name(out.bowler);
  const f = out.fielder ? name(out.fielder) : '';
  switch (out.kind) {
    case 'Bowled': return `b ${bw}`;
    case 'Caught': return f && out.fielder === out.bowler ? `c & b ${bw}` : `c ${f || 'sub'} b ${bw}`;
    case 'LBW': return `lbw b ${bw}`;
    case 'Run Out': return `run out${f ? ` (${f})` : ''}`;
    case 'Stumped': return `st ${f || ''} b ${bw}`;
    case 'Hit Wicket': return `hit wicket b ${bw}`;
    default: return 'retired out';
  }
}

// state after a ball: strike rotation, end of over, wicket
export function nextState(live, ball, legalInOverAfter) {
  let striker = live.striker ?? null;
  let nonStriker = live.nonStriker ?? null;
  const swap = () => { const t = striker; striker = nonStriker; nonStriker = t; };
  // odd runs (1, 3, 5, 7...) mean the batters crossed
  if ((ball.runs || 0) % 2 === 1) swap();
  let needNewBatter = false;
  if (ball.wicket) {
    const out = ball.wicket.out || ball.batter;
    if (striker === out) striker = null;
    else if (nonStriker === out) nonStriker = null;
    needNewBatter = true;
  }
  const overDone = ball.type === 'legit' && legalInOverAfter === 6;
  if (overDone) swap();
  return {
    ...live,
    striker, nonStriker,
    needNewBatter,
    needNewBowler: overDone,
    prevBowler: overDone ? live.bowler ?? null : live.prevBowler ?? null,
    bowler: overDone ? null : live.bowler ?? null,
  };
}

export function lastNOvers(balls, n = 5) {
  let legal = 0, runs = 0, wkts = 0;
  for (let i = balls.length - 1; i >= 0 && legal < n * 6; i--) {
    const b = balls[i];
    runs += totalRuns(b);
    if (b.wicket) wkts++;
    if (b.type === 'legit') legal++;
  }
  return { legal, runs, wkts };
}

export function groupByOver(balls) {
  const map = new Map();
  for (const b of balls) {
    const k = `${b.inn}-${b.over}`;
    if (!map.has(k)) map.set(k, { inn: b.inn, over: b.over, balls: [] });
    map.get(k).balls.push(b);
  }
  return [...map.values()];
}

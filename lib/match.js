import { fmtDate, fmtTime, isToday, toDate } from './format';
import { tname } from './data';

export const battingOrder = (m) =>
  m.innings?.length ? [m.innings[0].batting, m.innings[0].bowling] : [m.teamA, m.teamB];

export function scoreFor(m, teamId) {
  const idx = (m.innings || []).findIndex((i) => i.batting === teamId);
  return idx >= 0 ? m.score?.[idx + 1] || null : null;
}

export function statusLabel(m) {
  if (m.status === 'completed') return 'RESULT';
  if (m.status === 'live') return m.live?.break ? 'INNINGS BREAK' : 'LIVE';
  return 'UPCOMING';
}

export function tossText(m, teamMap) {
  if (!m.toss?.winner) return '';
  return `${tname(teamMap[m.toss.winner])} won the toss and chose to ${m.toss.decision === 'bat' ? 'bat' : 'field'}`;
}

export function statusText(m, teamMap) {
  if (m.status === 'completed') return m.result || 'Match ended';
  if (m.status === 'upcoming') {
    const d = toDate(m.date);
    if (!d) return 'Schedule to be announced';
    const mins = Math.round((d - Date.now()) / 60000);
    if (mins > 0 && mins <= 180) return `Match starts in ${mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} mins`}`;
    return `Starts ${isToday(d) ? 'today' : fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' })}, ${fmtTime(d)}`;
  }
  const inn = m.live?.inn || 1;
  if (inn === 2 && m.innings?.[1]) {
    const target = (m.score?.[1]?.r || 0) + 1;
    const s2 = m.score?.[2] || { r: 0, b: 0 };
    const need = target - s2.r;
    const left = (m.overs || 20) * 6 - (s2.b || 0);
    const team = tname(teamMap[m.innings[1].batting]);
    if (m.live?.break) return `${team} need ${target} runs to win`;
    return `${team} need ${need} run${need === 1 ? '' : 's'} in ${left} ball${left === 1 ? '' : 's'}`;
  }
  return tossText(m, teamMap) || 'Match in progress';
}

export function sortFixtures(matches = []) {
  const rank = (m) => (m.status === 'live' ? 0 : m.status === 'upcoming' ? 1 : 2);
  return [...matches].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r) return r;
    const da = toDate(a.date)?.getTime() || 0, dbb = toDate(b.date)?.getTime() || 0;
    return a.status === 'completed' ? dbb - da : da - dbb;
  });
}

export function pickFeatured(matches = []) {
  const live = matches.filter((m) => m.status === 'live')
    .sort((a, b) => (toDate(b.lastBallAt)?.getTime() || 0) - (toDate(a.lastBallAt)?.getTime() || 0));
  if (live[0]) return live[0];
  const done = matches.filter((m) => m.status === 'completed')
    .sort((a, b) => (toDate(b.date)?.getTime() || 0) - (toDate(a.date)?.getTime() || 0));
  if (done[0]) return done[0];
  return sortFixtures(matches.filter((m) => m.status === 'upcoming'))[0] || null;
}

'use client';
import { useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useData, pname, tname } from '@/lib/data';
import { Avatar, Modal, TeamBadge } from './ui';

export const sideSize = (m) => Number(m?.playersPerSide) || 11;
export const xiOf = (m, teamId) => m?.playingXI?.[teamId] || null;
export const xiPlayers = (m, teamId) => xiOf(m, teamId)?.players || null;
export const xiReady = (m) => !!(xiOf(m, m.teamA)?.confirmed && xiOf(m, m.teamB)?.confirmed);

export function XIStatus({ m }) {
  const { teamMap } = useData();
  return (
    <div className="flex flex-wrap gap-2">
      {[m.teamA, m.teamB].map((t) => {
        const x = xiOf(m, t);
        return (
          <span key={t} className={`chip !py-0.5 ${x?.confirmed ? '!border-emerald-400/40 !text-emerald-300' : '!text-amber-300'}`}>
            {(teamMap[t]?.shortName || tname(teamMap[t])).toUpperCase()} XI {x?.confirmed ? '✓' : 'pending'}
          </span>
        );
      })}
    </div>
  );
}

// Lets the team manager / scorer pick who actually plays from the full squad
export function PlayingXIModal({ match: m, onClose }) {
  const { teamMap, playerMap } = useData();
  const { user, can } = useAuth();
  const [team, setTeam] = useState(m.teamA);
  const size = sideSize(m);
  const init = (t) => {
    const x = xiOf(m, t);
    const squad = teamMap[t];
    return { players: x?.players || [], captain: x?.captain ?? squad?.captain ?? null, wicketKeeper: x?.wicketKeeper ?? squad?.wicketKeeper ?? null };
  };
  const [draft, setDraft] = useState({ [m.teamA]: init(m.teamA), [m.teamB]: init(m.teamB) });
  const [busy, setBusy] = useState(false);
  const d = draft[team];
  const squad = teamMap[team]?.members || [];
  const set = (patch) => setDraft({ ...draft, [team]: { ...d, ...patch } });
  const locked = m.status !== 'upcoming' && !can('tournaments.manage');

  function toggle(pid) {
    if (d.players.includes(pid)) {
      set({ players: d.players.filter((x) => x !== pid), captain: d.captain === pid ? null : d.captain, wicketKeeper: d.wicketKeeper === pid ? null : d.wicketKeeper });
    } else if (d.players.length < size) set({ players: [...d.players, pid] });
  }

  async function confirmXI() {
    if (d.players.length !== size && !confirm(`${tname(teamMap[team])} has ${d.players.length} of ${size} players. Confirm anyway?`)) return;
    if (!d.captain || !d.wicketKeeper) return alert('Pick a captain and a wicket keeper from the playing XI.');
    setBusy(true);
    try {
      await updateDoc(doc(db(), 'matches', m.id), {
        [`playingXI.${team}`]: { ...d, confirmed: true, confirmedBy: user.uid, confirmedAt: serverTimestamp() },
      });
      const other = team === m.teamA ? m.teamB : m.teamA;
      if (!xiOf(m, other)?.confirmed) setTeam(other); else onClose();
    } catch (e) { alert(e.message); }
    setBusy(false);
  }

  return (
    <Modal open wide title="Playing XI" onClose={onClose}>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {[m.teamA, m.teamB].map((t) => (
          <button key={t} onClick={() => setTeam(t)} className={`choice flex items-center gap-3 ${team === t ? 'choice-on' : ''}`}>
            <TeamBadge team={teamMap[t]} size={28} />
            <span className="truncate">{tname(teamMap[t])}</span>
            <span className="ml-auto text-xs">{xiOf(m, t)?.confirmed ? '✓' : `${draft[t].players.length}/${size}`}</span>
          </button>
        ))}
      </div>
      {squad.length === 0 ? <p className="text-sm text-amber-300">This team has no squad yet. Add members in Teams &amp; Members first.</p> : (
        <>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-400">Tick the players taking the field. C = captain, WK = wicket keeper.</span>
            <span className={`font-semibold ${d.players.length === size ? 'text-emerald-300' : 'text-gold-300'}`}>{d.players.length}/{size}</span>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {squad.map((pid) => {
              const p = playerMap[pid];
              const on = d.players.includes(pid);
              return (
                <div key={pid} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${on ? 'border-gold-400/50 bg-gold-400/10' : 'border-white/[0.06]'}`}>
                  <input type="checkbox" disabled={locked} checked={on} onChange={() => toggle(pid)} className="h-4 w-4 accent-amber-400" />
                  <Avatar src={p?.photoURL} name={p?.fullName || ''} size={30} />
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">{pname(p)}</div><div className="truncate text-[11px] text-slate-400">{p?.skill}</div></div>
                  {on && (
                    <>
                      <button disabled={locked} onClick={() => set({ captain: pid })} className={`chip !px-2 !py-0.5 ${d.captain === pid ? '!border-gold-400 !text-gold-300' : ''}`}>C</button>
                      <button disabled={locked} onClick={() => set({ wicketKeeper: pid })} className={`chip !px-2 !py-0.5 ${d.wicketKeeper === pid ? '!border-sky-400 !text-sky-300' : ''}`}>WK</button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {locked ? <p className="mt-4 text-sm text-slate-400">The match has started, so the XI is locked.</p> : (
            <button disabled={busy || !d.players.length} onClick={confirmXI} className="btn-primary mt-5 w-full">
              Confirm {tname(teamMap[team])} XI to the scorer
            </button>
          )}
        </>
      )}
    </Modal>
  );
}

// Shown on the scorer screen until both XIs are confirmed
export function XIGate({ match: m }) {
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className="card space-y-4 p-6 text-center">
      <h2 className="section-title">Playing XI needed</h2>
      <p className="text-sm text-slate-400">Both teams must confirm their playing {sideSize(m)} before the toss.</p>
      <div className="flex justify-center"><XIStatus m={m} /></div>
      {can('playingxi.manage')
        ? <button onClick={() => setOpen(true)} className="btn-primary">Set Playing XI</button>
        : <p className="text-sm text-amber-300">Waiting for a team manager to confirm the XI.</p>}
      {open && <PlayingXIModal match={m} onClose={() => setOpen(false)} />}
    </div>
  );
}

'use client';
import Link from 'next/link';
import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useData, useLive, tname } from '@/lib/data';
import { fmtDate, fmtTime, toDate, toLocalInput } from '@/lib/format';
import { statusLabel } from '@/lib/match';
import { PlayerPicker } from '@/components/PlayerSearch';
import { Empty, Field, Modal, Spinner, StatusPill, TeamBadge } from '@/components/ui';

export default function TournamentsPage() {
  const tournaments = useLive(() => collection(db(), 'tournaments'), []);
  const [creating, setCreating] = useState(false);
  const [sel, setSel] = useState(null);
  if (tournaments === undefined) return <Spinner />;
  const t = (tournaments || []).find((x) => x.id === sel) || (tournaments || [])[0];
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div><h2 className="section-title">Tournaments</h2><p className="text-sm text-slate-400">Tournament setup, teams and match schedule</p></div>
        <button onClick={() => setCreating(true)} className="btn-primary">+ New tournament</button>
      </div>
      {!tournaments?.length ? <Empty>No tournaments yet.</Empty> : (
        <>
          <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
            {tournaments.map((x) => (
              <button key={x.id} onClick={() => setSel(x.id)} className={`chip whitespace-nowrap !py-1.5 ${t?.id === x.id ? '!border-gold-400 !text-gold-200' : ''}`}>{x.name}</button>
            ))}
          </div>
          {t && <TournamentDetail t={t} />}
        </>
      )}
      {creating && <TournamentForm onClose={() => setCreating(false)} />}
    </div>
  );
}

function TournamentForm({ t, onClose }) {
  const { teams } = useData();
  const [f, setF] = useState({ name: t?.name || '', overs: t?.overs || 20, teams: t?.teams || [], venue: t?.venue || '' });
  const toggle = (id) => setF({ ...f, teams: f.teams.includes(id) ? f.teams.filter((x) => x !== id) : [...f.teams, id] });
  async function save(e) {
    e.preventDefault();
    if (!f.name.trim()) return;
    const data = { name: f.name.trim(), overs: Number(f.overs) || 20, teams: f.teams, venue: f.venue.trim() };
    if (t) await updateDoc(doc(db(), 'tournaments', t.id), data);
    else await addDoc(collection(db(), 'tournaments'), { ...data, createdAt: serverTimestamp() });
    onClose();
  }
  return (
    <Modal open onClose={onClose} title={t ? 'Edit tournament' : 'New tournament'}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Tournament name" required><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Luxuria Premier League 2026" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Overs per innings" required><input type="number" min="1" max="50" className="input" value={f.overs} onChange={(e) => setF({ ...f, overs: e.target.value })} /></Field>
          <Field label="Default venue"><input className="input" value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} /></Field>
        </div>
        <Field label="Teams">
          {teams.length === 0 ? <p className="text-sm text-slate-500">Create teams first.</p> : (
            <div className="flex flex-wrap gap-2">
              {teams.map((x) => <button type="button" key={x.id} onClick={() => toggle(x.id)} className={`chip !py-1.5 ${f.teams.includes(x.id) ? '!border-gold-400 !bg-gold-400/15 !text-gold-200' : ''}`}>{f.teams.includes(x.id) ? '✓ ' : ''}{x.name}</button>)}
            </div>
          )}
        </Field>
        <button className="btn-primary w-full">Save tournament</button>
      </form>
    </Modal>
  );
}

function TournamentDetail({ t }) {
  const { teamMap } = useData();
  const matches = useLive(() => query(collection(db(), 'matches'), where('tournamentId', '==', t.id)), [t.id]);
  const [edit, setEdit] = useState(false);
  const [matchForm, setMatchForm] = useState(null);
  const sorted = [...(matches || [])].sort((a, b) => (toDate(a.date)?.getTime() || 0) - (toDate(b.date)?.getTime() || 0));
  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <div className="flex-1">
          <div className="text-lg font-semibold text-white">{t.name}</div>
          <div className="text-sm text-slate-400">{t.overs} overs · {(t.teams || []).length} teams{t.venue ? ` · ${t.venue}` : ''}</div>
          <div className="mt-2 flex flex-wrap gap-2">{(t.teams || []).map((id) => <span key={id} className="chip"><TeamBadge team={teamMap[id]} size={16} />{tname(teamMap[id])}</span>)}</div>
        </div>
        <Link href={`/tournaments/${t.id}`} className="btn-ghost btn-sm">Public page ↗</Link>
        <button onClick={() => setEdit(true)} className="btn-ghost btn-sm">Edit</button>
        <button onClick={async () => { if (confirm('Delete tournament? Matches are kept.')) await deleteDoc(doc(db(), 'tournaments', t.id)); }} className="btn-danger btn-sm">Delete</button>
      </div>
      <div className="flex items-center justify-between">
        <h3 className="section-title !text-lg">Matches</h3>
        <button disabled={(t.teams || []).length < 2} onClick={() => setMatchForm({})} className="btn-primary btn-sm">+ Add match</button>
      </div>
      {matches === undefined ? <Spinner /> : sorted.length === 0 ? <Empty>No matches scheduled.</Empty> : (
        <div className="card divide-y divide-white/[0.04]">
          {sorted.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="w-20 text-xs text-slate-400">Match {m.matchNo}</div>
              <div className="min-w-[200px] flex-1">
                <div className="font-semibold text-white">{tname(teamMap[m.teamA])} vs {tname(teamMap[m.teamB])}</div>
                <div className="text-xs text-slate-400">{fmtDate(m.date)} · {fmtTime(m.date)}{m.venue ? ` · ${m.venue}` : ''}</div>
                {m.result && <div className="text-xs text-emerald-300">{m.result}</div>}
              </div>
              <StatusPill label={statusLabel(m)} />
              <Link href={`/score/${m.id}`} className="btn-ghost btn-sm">Score</Link>
              <button onClick={() => setMatchForm(m)} className="btn-ghost btn-sm">Edit</button>
            </div>
          ))}
        </div>
      )}
      {edit && <TournamentForm t={t} onClose={() => setEdit(false)} />}
      {matchForm && <MatchForm t={t} m={matchForm.id ? matchForm : null} nextNo={sorted.length + 1} onClose={() => setMatchForm(null)} />}
    </div>
  );
}

function MatchForm({ t, m, nextNo, onClose }) {
  const { teamMap } = useData();
  const [f, setF] = useState({
    teamA: m?.teamA || '', teamB: m?.teamB || '', date: toLocalInput(m?.date) || '', venue: m?.venue ?? t.venue ?? '',
    matchNo: m?.matchNo || nextNo, status: m?.status || 'upcoming', result: m?.result || '', winner: m?.winner || '', manOfMatch: m?.manOfMatch || null,
  });
  async function save(e) {
    e.preventDefault();
    if (!f.teamA || !f.teamB || f.teamA === f.teamB || !f.date) return alert('Pick two different teams and a date.');
    const data = { tournamentId: t.id, teamA: f.teamA, teamB: f.teamB, date: Timestamp.fromDate(new Date(f.date)), venue: f.venue.trim(), matchNo: Number(f.matchNo) || nextNo, overs: t.overs || 20 };
    if (m) await updateDoc(doc(db(), 'matches', m.id), { ...data, status: f.status, result: f.result, winner: f.winner || null, manOfMatch: f.manOfMatch || null });
    else await addDoc(collection(db(), 'matches'), { ...data, status: 'upcoming', createdAt: serverTimestamp() });
    onClose();
  }
  const opts = (t.teams || []).map((id) => <option key={id} value={id}>{tname(teamMap[id])}</option>);
  return (
    <Modal open onClose={onClose} title={m ? `Edit match ${m.matchNo}` : 'Add match'}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Team A" required><select className="input" value={f.teamA} onChange={(e) => setF({ ...f, teamA: e.target.value })}><option value="">Select</option>{opts}</select></Field>
          <Field label="Team B" required><select className="input" value={f.teamB} onChange={(e) => setF({ ...f, teamB: e.target.value })}><option value="">Select</option>{opts}</select></Field>
          <Field label="Date & time" required><input type="datetime-local" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Match no."><input type="number" className="input" value={f.matchNo} onChange={(e) => setF({ ...f, matchNo: e.target.value })} /></Field>
        </div>
        <Field label="Venue"><input className="input" value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} /></Field>
        {m && (
          <>
            <Field label="Status"><select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="upcoming">Upcoming</option><option value="live">Live</option><option value="completed">Completed</option></select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Winner"><select className="input" value={f.winner} onChange={(e) => setF({ ...f, winner: e.target.value })}><option value="">No result</option><option value="tie">Tie</option><option value={f.teamA}>{tname(teamMap[f.teamA])}</option><option value={f.teamB}>{tname(teamMap[f.teamB])}</option></select></Field>
              <Field label="Result text"><input className="input" value={f.result} onChange={(e) => setF({ ...f, result: e.target.value })} /></Field>
            </div>
            <PlayerPicker label="Player of the match" value={f.manOfMatch} onChange={(v) => setF({ ...f, manOfMatch: v })}
              prefer={[...(teamMap[f.teamA]?.members || []), ...(teamMap[f.teamB]?.members || [])]} />
          </>
        )}
        <div className="flex gap-2">
          <button className="btn-primary flex-1">Save match</button>
          {m && <button type="button" onClick={async () => { if (confirm('Delete this match?')) { await deleteDoc(doc(db(), 'matches', m.id)); onClose(); } }} className="btn-danger">Delete</button>}
        </div>
      </form>
    </Modal>
  );
}

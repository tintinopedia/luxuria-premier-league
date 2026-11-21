'use client';
import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useData, pname } from '@/lib/data';
import { safeName, uploadFile } from '@/lib/media';
import { PlayerPicker } from '@/components/PlayerSearch';
import { Avatar, Empty, Field, Modal, TeamBadge } from '@/components/ui';

export default function TeamsPage() {
  const { teams, playerMap } = useData();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const team = teams.find((t) => t.id === openId);
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div><h2 className="section-title">Teams & Members</h2><p className="text-sm text-slate-400">Create teams, add players, set captain and wicket keeper</p></div>
        <button onClick={() => setCreating(true)} className="btn-primary">+ New team</button>
      </div>
      {teams.length === 0 ? <Empty>No teams yet.</Empty> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => (
            <button key={t.id} onClick={() => setOpenId(t.id)} className="card card-hover p-5 text-left">
              <div className="flex items-center gap-3">
                <TeamBadge team={t} size={48} />
                <div><div className="font-semibold text-white">{t.name}</div><div className="text-xs text-slate-400">{(t.members || []).length} players</div></div>
              </div>
              <div className="mt-4 flex -space-x-2">
                {(t.members || []).slice(0, 8).map((m) => <Avatar key={m} src={playerMap[m]?.photoURL} name={playerMap[m]?.fullName || ''} size={30} className="ring-2 ring-ink-900" />)}
              </div>
              <div className="mt-3 text-xs text-slate-400">
                {t.captain && <>C: {pname(playerMap[t.captain])}</>}{t.wicketKeeper && <> · WK: {pname(playerMap[t.wicketKeeper])}</>}
              </div>
            </button>
          ))}
        </div>
      )}
      {creating && <TeamForm onClose={() => setCreating(false)} />}
      {team && <TeamDetail team={team} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function TeamForm({ team, onClose }) {
  const [f, setF] = useState({ name: team?.name || '', shortName: team?.shortName || '', color: team?.color || '#1e40af' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    if (!f.name.trim() || !f.shortName.trim()) return;
    setBusy(true);
    let logoUrl = team?.logoUrl || '';
    if (file) logoUrl = await uploadFile(`teams/${safeName(file)}`, file);
    const data = { name: f.name.trim(), shortName: f.shortName.trim().toUpperCase().slice(0, 4), color: f.color, logoUrl };
    if (team) await updateDoc(doc(db(), 'teams', team.id), data);
    else await addDoc(collection(db(), 'teams'), { ...data, members: [], captain: null, wicketKeeper: null, createdAt: serverTimestamp() });
    setBusy(false); onClose();
  }
  return (
    <Modal open onClose={onClose} title={team ? 'Edit team' : 'New team'}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Team name" required><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Short code" required hint="2-4 letters, e.g. LUL"><input className="input uppercase" maxLength={4} value={f.shortName} onChange={(e) => setF({ ...f, shortName: e.target.value })} /></Field>
          <Field label="Team colour"><input type="color" className="input h-[42px] p-1" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} /></Field>
        </div>
        <Field label="Logo (optional)"><input type="file" accept="image/*" className="input" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field>
        <button disabled={busy} className="btn-primary w-full">{busy ? 'Saving…' : 'Save team'}</button>
      </form>
    </Modal>
  );
}

function TeamDetail({ team, onClose }) {
  const { playerMap, teams } = useData();
  const [adding, setAdding] = useState(null);
  const [edit, setEdit] = useState(false);
  const ref = doc(db(), 'teams', team.id);
  const members = team.members || [];
  const inOther = (pid) => teams.find((t) => t.id !== team.id && (t.members || []).includes(pid));

  async function add(pid) {
    if (!pid || members.includes(pid)) return;
    const other = inOther(pid);
    if (other && !confirm(`${pname(playerMap[pid])} is already in ${other.name}. Add anyway?`)) return;
    await updateDoc(ref, { members: [...members, pid] });
    setAdding(null);
  }
  async function removeMember(pid) {
    await updateDoc(ref, { members: members.filter((m) => m !== pid), ...(team.captain === pid && { captain: null }), ...(team.wicketKeeper === pid && { wicketKeeper: null }) });
  }

  return (
    <Modal open onClose={onClose} title={team.name} wide>
      {edit ? <TeamForm team={team} onClose={() => setEdit(false)} /> : null}
      <div className="flex flex-wrap items-center gap-3">
        <TeamBadge team={team} size={56} />
        <div className="flex-1"><div className="text-lg font-semibold text-white">{team.name}</div><div className="text-xs text-slate-400">{members.length} players</div></div>
        <button onClick={() => setEdit(true)} className="btn-ghost btn-sm">Edit details</button>
        <button onClick={async () => { if (confirm('Delete this team?')) { await deleteDoc(ref); onClose(); } }} className="btn-danger btn-sm">Delete team</button>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_300px]">
        <div>
          <div className="label">Squad</div>
          {members.length === 0 && <p className="text-sm text-slate-500">No players yet.</p>}
          <div className="space-y-1.5">
            {members.map((pid) => {
              const p = playerMap[pid];
              return (
                <div key={pid} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2">
                  <Avatar src={p?.photoURL} name={p?.fullName || ''} size={34} />
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">{p?.fullName || 'Unknown'}</div><div className="truncate text-xs text-slate-400">{p?.skill}</div></div>
                  <button onClick={() => updateDoc(ref, { captain: team.captain === pid ? null : pid })} className={`chip !py-0.5 ${team.captain === pid ? '!border-gold-400 !text-gold-300' : ''}`}>C</button>
                  <button onClick={() => updateDoc(ref, { wicketKeeper: team.wicketKeeper === pid ? null : pid })} className={`chip !py-0.5 ${team.wicketKeeper === pid ? '!border-sky-400 !text-sky-300' : ''}`}>WK</button>
                  <button onClick={() => removeMember(pid)} className="px-1 text-slate-500 hover:text-red-300">✕</button>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <PlayerPicker label="Add onboarded player" value={adding} onChange={(v) => { setAdding(v); add(v); }} exclude={members} />
        </div>
      </div>
    </Modal>
  );
}

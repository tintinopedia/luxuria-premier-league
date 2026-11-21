'use client';
import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useData, useLive } from '@/lib/data';
import { permsForRoles } from '@/lib/admin';
import { timeAgo } from '@/lib/format';
import { safeName, uploadFile } from '@/lib/media';
import ProfileForm from '@/components/ProfileForm';
import { Avatar, Empty, Modal, Spinner, Tabs } from '@/components/ui';

const STATUS_TONE = { pending: 'text-amber-300 bg-amber-400/10', approved: 'text-emerald-300 bg-emerald-400/10', new: 'text-sky-300 bg-sky-400/10', rejected: 'text-red-300 bg-red-400/10' };

export default function UsersPage() {
  const { can, user: me } = useAuth();
  const { players } = useData();
  const users = useLive(() => query(collection(db(), 'users'), orderBy('createdAt', 'desc')), []);
  const roles = useLive(() => collection(db(), 'roles'), []);
  const [tab, setTab] = useState('pending');
  const [review, setReview] = useState(null);
  const [creating, setCreating] = useState(false);
  if (users === undefined || roles === undefined) return <Spinner />;
  const roleMap = Object.fromEntries((roles || []).map((r) => [r.id, r]));
  const counts = (s) => (users || []).filter((u) => u.status === s).length;
  const offline = players.filter((p) => p.offline);
  const list = tab === 'offline' ? [] : (users || []).filter((u) => tab === 'all' || u.status === tab);

  async function remove(u) {
    if (!confirm(`Delete ${u.fullName || u.email}? Their player profile will also be removed. (The Google account itself must be removed from Firebase Console > Authentication.)`)) return;
    await deleteDoc(doc(db(), 'users', u.id));
    await deleteDoc(doc(db(), 'players', u.id)).catch(() => {});
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">User Management</h2>
          <p className="text-sm text-slate-400">Everyone who has signed in with Google</p>
        </div>
        {can('users.create') && <button onClick={() => setCreating(true)} className="btn-primary">+ Create player</button>}
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'pending', label: `Pending (${counts('pending')})` }, { key: 'approved', label: `Approved (${counts('approved')})` },
        { key: 'new', label: `Profile not filled (${counts('new')})` }, { key: 'rejected', label: `Rejected (${counts('rejected')})` },
        { key: 'all', label: `All (${(users || []).length})` }, { key: 'offline', label: `Created players (${offline.length})` },
      ]} />
      <div className="mt-5">
        {tab === 'offline' ? (
          offline.length === 0 ? <Empty>Players created without a login (for people not using the app) show here.</Empty> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {offline.map((p) => (
                <div key={p.id} className="card flex items-center gap-3 p-3">
                  <Avatar src={p.photoURL} name={p.fullName} size={42} />
                  <div className="min-w-0 flex-1"><div className="truncate font-semibold text-white">{p.fullName}</div><div className="truncate text-xs text-slate-400">{p.skill} · Age {p.age}</div></div>
                  {can('users.delete') && <button onClick={() => confirm('Delete player?') && deleteDoc(doc(db(), 'players', p.id))} className="text-xs text-red-300">Delete</button>}
                </div>
              ))}
            </div>
          )
        ) : list.length === 0 ? <Empty>No users here.</Empty> : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-white/[0.03]"><tr><th className="th">User</th><th className="th !text-left">Profile</th><th className="th !text-left">Status</th><th className="th !text-left">Roles</th><th className="th !text-left">Last login</th><th className="th"></th></tr></thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id} className="border-t border-white/[0.04]">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <Avatar src={u.photoURL || u.googlePhoto} name={u.fullName || u.displayName || ''} size={38} />
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-white">{u.fullName || u.displayName || '—'}{u.isSuperAdmin && <span className="ml-2 text-[10px] font-bold text-gold-400">SUPER</span>}</div>
                          <div className="truncate text-xs text-slate-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="td !text-left text-xs text-slate-300">{u.skill ? <>{u.skill}<br /><span className="text-slate-500">{[u.battingStyle, u.bowlingStyle].filter(Boolean).join(' · ')}{u.age ? ` · ${u.age} yrs` : ''}</span></> : <span className="text-slate-500">Not submitted</span>}</td>
                    <td className="td !text-left"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${STATUS_TONE[u.status] || ''}`}>{u.status}</span></td>
                    <td className="td !text-left"><div className="flex flex-wrap gap-1">{(u.roles || []).map((r) => <span key={r} className="chip !py-0.5">{roleMap[r]?.name || '?'}</span>)}</div></td>
                    <td className="td !text-left text-xs text-slate-400">{timeAgo(u.lastLoginAt)}</td>
                    <td className="td">
                      <div className="flex justify-end gap-2">
                        {can('users.approve') && !u.isSuperAdmin && u.status !== 'new' && (
                          <button onClick={() => setReview(u)} className="btn-ghost btn-sm">{u.status === 'approved' ? 'Roles' : 'Review'}</button>
                        )}
                        {can('users.delete') && !u.isSuperAdmin && u.id !== me?.uid && <button onClick={() => remove(u)} className="btn-danger btn-sm">Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {review && <ReviewModal u={review} roles={roles || []} onClose={() => setReview(null)} />}
      {creating && (
        <Modal open title="Create player (no login)" onClose={() => setCreating(false)}>
          <p className="mb-4 text-sm text-slate-400">For players who won&apos;t sign in themselves. They can be added to teams and scored like anyone else.</p>
          <ProfileForm photoRequired={false} submitLabel="Create player" onSubmit={async (data, file) => {
            let photoURL = '';
            if (file) photoURL = await uploadFile(`players/${safeName(file)}`, file);
            await addDoc(collection(db(), 'players'), { ...data, photoURL, offline: true, uid: null, createdAt: serverTimestamp() });
            setCreating(false);
          }} />
        </Modal>
      )}
    </div>
  );
}

function ReviewModal({ u, roles, onClose }) {
  const { user } = useAuth();
  const [sel, setSel] = useState(u.roles || []);
  const [busy, setBusy] = useState(false);
  const toggle = (id) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);

  async function approve() {
    setBusy(true);
    try {
      await updateDoc(doc(db(), 'users', u.id), {
        status: 'approved', roles: sel, permissions: permsForRoles(sel, roles), approvedAt: serverTimestamp(), approvedBy: user.uid,
      });
      await setDoc(doc(db(), 'players', u.id), {
        uid: u.id, fullName: u.fullName || u.displayName || '', onFieldName: u.onFieldName || '', photoURL: u.photoURL || u.googlePhoto || '',
        skill: u.skill || '', battingStyle: u.battingStyle || '', bowlingStyle: u.bowlingStyle || '', age: u.age || null, updatedAt: serverTimestamp(),
      }, { merge: true });
      onClose();
    } catch (e) { alert(e.message); }
    setBusy(false);
  }
  async function reject() {
    if (!confirm('Reject this profile? The user can edit and resubmit.')) return;
    await updateDoc(doc(db(), 'users', u.id), { status: 'rejected', roles: [], permissions: [] });
    onClose();
  }

  return (
    <Modal open onClose={onClose} title={u.status === 'approved' ? 'Update roles' : 'Review & approve'}>
      <div className="flex items-center gap-4">
        <Avatar src={u.photoURL || u.googlePhoto} name={u.fullName || ''} size={72} ring />
        <div>
          <div className="text-lg font-semibold text-white">{u.fullName}</div>
          {u.onFieldName && <div className="text-sm text-gold-300">“{u.onFieldName}”</div>}
          <div className="text-xs text-slate-400">{u.email}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {[['Skill', u.skill], ['Age', u.age], ['Batting', u.battingStyle || '—'], ['Bowling', u.bowlingStyle || '—']].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white/[0.03] p-2.5"><div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div><div className="text-white">{v}</div></div>
        ))}
      </div>
      <div className="mt-5">
        <span className="label">Assign roles (at least one)</span>
        {roles.length === 0 ? <p className="text-sm text-amber-300">No roles exist yet. Create roles in the Roles tab first.</p> : (
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <button key={r.id} onClick={() => toggle(r.id)} className={`chip !py-1.5 ${sel.includes(r.id) ? '!border-gold-400 !bg-gold-400/15 !text-gold-200' : ''}`}>
                {sel.includes(r.id) ? '✓ ' : ''}{r.name}{r.permissionsActive === false ? ' (inactive)' : ''}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-6 flex gap-2">
        <button disabled={!sel.length || busy} onClick={approve} className="btn-primary flex-1">{u.status === 'approved' ? 'Save roles' : 'Approve user'}</button>
        {u.status !== 'rejected' && u.status !== 'approved' && <button onClick={reject} className="btn-danger">Reject</button>}
      </div>
    </Modal>
  );
}

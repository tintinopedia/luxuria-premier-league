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
import { Avatar, Empty, Field, Modal, Spinner, Tabs } from '@/components/ui';

const STATUS_TONE = { pending: 'text-amber-300 bg-amber-400/10', approved: 'text-emerald-300 bg-emerald-400/10', rejected: 'text-red-300 bg-red-400/10' };
const PROFILE_KEYS = ['fullName', 'onFieldName', 'photoURL', 'skill', 'battingStyle', 'bowlingStyle', 'age'];
const pick = (o = {}) => Object.fromEntries(PROFILE_KEYS.map((k) => [k, o[k] ?? '']));

export default function UsersPage() {
  const { can, canAny, user: me } = useAuth();
  const { players } = useData();
  // Users who signed in but never submitted the mandatory profile are not shown: they aren't real sign-ups yet
  const users = useLive(() => query(collection(db(), 'users'), orderBy('createdAt', 'desc')), []);
  const roles = useLive(() => collection(db(), 'roles'), []);
  const invites = useLive(() => (canAny(['users.create', 'users.delete', 'users.edit']) ? collection(db(), 'invites') : null), []);
  const [tab, setTab] = useState('pending');
  const [review, setReview] = useState(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  if (users === undefined || roles === undefined) return <Spinner />;

  const roleMap = Object.fromEntries((roles || []).map((r) => [r.id, r]));
  const real = (users || []).filter((u) => u.status !== 'new');
  const count = (s) => real.filter((u) => u.status === s).length;
  const inviteByPlayer = Object.fromEntries((invites || []).map((i) => [i.playerId, i]));
  const created = players.filter((p) => p.createdByAdmin || p.offline);
  const list = tab === 'all' ? real : real.filter((u) => u.status === tab);

  async function removeUser(u) {
    if (!confirm(`Delete ${u.fullName || u.email}? Their player profile is removed too. (Remove the Google login itself in Firebase Console > Authentication.)`)) return;
    await deleteDoc(doc(db(), 'users', u.id));
    await deleteDoc(doc(db(), 'players', u.playerId || u.id)).catch(() => {});
  }
  async function removeCreated(p) {
    if (!confirm(`Delete ${p.fullName}?`)) return;
    const inv = inviteByPlayer[p.id];
    if (inv) await deleteDoc(doc(db(), 'invites', inv.id));
    await deleteDoc(doc(db(), 'players', p.id));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">User Management</h2>
          <p className="text-sm text-slate-400">Google sign-ups awaiting approval, approved members and users created by admins</p>
        </div>
        {can('users.create') && <button onClick={() => setCreating(true)} className="btn-primary">+ Create user</button>}
      </div>
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'pending', label: `Pending (${count('pending')})` },
        { key: 'approved', label: `Approved (${count('approved')})` },
        { key: 'rejected', label: `Rejected (${count('rejected')})` },
        { key: 'all', label: `All (${real.length})` },
        { key: 'created', label: `Created by admin (${created.length})` },
      ]} />

      <div className="mt-5">
        {tab === 'created' ? (
          created.length === 0 ? <Empty>Users you create manually appear here until (and after) they first sign in.</Empty> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {created.map((p) => {
                const inv = inviteByPlayer[p.id];
                const state = p.uid ? ['Signed in', 'text-emerald-300'] : inv ? [`Awaiting first sign-in · ${inv.email}`, 'text-amber-300'] : ['No login (scoring only)', 'text-slate-400'];
                return (
                  <div key={p.id} className="card flex items-center gap-3 p-3">
                    <Avatar src={p.photoURL} name={p.fullName} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-white">{p.fullName}</div>
                      <div className="truncate text-xs text-slate-400">{p.skill} · Age {p.age}</div>
                      <div className={`truncate text-[11px] ${state[1]}`}>{state[0]}</div>
                      {inv && <div className="mt-1 flex flex-wrap gap-1">{(inv.roles || []).map((r) => <span key={r} className="chip !py-0 !text-[10px]">{roleMap[r]?.name || '?'}</span>)}</div>}
                    </div>
                    <div className="flex flex-col gap-1">
                      {can('users.edit') && <button onClick={() => setEditing({ player: p })} className="btn-ghost btn-sm">Edit</button>}
                      {canAny(['users.delete', 'users.create']) && !p.uid && <button onClick={() => removeCreated(p)} className="btn-danger btn-sm">Delete</button>}
                    </div>
                  </div>
                );
              })}
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
                    <td className="td !text-left text-xs text-slate-300">{u.skill}<br /><span className="text-slate-500">{[u.battingStyle, u.bowlingStyle].filter(Boolean).join(' · ')}{u.age ? ` · ${u.age} yrs` : ''}</span></td>
                    <td className="td !text-left"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${STATUS_TONE[u.status] || ''}`}>{u.status}</span></td>
                    <td className="td !text-left"><div className="flex flex-wrap gap-1">{(u.roles || []).map((r) => <span key={r} className="chip !py-0.5">{roleMap[r]?.name || '?'}</span>)}</div></td>
                    <td className="td !text-left text-xs text-slate-400">{timeAgo(u.lastLoginAt)}</td>
                    <td className="td">
                      <div className="flex justify-end gap-2">
                        {can('users.approve') && !u.isSuperAdmin && <button onClick={() => setReview(u)} className="btn-ghost btn-sm">{u.status === 'approved' ? 'Roles' : 'Review'}</button>}
                        {can('users.edit') && u.status === 'approved' && !u.isSuperAdmin && <button onClick={() => setEditing({ user: u })} className="btn-ghost btn-sm">Edit</button>}
                        {can('users.delete') && !u.isSuperAdmin && u.id !== me?.uid && <button onClick={() => removeUser(u)} className="btn-danger btn-sm">Delete</button>}
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
      {creating && <CreateUserModal roles={roles || []} users={users || []} invites={invites || []} onClose={() => setCreating(false)} />}
      {editing && <EditProfileModal {...editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function RoleChips({ roles, sel, setSel }) {
  if (!roles.length) return <p className="text-sm text-amber-300">No roles exist yet. Create roles in the Roles tab first.</p>;
  const toggle = (id) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((r) => (
        <button type="button" key={r.id} onClick={() => toggle(r.id)} className={`chip !py-1.5 ${sel.includes(r.id) ? '!border-gold-400 !bg-gold-400/15 !text-gold-200' : ''}`}>
          {sel.includes(r.id) ? '✓ ' : ''}{r.name}{r.permissionsActive === false ? ' (inactive)' : ''}
        </button>
      ))}
    </div>
  );
}

function CreateUserModal({ roles, users, invites, onClose }) {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [sel, setSel] = useState([]);
  const [noLogin, setNoLogin] = useState(false);

  async function create(data, file) {
    const em = email.trim().toLowerCase();
    if (!noLogin) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) throw new Error('Enter the Google email this person will sign in with, or tick "No login".');
      if (!sel.length) throw new Error('Assign at least one role.');
      if (users.some((u) => (u.email || '').toLowerCase() === em)) throw new Error('This email has already signed in. Approve or edit them from the Pending / Approved tabs.');
      if (invites.some((i) => i.id === em)) throw new Error('A user with this email has already been created.');
    }
    let photoURL = '';
    if (file) photoURL = await uploadFile(`players/${safeName(file)}`, file);
    const profile = { ...data, photoURL };
    const ref = await addDoc(collection(db(), 'players'), {
      ...profile, uid: null, offline: noLogin, createdByAdmin: true, createdBy: user.uid, createdAt: serverTimestamp(),
    });
    if (!noLogin) {
      await setDoc(doc(db(), 'invites', em), {
        email: em, playerId: ref.id, roles: sel, permissions: permsForRoles(sel, roles), profile,
        createdBy: user.uid, createdAt: serverTimestamp(),
      });
    }
    onClose();
  }

  return (
    <Modal open title="Create user" onClose={onClose}>
      <div className="mb-5 space-y-4 rounded-2xl border border-white/[0.06] p-4">
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={noLogin} onChange={(e) => setNoLogin(e.target.checked)} className="h-4 w-4 accent-amber-400" />
          <span className="text-slate-200">No login: player won&apos;t use the app (scoring and teams only)</span>
        </label>
        {!noLogin && (
          <>
            <Field label="Google email" required hint="When they first sign in with this email they go straight in, already approved, no profile form.">
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" />
            </Field>
            <div><span className="label">Roles <span className="text-gold-400">*</span></span><RoleChips roles={roles} sel={sel} setSel={setSel} /></div>
          </>
        )}
      </div>
      <ProfileForm photoRequired={false} submitLabel="Create user" onSubmit={create} />
    </Modal>
  );
}

function EditProfileModal({ user: u, player, onClose }) {
  const { playerMap } = useData();
  const pid = u ? u.playerId || u.id : player.id;
  const current = u ? { ...pick(playerMap[pid]), ...pick(u) } : pick(player);
  async function save(data, file) {
    let photoURL = data.photoURL;
    if (file) photoURL = await uploadFile(`players/${safeName(file)}`, file);
    const patch = { ...data, photoURL, updatedAt: serverTimestamp() };
    if (u) await updateDoc(doc(db(), 'users', u.id), patch);
    await setDoc(doc(db(), 'players', pid), patch, { merge: true });
    onClose();
  }
  return (
    <Modal open title={`Edit ${current.fullName || 'user'}`} onClose={onClose}>
      <ProfileForm initial={current} photoRequired={false} submitLabel="Save changes" onSubmit={save} />
    </Modal>
  );
}

function ReviewModal({ u, roles, onClose }) {
  const { user } = useAuth();
  const [sel, setSel] = useState(u.roles || []);
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    try {
      await updateDoc(doc(db(), 'users', u.id), {
        status: 'approved', roles: sel, permissions: permsForRoles(sel, roles), approvedAt: serverTimestamp(), approvedBy: user.uid,
      });
      await setDoc(doc(db(), 'players', u.playerId || u.id), {
        uid: u.id, ...pick(u), photoURL: u.photoURL || u.googlePhoto || '', age: u.age || null, updatedAt: serverTimestamp(),
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
      <div className="mt-5"><span className="label">Assign roles (at least one)</span><RoleChips roles={roles} sel={sel} setSel={setSel} /></div>
      <div className="mt-6 flex gap-2">
        <button disabled={!sel.length || busy} onClick={approve} className="btn-primary flex-1">{u.status === 'approved' ? 'Save roles' : 'Approve user'}</button>
        {u.status === 'pending' && <button onClick={reject} className="btn-danger">Reject</button>}
      </div>
    </Modal>
  );
}

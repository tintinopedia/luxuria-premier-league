'use client';
import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useLive } from '@/lib/data';
import { recomputeUsersWithRole } from '@/lib/admin';
import { Empty, Field, Spinner } from '@/components/ui';

export default function RolesPage() {
  const { can } = useAuth();
  const roles = useLive(() => collection(db(), 'roles'), []);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [editing, setEditing] = useState(null);
  if (roles === undefined) return <Spinner />;
  const list = [...(roles || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  async function add(e) {
    e.preventDefault();
    if (!name.trim()) return;
    if (list.some((r) => r.name.toLowerCase() === name.trim().toLowerCase())) return alert('A role with this name already exists.');
    await addDoc(collection(db(), 'roles'), { name: name.trim(), description: desc.trim(), permissions: [], permissionsActive: true, createdAt: serverTimestamp() });
    setName(''); setDesc('');
  }
  async function remove(r) {
    if (!confirm(`Delete role "${r.name}"? It will be removed from every user who has it.`)) return;
    await recomputeUsersWithRole(r.id, { removeRole: true });
    await deleteDoc(doc(db(), 'roles', r.id));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {can('roles.add') && (
        <form onSubmit={add} className="card h-fit space-y-4 p-5">
          <h2 className="section-title !text-lg">Add role</h2>
          <Field label="Role name" required><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Scorer" /></Field>
          <Field label="Role description"><textarea rows={3} className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What this role is for" /></Field>
          <button className="btn-primary w-full">Add role</button>
        </form>
      )}
      <div className="space-y-3">
        {list.length === 0 && <Empty>No roles yet. Start with roles like Player, Scorer, Media and Admin.</Empty>}
        {list.map((r) => (
          <div key={r.id} className="card p-4">
            {editing?.id === r.id ? (
              <div className="space-y-3">
                <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                <textarea rows={2} className="input" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                <div className="flex gap-2">
                  <button onClick={async () => { await updateDoc(doc(db(), 'roles', r.id), { name: editing.name.trim(), description: editing.description.trim() }); setEditing(null); }} className="btn-primary btn-sm">Save</button>
                  <button onClick={() => setEditing(null)} className="btn-ghost btn-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{r.name}</span>
                    <span className="chip !py-0.5">{(r.permissions || []).length} permissions</span>
                    {r.permissionsActive === false && <span className="chip !py-0.5 !text-amber-300">inactive</span>}
                  </div>
                  {r.description && <p className="mt-1 text-sm text-slate-400">{r.description}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  {can('roles.edit') && <button onClick={() => setEditing({ id: r.id, name: r.name, description: r.description || '' })} className="btn-ghost btn-sm">Edit</button>}
                  {can('roles.delete') && <button onClick={() => remove(r)} className="btn-danger btn-sm">Delete</button>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

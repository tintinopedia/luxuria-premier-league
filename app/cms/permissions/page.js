'use client';
import { useEffect, useState } from 'react';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useLive } from '@/lib/data';
import { recomputeUsersWithRole } from '@/lib/admin';
import { PERMISSIONS } from '@/lib/constants';
import { Empty, Spinner } from '@/components/ui';

const GROUPS = [...new Set(PERMISSIONS.map((p) => p.group))];

export default function RolePermissionsPage() {
  const { can } = useAuth();
  const roles = useLive(() => collection(db(), 'roles'), []);
  const [roleId, setRoleId] = useState(null);
  const [sel, setSel] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const role = (roles || []).find((r) => r.id === roleId);
  useEffect(() => { setSel(role?.permissions || []); setMsg(''); }, [roleId, role?.permissions]);
  useEffect(() => { if (!roleId && roles?.length) setRoleId(roles[0].id); }, [roles, roleId]);

  if (roles === undefined) return <Spinner />;
  if (!roles?.length) return <Empty>Create a role in the Roles tab first.</Empty>;

  const hasAny = (role?.permissions || []).length > 0;
  const canSave = hasAny ? can('perms.edit') : can('perms.add');
  const toggle = (k) => setSel(sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k]);

  async function apply(patch, note) {
    setBusy(true);
    try {
      await updateDoc(doc(db(), 'roles', roleId), patch);
      const n = await recomputeUsersWithRole(roleId);
      setMsg(`${note} · ${n} user${n === 1 ? '' : 's'} updated`);
    } catch (e) { alert(e.message); }
    setBusy(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      <div className="card h-fit p-2">
        {roles.map((r) => (
          <button key={r.id} onClick={() => setRoleId(r.id)}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${roleId === r.id ? 'bg-gold-400/15 text-gold-200' : 'text-slate-300 hover:bg-white/5'}`}>
            <span>{r.name}</span>
            <span className="text-xs text-slate-500">{(r.permissions || []).length}{r.permissionsActive === false ? ' · off' : ''}</span>
          </button>
        ))}
      </div>
      {role && (
        <div className="card p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="section-title !text-lg">{role.name}</h2>
              <p className="text-sm text-slate-400">{role.permissionsActive === false ? 'Permissions are deactivated for this role' : 'Tick what this role can do'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {can('perms.deactivate') && (
                <button disabled={busy} onClick={() => apply({ permissionsActive: role.permissionsActive === false }, role.permissionsActive === false ? 'Activated' : 'Deactivated')} className="btn-ghost btn-sm">
                  {role.permissionsActive === false ? 'Activate' : 'Deactivate'}
                </button>
              )}
              {can('perms.delete') && hasAny && (
                <button disabled={busy} onClick={() => confirm('Remove all permissions from this role?') && apply({ permissions: [] }, 'Permissions removed')} className="btn-danger btn-sm">Delete all</button>
              )}
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {GROUPS.map((g) => (
              <div key={g} className="rounded-2xl border border-white/[0.06] p-4">
                <div className="label">{g}</div>
                <div className="space-y-1">
                  {PERMISSIONS.filter((p) => p.group === g).map((p) => {
                    const on = sel.includes(p.key);
                    const removing = !on && (role.permissions || []).includes(p.key);
                    const locked = removing ? !can('perms.delete') && !can('perms.edit') : !canSave;
                    return (
                      <label key={p.key} className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5 ${locked ? 'opacity-60' : ''}`}>
                        <input type="checkbox" className="h-4 w-4 accent-amber-400" checked={on} disabled={!canSave} onChange={() => toggle(p.key)} />
                        <span className="text-sm text-slate-200">{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-4">
            <button disabled={busy || !canSave} onClick={() => apply({ permissions: sel }, 'Saved')} className="btn-primary">{hasAny ? 'Save changes' : 'Add permissions'}</button>
            {msg && <span className="text-sm text-emerald-300">{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

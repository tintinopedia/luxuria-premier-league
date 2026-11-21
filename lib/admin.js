import { collection, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

// Union of permissions across a user's active roles
export function permsForRoles(roleIds = [], roles = []) {
  const set = new Set();
  for (const r of roles) {
    if (roleIds.includes(r.id) && r.permissionsActive !== false) (r.permissions || []).forEach((p) => set.add(p));
  }
  return [...set];
}

export async function allRoles() {
  const s = await getDocs(collection(db(), 'roles'));
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// After a role or its permissions change, refresh the denormalised `permissions` on every user holding it
export async function recomputeUsersWithRole(roleId, { removeRole = false } = {}) {
  const roles = await allRoles();
  const s = await getDocs(query(collection(db(), 'users'), where('roles', 'array-contains', roleId)));
  const batch = writeBatch(db());
  s.docs.forEach((d) => {
    const u = d.data();
    const ids = removeRole ? (u.roles || []).filter((r) => r !== roleId) : u.roles || [];
    batch.update(d.ref, { roles: ids, permissions: permsForRoles(ids, roles.filter((r) => r.id !== (removeRole ? roleId : null))) });
  });
  await batch.commit();
  return s.size;
}

export async function setUserRoles(uid, roleIds) {
  const roles = await allRoles();
  await updateDoc(doc(db(), 'users', uid), { roles: roleIds, permissions: permsForRoles(roleIds, roles) });
}

'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider, SUPERADMIN_EMAIL } from './firebase';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile = () => {};
    const unsub = onAuthStateChanged(auth(), async (u) => {
      unsubProfile();
      setUser(u);
      if (!u) { setProfile(null); setLoading(false); return; }
      setLoading(true);
      const ref = doc(db(), 'users', u.uid);
      const isSuper = (u.email || '').toLowerCase() === SUPERADMIN_EMAIL;
      try {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          const base = {
            uid: u.uid, email: u.email, displayName: u.displayName || '', googlePhoto: u.photoURL || '',
            isSuperAdmin: isSuper, createdAt: serverTimestamp(), lastLoginAt: serverTimestamp(),
          };
          // Was this person pre-created by an admin? Then they skip onboarding and approval.
          let invite = null;
          if (!isSuper) {
            try {
              const inv = await getDoc(doc(db(), 'invites', (u.email || '').toLowerCase()));
              if (inv.exists()) invite = inv.data();
            } catch (e) { console.warn('invite lookup failed', e); }
          }
          if (invite) {
            const p = invite.profile || {};
            await setDoc(ref, {
              ...base, ...p, status: 'approved', roles: invite.roles || [], permissions: invite.permissions || [],
              playerId: invite.playerId, approvedAt: serverTimestamp(), approvedBy: invite.createdBy || null,
            });
            await updateDoc(doc(db(), 'players', invite.playerId), { uid: u.uid, offline: false }).catch(console.warn);
            await deleteDoc(doc(db(), 'invites', (u.email || '').toLowerCase())).catch(console.warn);
          } else {
            await setDoc(ref, { ...base, status: isSuper ? 'approved' : 'new', roles: [], permissions: [] });
          }
        } else {
          await updateDoc(ref, { lastLoginAt: serverTimestamp() });
        }
      } catch (e) { console.error('profile bootstrap failed', e); }
      unsubProfile = onSnapshot(ref,
        (s) => { setProfile(s.exists() ? { id: s.id, ...s.data() } : null); setLoading(false); },
        () => setLoading(false));
    });
    return () => { unsub(); unsubProfile(); };
  }, []);

  const isSuper = !!user && (user.email || '').toLowerCase() === SUPERADMIN_EMAIL;
  const can = useCallback(
    (p) => isSuper || (profile?.status === 'approved' && (profile.permissions || []).includes(p)),
    [isSuper, profile]
  );
  const canAny = useCallback((ps) => ps.some(can), [can]);
  const signIn = () => signInWithPopup(auth(), googleProvider()).catch((e) => {
    if (e.code !== 'auth/popup-closed-by-user') alert(e.message);
  });
  const signOut = () => fbSignOut(auth());
  // Player profile id: the user's uid, or the record an admin created for them
  const playerId = profile?.playerId || user?.uid || null;

  return (
    <AuthCtx.Provider value={{ user, profile, loading, isSuper, can, canAny, signIn, signOut, playerId }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

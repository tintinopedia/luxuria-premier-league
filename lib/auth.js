'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
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
          await setDoc(ref, {
            uid: u.uid, email: u.email, displayName: u.displayName || '', googlePhoto: u.photoURL || '',
            status: isSuper ? 'approved' : 'new', isSuperAdmin: isSuper, roles: [], permissions: [],
            createdAt: serverTimestamp(), lastLoginAt: serverTimestamp(),
          });
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

  return (
    <AuthCtx.Provider value={{ user, profile, loading, isSuper, can, canAny, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);

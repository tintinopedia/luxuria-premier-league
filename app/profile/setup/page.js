'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { uploadFile } from '@/lib/media';
import { Spinner } from '@/components/ui';
import ProfileForm from '@/components/ProfileForm';
import { GoogleIcon } from '@/components/Header';

export default function ProfileSetup() {
  const { user, profile, loading, isSuper, signIn, playerId } = useAuth();
  const router = useRouter();
  const [done, setDone] = useState(false);
  useEffect(() => { if (done && profile?.status === 'pending') router.replace('/pending'); }, [done, profile, router]);

  if (loading) return <Spinner />;
  if (!user) return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="section-title">Create your player profile</h1>
      <p className="mt-2 text-sm text-slate-400">Sign up with Google to get started.</p>
      <button onClick={signIn} className="btn-primary mt-6"><GoogleIcon /> Sign up with Google</button>
    </div>
  );
  if (!profile) return <Spinner />;
  const approved = isSuper || profile.status === 'approved';

  async function save(data, file) {
    let photoURL = data.photoURL;
    if (file) photoURL = await uploadFile(`avatars/${user.uid}/profile-${Date.now()}`, file);
    const payload = { ...data, photoURL, updatedAt: serverTimestamp() };
    if (!approved) { payload.status = 'pending'; payload.submittedAt = serverTimestamp(); }
    await updateDoc(doc(db(), 'users', user.uid), payload);
    if (approved) {
      await setDoc(doc(db(), 'players', playerId), { uid: user.uid, ...data, photoURL, updatedAt: serverTimestamp() }, { merge: true });
      router.push(`/players/${playerId}`);
    } else setDone(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-gold-400">{approved ? 'Your profile' : 'Step 1 of 2'}</div>
        <h1 className="font-display text-3xl font-semibold text-white">{approved ? 'Edit player profile' : 'Complete your player profile'}</h1>
        {!approved && <p className="mt-1 text-sm text-slate-400">The league administrator reviews every profile before it goes live.</p>}
        {profile.status === 'rejected' && <p className="mt-3 rounded-xl bg-live/10 px-3 py-2 text-sm text-red-300">Your previous submission was not approved. Please review your details and resubmit.</p>}
      </div>
      <div className="card p-6">
        <ProfileForm
          initial={{ fullName: profile.fullName || profile.displayName || '', onFieldName: profile.onFieldName || '', skill: profile.skill || '',
            battingStyle: profile.battingStyle || '', bowlingStyle: profile.bowlingStyle || '', age: profile.age || '', photoURL: profile.photoURL || '' }}
          submitLabel={approved ? 'Save profile' : 'Submit for approval'}
          onSubmit={save} />
      </div>
    </div>
  );
}

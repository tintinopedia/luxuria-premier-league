'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Avatar, Spinner } from '@/components/ui';

export default function Pending() {
  const { user, profile, loading, signOut } = useAuth();
  if (loading) return <Spinner />;
  if (!user || !profile) return <div className="p-10 text-center text-slate-400"><Link href="/" className="text-gold-300">Go home</Link></div>;
  const approved = profile.status === 'approved';
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="card p-8 text-center">
        <Avatar src={profile.photoURL} name={profile.fullName || ''} size={88} className="mx-auto" ring />
        <h1 className="mt-5 font-display text-2xl font-semibold text-white">{approved ? "You're in!" : 'Pending approval'}</h1>
        {approved ? (
          <>
            <p className="mt-2 text-sm text-slate-400">Your profile has been approved.</p>
            <Link href="/" className="btn-primary mt-6">Go to home</Link>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-400">
              Thanks, {profile.fullName?.split(' ')[0] || 'player'}. Your profile has been sent to the Administrator for approval.
              Please check back after 24 hours and sign in again.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/profile/setup" className="btn-ghost">Edit details</Link>
              <button onClick={signOut} className="btn-primary">Sign out</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

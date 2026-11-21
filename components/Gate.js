'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

// Routes new users to profile setup and pending users to the waiting screen
export default function Gate({ children }) {
  const { user, profile, loading, isSuper } = useAuth();
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (loading || !user || !profile || isSuper) return;
    if (['new', 'rejected'].includes(profile.status) && path !== '/profile/setup') router.replace('/profile/setup');
    else if (profile.status === 'pending' && !['/pending', '/profile/setup'].includes(path)) router.replace('/pending');
  }, [loading, user, profile, isSuper, path, router]);
  return children;
}

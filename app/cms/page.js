'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { CMS_TABS } from '@/lib/constants';
import { Spinner } from '@/components/ui';

export default function CmsIndex() {
  const { isSuper, canAny, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    const first = CMS_TABS.find((t) => isSuper || canAny(t.perms));
    if (first) router.replace(first.href);
  }, [loading, isSuper, canAny, router]);
  return <Spinner />;
}

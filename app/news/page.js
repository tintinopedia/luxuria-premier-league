'use client';
import { useState } from 'react';
import { collection, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLive } from '@/lib/data';
import { NewsList } from '@/components/Media';
import { PageShell, Spinner, Tabs } from '@/components/ui';

export default function NewsPage() {
  const [tab, setTab] = useState('all');
  const news = useLive(() => query(collection(db(), 'news'), orderBy('createdAt', 'desc')), []);
  const items = (news || []).filter((n) => tab === 'all' || (tab === 'blog' ? n.kind === 'blog' : n.kind !== 'blog'));
  return (
    <PageShell title="News & Blogs" subtitle="Latest first">
      <div className="mb-5"><Tabs tabs={[{ key: 'all', label: 'All' }, { key: 'news', label: 'News' }, { key: 'blog', label: 'Blogs' }]} active={tab} onChange={setTab} /></div>
      {news === undefined ? <Spinner /> : <NewsList items={items} />}
    </PageShell>
  );
}

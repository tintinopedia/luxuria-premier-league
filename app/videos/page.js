'use client';
import { collection, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLive } from '@/lib/data';
import { VideoGrid } from '@/components/Media';
import { PageShell, Spinner } from '@/components/ui';

export default function VideosPage() {
  const videos = useLive(() => query(collection(db(), 'videos'), orderBy('createdAt', 'desc')), []);
  return (
    <PageShell title="Videos" subtitle="Every video from across the league">
      {videos === undefined ? <Spinner /> : <VideoGrid videos={videos || []} />}
    </PageShell>
  );
}

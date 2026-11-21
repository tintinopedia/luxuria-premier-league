'use client';
import { collection, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLive } from '@/lib/data';
import { PhotoGrid } from '@/components/Media';
import { PageShell, Spinner } from '@/components/ui';

export default function PhotosPage() {
  const photos = useLive(() => query(collection(db(), 'photos'), orderBy('createdAt', 'desc')), []);
  return (
    <PageShell title="Photos" subtitle="Every photo from across the league">
      {photos === undefined ? <Spinner /> : <PhotoGrid photos={photos || []} />}
    </PageShell>
  );
}

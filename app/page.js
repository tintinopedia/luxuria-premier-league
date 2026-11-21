'use client';
import Link from 'next/link';
import { useState } from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useLive } from '@/lib/data';
import { pickFeatured } from '@/lib/match';
import FixturesStrip from '@/components/FixturesStrip';
import MatchHero from '@/components/MatchHero';
import { Carousel, Lightbox, NewsList, PhotoTile, VideoPlayerModal, VideoTile } from '@/components/Media';
import { Empty, SectionHeader, Spinner } from '@/components/ui';
import { GoogleIcon } from '@/components/Header';

export default function Home() {
  const { user, signIn, loading } = useAuth();
  const matches = useLive(() => query(collection(db(), 'matches'), orderBy('date', 'asc')), []);
  const tournaments = useLive(() => collection(db(), 'tournaments'), []);
  const videos = useLive(() => query(collection(db(), 'videos'), orderBy('createdAt', 'desc'), limit(20)), []);
  const photos = useLive(() => query(collection(db(), 'photos'), orderBy('createdAt', 'desc'), limit(20)), []);
  const news = useLive(() => query(collection(db(), 'news'), orderBy('createdAt', 'desc'), limit(10)), []);
  const featured = pickFeatured(matches || []);
  const balls = useLive(
    () => (featured ? query(collection(db(), 'matches', featured.id, 'balls'), orderBy('seq')) : null),
    [featured?.id]
  );
  const [play, setPlay] = useState(null);
  const [photoIdx, setPhotoIdx] = useState(null);
  const tournament = (tournaments || []).find((t) => t.id === featured?.tournamentId);

  return (
    <>
      <FixturesStrip matches={matches || []} tournaments={tournaments || []} />
      <div className="mx-auto max-w-7xl space-y-14 px-4 py-8 sm:px-6">
        {!loading && !user && (
          <div className="card flex flex-col items-start justify-between gap-4 bg-gradient-to-r from-gold-400/10 to-transparent p-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <img src="/icons/icon-192.png" alt="" className="h-16 w-16 rounded-full ring-1 ring-gold-400/40" />
              <div>
              <div className="font-display text-xl font-semibold uppercase tracking-wide text-white">Playing in the league?</div>
              <p className="text-sm text-slate-400">Sign up with Google to create your player profile and track your stats.</p>
              </div>
            </div>
            <button onClick={signIn} className="btn-primary"><GoogleIcon /> Sign up with Google</button>
          </div>
        )}

        <section>
          {matches === undefined ? <Spinner /> : featured
            ? <MatchHero match={featured} balls={balls || []} tournament={tournament} showKnowMore />
            : <Empty>No matches scheduled yet.</Empty>}
        </section>

        <section>
          <SectionHeader title="Videos" subtitle="Highlights, interviews and moments" action={<Link href="/videos" className="text-sm font-semibold text-gold-300 hover:text-gold-200">All videos →</Link>} />
          {videos === undefined ? <Spinner /> : (
            <Carousel items={videos || []} viewAllHref="/videos" viewAllLabel="View all videos" emptyText="Videos will appear here."
              render={(v, masked) => <VideoTile v={v} masked={masked} onPlay={setPlay} />} />
          )}
        </section>

        <section>
          <SectionHeader title="Photos" subtitle="From the stands and the middle" action={<Link href="/photos" className="text-sm font-semibold text-gold-300 hover:text-gold-200">All photos →</Link>} />
          {photos === undefined ? <Spinner /> : (
            <Carousel items={photos || []} viewAllHref="/photos" viewAllLabel="View all photos" emptyText="Photos will appear here."
              render={(p, masked) => <PhotoTile p={p} masked={masked} onOpen={() => setPhotoIdx((photos || []).indexOf(p))} />} />
          )}
        </section>

        <section>
          <SectionHeader title="Latest News" />
          {news === undefined ? <Spinner /> : <NewsList items={news || []} />}
          {(news || []).length > 0 && (
            <div className="mt-5 text-center"><Link href="/news" className="btn-ghost">More news</Link></div>
          )}
        </section>
      </div>
      <VideoPlayerModal video={play} onClose={() => setPlay(null)} />
      <Lightbox photos={photos || []} index={photoIdx} onClose={() => setPhotoIdx(null)} onIndex={setPhotoIdx} />
    </>
  );
}

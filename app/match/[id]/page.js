'use client';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { collection, doc, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLive } from '@/lib/data';
import { toDate } from '@/lib/format';
import MatchHero from '@/components/MatchHero';
import { Commentary, Scorecard } from '@/components/Scorecard';
import { NewsList, PhotoGrid, VideoGrid } from '@/components/Media';
import { Empty, Spinner, Tabs } from '@/components/ui';

const TABS = ['Scorecard', 'Commentary', 'News', 'Videos', 'Photos'];
const newest = (arr) => [...(arr || [])].sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0));

export default function MatchPage() {
  const { id } = useParams();
  const [tab, setTab] = useState('Scorecard');
  const match = useLive(() => doc(db(), 'matches', id), [id]);
  const balls = useLive(() => query(collection(db(), 'matches', id, 'balls'), orderBy('seq')), [id]);
  const tournament = useLive(() => (match?.tournamentId ? doc(db(), 'tournaments', match.tournamentId) : null), [match?.tournamentId]);
  const news = useLive(() => (tab === 'News' ? query(collection(db(), 'news'), where('matchId', '==', id)) : null), [tab, id]);
  const videos = useLive(() => (tab === 'Videos' ? query(collection(db(), 'videos'), where('matchId', '==', id)) : null), [tab, id]);
  const photos = useLive(() => (tab === 'Photos' ? query(collection(db(), 'photos'), where('matchId', '==', id)) : null), [tab, id]);

  if (match === undefined) return <Spinner />;
  if (!match) return <div className="mx-auto max-w-3xl p-8"><Empty>Match not found.</Empty></div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <MatchHero match={match} balls={balls || []} tournament={tournament} />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <div>
        {tab === 'Scorecard' && (balls === undefined ? <Spinner /> : <Scorecard match={match} balls={balls || []} />)}
        {tab === 'Commentary' && (balls === undefined ? <Spinner /> : <Commentary match={match} balls={balls || []} />)}
        {tab === 'News' && (news === undefined ? <Spinner /> : <NewsList items={newest(news)} />)}
        {tab === 'Videos' && (videos === undefined ? <Spinner /> : <VideoGrid videos={newest(videos)} />)}
        {tab === 'Photos' && (photos === undefined ? <Spinner /> : <PhotoGrid photos={newest(photos)} />)}
      </div>
    </div>
  );
}

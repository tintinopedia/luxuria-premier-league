'use client';
import Link from 'next/link';
import { collection, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useData, useLive } from '@/lib/data';
import Schedule from '@/components/Schedule';
import { PageShell, Spinner } from '@/components/ui';

export default function SchedulePage() {
  const { teamMap } = useData();
  const matches = useLive(() => query(collection(db(), 'matches'), orderBy('date', 'asc')), []);
  const tournaments = useLive(() => collection(db(), 'tournaments'), []);
  const tMap = Object.fromEntries((tournaments || []).map((t) => [t.id, t]));
  return (
    <PageShell title="Fixtures & Results" subtitle="All matches across tournaments">
      {(tournaments || []).length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {tournaments.map((t) => <Link key={t.id} href={`/tournaments/${t.id}`} className="chip hover:border-gold-400/50">{t.name} →</Link>)}
        </div>
      )}
      {matches === undefined ? <Spinner /> : <Schedule matches={matches || []} teamMap={teamMap} showTournament tMap={tMap} />}
    </PageShell>
  );
}

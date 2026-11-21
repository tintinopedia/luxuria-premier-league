'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useLive } from '@/lib/data';
import { fmtDate } from '@/lib/format';
import { Empty, Spinner } from '@/components/ui';

export default function Article() {
  const { id } = useParams();
  const n = useLive(() => doc(db(), 'news', id), [id]);
  if (n === undefined) return <Spinner />;
  if (!n) return <div className="mx-auto max-w-3xl p-8"><Empty>Article not found.</Empty></div>;
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/news" className="text-sm text-slate-400 hover:text-gold-300">← All news</Link>
      <div className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-400">{n.kind === 'blog' ? 'Blog' : 'News'} · {fmtDate(n.createdAt)}</div>
      <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-white">{n.title}</h1>
      {n.summary && <p className="mt-3 text-lg text-slate-300">{n.summary}</p>}
      {n.author && <p className="mt-2 text-sm text-slate-500">By {n.author}</p>}
      {n.imageUrl && <img src={n.imageUrl} alt="" className="mt-6 w-full rounded-2xl object-cover" />}
      <div className="mt-6 space-y-4 whitespace-pre-line leading-relaxed text-slate-300">{n.body}</div>
      {n.matchId && <Link href={`/match/${n.matchId}`} className="btn-ghost mt-8">View match centre →</Link>}
    </article>
  );
}

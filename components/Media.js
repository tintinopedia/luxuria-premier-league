'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { timeAgo } from '@/lib/format';
import { videoThumb, youtubeId } from '@/lib/media';
import { Empty, Modal } from './ui';

// Horizontal carousel capped at 10 items; the last visible tile is masked and links to the full page
export function Carousel({ items = [], render, viewAllHref, viewAllLabel, emptyText }) {
  const ref = useRef(null);
  if (!items.length) return <Empty>{emptyText}</Empty>;
  const shown = items.slice(0, 10);
  const maskLast = items.length >= 10;
  const scroll = (d) => ref.current?.scrollBy({ left: d * (ref.current.clientWidth * 0.8), behavior: 'smooth' });
  return (
    <div className="relative">
      <div ref={ref} className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-2">
        {shown.map((it, i) => {
          const masked = maskLast && i === shown.length - 1;
          return (
            <div key={it.id} className="relative w-[260px] shrink-0 snap-start sm:w-[300px]">
              {render(it, masked)}
              {masked && (
                <Link href={viewAllHref} className="absolute inset-0 grid place-items-center rounded-2xl bg-ink-950/75 backdrop-blur-[3px] transition hover:bg-ink-950/60">
                  <span className="text-center">
                    <span className="block font-display text-2xl font-semibold text-white">+{items.length - 9}</span>
                    <span className="mt-1 block text-sm font-semibold text-gold-300">{viewAllLabel} →</span>
                  </span>
                </Link>
              )}
            </div>
          );
        })}
        {!maskLast && (
          <Link href={viewAllHref} className="card grid w-[180px] shrink-0 snap-start place-items-center text-sm font-semibold text-gold-300 hover:bg-white/5">{viewAllLabel} →</Link>
        )}
      </div>
      <button onClick={() => scroll(-1)} className="absolute -left-3 top-[40%] hidden h-10 w-10 place-items-center rounded-full border border-white/10 bg-ink-800 text-white shadow-xl md:grid">‹</button>
      <button onClick={() => scroll(1)} className="absolute -right-3 top-[40%] hidden h-10 w-10 place-items-center rounded-full border border-white/10 bg-ink-800 text-white shadow-xl md:grid">›</button>
    </div>
  );
}

export function VideoTile({ v, onPlay, masked }) {
  const thumb = videoThumb(v);
  return (
    <button onClick={() => !masked && onPlay?.(v)} className="group block w-full text-left">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-ink-800 ring-1 ring-white/[0.06]">
        {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          : v.url ? <video src={v.url} muted preload="metadata" className="h-full w-full object-cover" /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent" />
        <span className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-gold-400 text-ink-950 shadow-lg">▶</span>
      </div>
      <div className="mt-2 line-clamp-2 text-sm font-semibold text-white">{v.title}</div>
      <div className="text-xs text-slate-500">{timeAgo(v.createdAt)}</div>
    </button>
  );
}

export function PhotoTile({ p, onOpen, masked }) {
  return (
    <button onClick={() => !masked && onOpen?.(p)} className="group block w-full text-left">
      <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-ink-800 ring-1 ring-white/[0.06]">
        <img src={p.url} alt={p.caption || ''} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      </div>
      {p.caption && <div className="mt-2 line-clamp-1 text-sm text-slate-300">{p.caption}</div>}
    </button>
  );
}

export function VideoPlayerModal({ video, onClose }) {
  if (!video) return null;
  const yt = youtubeId(video.url);
  return (
    <Modal open title={video.title} onClose={onClose} wide>
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        {yt ? <iframe className="h-full w-full" src={`https://www.youtube.com/embed/${yt}?autoplay=1`} allow="autoplay; encrypted-media; fullscreen" allowFullScreen title={video.title} />
          : <video src={video.url} controls autoPlay className="h-full w-full" />}
      </div>
      {video.description && <p className="mt-3 text-sm text-slate-300">{video.description}</p>}
    </Modal>
  );
}

export function Lightbox({ photos, index, onClose, onIndex }) {
  if (index == null || !photos[index]) return null;
  const p = photos[index];
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={onClose}>
      <div className="flex justify-end p-4"><button className="text-2xl text-white">✕</button></div>
      <div className="flex flex-1 items-center justify-center gap-4 px-4" onClick={(e) => e.stopPropagation()}>
        <button disabled={index === 0} onClick={() => onIndex(index - 1)} className="text-4xl text-white disabled:opacity-20">‹</button>
        <img src={p.url} alt="" className="max-h-[80vh] max-w-full rounded-xl object-contain" />
        <button disabled={index === photos.length - 1} onClick={() => onIndex(index + 1)} className="text-4xl text-white disabled:opacity-20">›</button>
      </div>
      {p.caption && <p className="p-4 text-center text-sm text-slate-300">{p.caption}</p>}
    </div>
  );
}

export function VideoGrid({ videos = [] }) {
  const [play, setPlay] = useState(null);
  if (!videos.length) return <Empty>No videos yet.</Empty>;
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{videos.map((v) => <VideoTile key={v.id} v={v} onPlay={setPlay} />)}</div>
      <VideoPlayerModal video={play} onClose={() => setPlay(null)} />
    </>
  );
}

export function PhotoGrid({ photos = [] }) {
  const [idx, setIdx] = useState(null);
  if (!photos.length) return <Empty>No photos yet.</Empty>;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{photos.map((p, i) => <PhotoTile key={p.id} p={p} onOpen={() => setIdx(i)} />)}</div>
      <Lightbox photos={photos} index={idx} onClose={() => setIdx(null)} onIndex={setIdx} />
    </>
  );
}

export function NewsList({ items = [], compact }) {
  if (!items.length) return <Empty>No news yet.</Empty>;
  return (
    <div className="grid gap-3">
      {items.map((n, i) => (
        <Link key={n.id} href={`/news/${n.id}`} className={`card card-hover flex gap-4 p-3 ${i === 0 && !compact ? 'sm:p-4' : ''}`}>
          {n.imageUrl && <img src={n.imageUrl} alt="" className={`shrink-0 rounded-xl object-cover ${i === 0 && !compact ? 'h-28 w-40 sm:h-36 sm:w-56' : 'h-20 w-28'}`} />}
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
              <span className={n.kind === 'blog' ? 'text-sky-300' : 'text-gold-400'}>{n.kind === 'blog' ? 'Blog' : 'News'}</span>
              <span className="text-slate-500">{timeAgo(n.createdAt)}</span>
            </div>
            <h3 className={`font-semibold text-white ${i === 0 && !compact ? 'text-lg' : ''}`}>{n.title}</h3>
            {n.summary && <p className="mt-1 line-clamp-2 text-sm text-slate-400">{n.summary}</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}

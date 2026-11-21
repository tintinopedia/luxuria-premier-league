'use client';
import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { useData, useLive, tname } from '@/lib/data';
import { fmtDate, timeAgo } from '@/lib/format';
import { safeName, uploadFile, videoThumb, youtubeId } from '@/lib/media';
import { Empty, Field, Spinner, Tabs } from '@/components/ui';

export default function ContentPage() {
  const { can } = useAuth();
  const tabs = [
    (can('news.add') || can('blogs.add')) && { key: 'news', label: 'News & Blogs' },
    can('videos.add') && { key: 'videos', label: 'Videos' },
    can('photos.add') && { key: 'photos', label: 'Photos' },
  ].filter(Boolean);
  const [tab, setTab] = useState(tabs[0]?.key);
  useEffect(() => { if (!tab && tabs[0]) setTab(tabs[0].key); }, [tab, tabs]);
  if (!tabs.length) return <Empty>No content permissions.</Empty>;
  return (
    <div>
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      <div className="mt-6">
        {tab === 'news' && <NewsAdmin />}
        {tab === 'videos' && <VideosAdmin />}
        {tab === 'photos' && <PhotosAdmin />}
      </div>
    </div>
  );
}

function MatchSelect({ value, onChange }) {
  const { teamMap } = useData();
  const matches = useLive(() => query(collection(db(), 'matches'), orderBy('date', 'desc')), []);
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Not linked to a match</option>
      {(matches || []).map((m) => <option key={m.id} value={m.id}>Match {m.matchNo}: {tname(teamMap[m.teamA])} vs {tname(teamMap[m.teamB])} ({fmtDate(m.date)})</option>)}
    </select>
  );
}

function Layout({ form, list }) {
  return <div className="grid gap-6 lg:grid-cols-[400px_1fr]"><div className="card h-fit p-5">{form}</div><div>{list}</div></div>;
}

function NewsAdmin() {
  const { can, user, profile } = useAuth();
  const items = useLive(() => query(collection(db(), 'news'), orderBy('createdAt', 'desc')), []);
  const kinds = [can('news.add') && 'news', can('blogs.add') && 'blog'].filter(Boolean);
  const blank = { kind: kinds[0], title: '', summary: '', body: '', matchId: '' };
  const [f, setF] = useState(blank);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    if (!f.title.trim() || !f.body.trim()) return alert('Title and body are required.');
    setBusy(true);
    try {
      const imageUrl = file ? await uploadFile(`media/news/${safeName(file)}`, file) : '';
      await addDoc(collection(db(), 'news'), { ...f, title: f.title.trim(), summary: f.summary.trim(), imageUrl, matchId: f.matchId || null, author: profile?.fullName || user.displayName || '', createdBy: user.uid, createdAt: serverTimestamp() });
      setF(blank); setFile(null); e.target.reset();
    } catch (err) { alert(err.message); }
    setBusy(false);
  }
  return (
    <Layout
      form={(
        <form onSubmit={save} className="space-y-4">
          <h3 className="section-title !text-lg">Publish</h3>
          <div className="grid grid-cols-2 gap-2">{kinds.map((k) => <button type="button" key={k} onClick={() => setF({ ...f, kind: k })} className={`choice ${f.kind === k ? 'choice-on' : ''}`}>{k === 'blog' ? 'Blog' : 'News'}</button>)}</div>
          <Field label="Title" required><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Summary"><input className="input" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} /></Field>
          <Field label="Body" required><textarea rows={8} className="input" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
          <Field label="Cover image"><input type="file" accept="image/*" className="input" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field>
          <Field label="Link to match"><MatchSelect value={f.matchId} onChange={(v) => setF({ ...f, matchId: v })} /></Field>
          <button disabled={busy} className="btn-primary w-full">{busy ? 'Publishing…' : 'Publish'}</button>
        </form>
      )}
      list={items === undefined ? <Spinner /> : !items?.length ? <Empty>Nothing published yet.</Empty> : (
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id} className="card flex items-center gap-3 p-3">
              {n.imageUrl && <img src={n.imageUrl} alt="" className="h-14 w-20 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1"><div className="truncate font-semibold text-white">{n.title}</div><div className="text-xs text-slate-400">{n.kind === 'blog' ? 'Blog' : 'News'} · {timeAgo(n.createdAt)}</div></div>
              <button onClick={() => confirm('Delete?') && deleteDoc(doc(db(), 'news', n.id))} className="btn-danger btn-sm">Delete</button>
            </div>
          ))}
        </div>
      )}
    />
  );
}

function VideosAdmin() {
  const { user } = useAuth();
  const items = useLive(() => query(collection(db(), 'videos'), orderBy('createdAt', 'desc')), []);
  const [f, setF] = useState({ title: '', url: '', description: '', matchId: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault();
    if (!f.title.trim() || (!f.url.trim() && !file)) return alert('Add a title and a YouTube link or a video file.');
    if (f.url && !file && !youtubeId(f.url) && !/\.(mp4|webm|mov)(\?|$)/i.test(f.url)) return alert('Use a YouTube link or a direct video file link.');
    setBusy(true);
    try {
      const url = file ? await uploadFile(`media/videos/${safeName(file)}`, file) : f.url.trim();
      await addDoc(collection(db(), 'videos'), { title: f.title.trim(), description: f.description.trim(), url, matchId: f.matchId || null, createdBy: user.uid, createdAt: serverTimestamp() });
      setF({ title: '', url: '', description: '', matchId: '' }); setFile(null); e.target.reset();
    } catch (err) { alert(err.message); }
    setBusy(false);
  }
  return (
    <Layout
      form={(
        <form onSubmit={save} className="space-y-4">
          <h3 className="section-title !text-lg">Add video</h3>
          <Field label="Title" required><input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="YouTube link" hint="Recommended: upload to YouTube (unlisted is fine) and paste the link"><input className="input" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://youtu.be/…" /></Field>
          <Field label="…or upload a file"><input type="file" accept="video/*" className="input" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field>
          <Field label="Description"><textarea rows={3} className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="Link to match"><MatchSelect value={f.matchId} onChange={(v) => setF({ ...f, matchId: v })} /></Field>
          <button disabled={busy} className="btn-primary w-full">{busy ? 'Uploading…' : 'Add video'}</button>
        </form>
      )}
      list={items === undefined ? <Spinner /> : !items?.length ? <Empty>No videos yet.</Empty> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((v) => (
            <div key={v.id} className="card overflow-hidden">
              {videoThumb(v) ? <img src={videoThumb(v)} alt="" className="aspect-video w-full object-cover" /> : <video src={v.url} className="aspect-video w-full bg-black object-cover" preload="metadata" />}
              <div className="flex items-center gap-2 p-3">
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">{v.title}</div><div className="text-xs text-slate-400">{timeAgo(v.createdAt)}</div></div>
                <button onClick={() => confirm('Delete?') && deleteDoc(doc(db(), 'videos', v.id))} className="btn-danger btn-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    />
  );
}

function PhotosAdmin() {
  const { user } = useAuth();
  const items = useLive(() => query(collection(db(), 'photos'), orderBy('createdAt', 'desc')), []);
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [matchId, setMatchId] = useState('');
  const [progress, setProgress] = useState('');
  async function save(e) {
    e.preventDefault();
    if (!files.length) return alert('Choose at least one photo.');
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`Uploading ${i + 1} of ${files.length}…`);
        const url = await uploadFile(`media/photos/${safeName(files[i])}`, files[i]);
        await addDoc(collection(db(), 'photos'), { url, caption: caption.trim(), matchId: matchId || null, createdBy: user.uid, createdAt: serverTimestamp() });
      }
      setFiles([]); setCaption(''); e.target.reset();
    } catch (err) { alert(err.message); }
    setProgress('');
  }
  return (
    <Layout
      form={(
        <form onSubmit={save} className="space-y-4">
          <h3 className="section-title !text-lg">Upload photos</h3>
          <Field label="Photos" required hint="You can select several at once"><input type="file" multiple accept="image/*" className="input" onChange={(e) => setFiles([...(e.target.files || [])])} /></Field>
          <Field label="Caption"><input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} /></Field>
          <Field label="Link to match"><MatchSelect value={matchId} onChange={setMatchId} /></Field>
          <button disabled={!!progress} className="btn-primary w-full">{progress || `Upload ${files.length || ''} photo${files.length === 1 ? '' : 's'}`}</button>
        </form>
      )}
      list={items === undefined ? <Spinner /> : !items?.length ? <Empty>No photos yet.</Empty> : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {items.map((p) => (
            <div key={p.id} className="group relative overflow-hidden rounded-xl">
              <img src={p.url} alt="" className="aspect-square w-full object-cover" />
              <button onClick={() => confirm('Delete photo?') && deleteDoc(doc(db(), 'photos', p.id))} className="absolute right-2 top-2 rounded-lg bg-black/70 px-2 py-1 text-xs text-red-300 opacity-0 transition group-hover:opacity-100">Delete</button>
            </div>
          ))}
        </div>
      )}
    />
  );
}

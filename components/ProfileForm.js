'use client';
import { useState } from 'react';
import { BAT_STYLES, BOWL_STYLES, SKILLS, needsBat, needsBowl } from '@/lib/constants';
import { Avatar, Field } from './ui';

export default function ProfileForm({ initial = {}, onSubmit, submitLabel = 'Submit for approval', photoRequired = true }) {
  const [f, setF] = useState({ fullName: '', onFieldName: '', skill: '', battingStyle: '', bowlingStyle: '', age: '', ...initial });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(initial.photoURL || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (photoRequired && !file && !f.photoURL) return setErr('Please add a photo.');
    if (!f.fullName.trim()) return setErr('Full name is required.');
    if (!f.skill) return setErr('Select your playing skill.');
    if (needsBat(f.skill) && !f.battingStyle) return setErr('Select your batting style.');
    if (needsBowl(f.skill) && !f.bowlingStyle) return setErr('Select your bowling style.');
    const age = parseInt(f.age, 10);
    if (!age || age < 5 || age > 90) return setErr('Enter a valid age.');
    setBusy(true);
    try {
      await onSubmit({
        fullName: f.fullName.trim(), onFieldName: f.onFieldName.trim(), skill: f.skill,
        battingStyle: needsBat(f.skill) ? f.battingStyle : '', bowlingStyle: needsBowl(f.skill) ? f.bowlingStyle : '',
        age, photoURL: f.photoURL || '',
      }, file);
    } catch (e2) { console.error(e2); setErr(e2.message || 'Something went wrong'); }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-5">
        <Avatar src={preview} name={f.fullName} size={96} ring={!!preview} />
        <div>
          <span className="label">Photo{photoRequired && <span className="text-gold-400"> *</span>}</span>
          <label className="btn-ghost btn-sm cursor-pointer">
            {preview ? 'Change photo' : 'Upload photo'}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const x = e.target.files?.[0]; if (!x) return; setFile(x); setPreview(URL.createObjectURL(x));
            }} />
          </label>
          <p className="mt-1 text-xs text-slate-500">A clear face photo. Max 5 MB.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required><input className="input" value={f.fullName} onChange={set('fullName')} /></Field>
        <Field label="On-field name" hint="Nickname teammates call you (optional)"><input className="input" value={f.onFieldName} onChange={set('onFieldName')} /></Field>
        <Field label="Playing skill" required>
          <select className="input" value={f.skill} onChange={set('skill')}>
            <option value="">Select…</option>{SKILLS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Age" required><input className="input" type="number" min="5" max="90" value={f.age} onChange={set('age')} /></Field>
        {needsBat(f.skill) && (
          <Field label="Batting style" required>
            <div className="grid grid-cols-2 gap-2">
              {BAT_STYLES.map((s) => <button type="button" key={s} onClick={() => setF({ ...f, battingStyle: s })} className={`choice ${f.battingStyle === s ? 'choice-on' : ''}`}>{s}</button>)}
            </div>
          </Field>
        )}
        {needsBowl(f.skill) && (
          <Field label="Bowling style" required>
            <select className="input" value={f.bowlingStyle} onChange={set('bowlingStyle')}>
              <option value="">Select…</option>{BOWL_STYLES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        )}
      </div>
      {err && <p className="rounded-xl bg-live/10 px-3 py-2 text-sm text-red-300">{err}</p>}
      <button disabled={busy} className="btn-primary w-full sm:w-auto">{busy ? 'Saving…' : submitLabel}</button>
    </form>
  );
}


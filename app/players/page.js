'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useData } from '@/lib/data';
import { matchPlayer } from '@/components/PlayerSearch';
import { Avatar, Empty, PageShell } from '@/components/ui';
import { SKILLS } from '@/lib/constants';

export default function PlayersPage() {
  const { players, teams } = useData();
  const [q, setQ] = useState('');
  const [skill, setSkill] = useState('');
  const list = players.filter((p) => matchPlayer(p, q) && (!skill || p.skill === skill))
    .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  const teamOf = (id) => teams.find((t) => (t.members || []).includes(id));
  return (
    <PageShell title="Players" subtitle={`${players.length} registered players`}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input className="input sm:max-w-sm" placeholder="Search by name or on-field name" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input sm:max-w-xs" value={skill} onChange={(e) => setSkill(e.target.value)}>
          <option value="">All skills</option>{SKILLS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {list.length === 0 ? <Empty>No players found.</Empty> : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {list.map((p) => (
            <Link key={p.id} href={`/players/${p.id}`} className="card card-hover p-4 text-center">
              <Avatar src={p.photoURL} name={p.fullName} size={84} className="mx-auto" />
              <div className="mt-3 truncate font-semibold text-white">{p.fullName}</div>
              {p.onFieldName && <div className="truncate text-xs text-gold-300">“{p.onFieldName}”</div>}
              <div className="mt-1 truncate text-xs text-slate-400">{p.skill}</div>
              {teamOf(p.id) && <div className="mt-1 truncate text-[11px] text-slate-500">{teamOf(p.id).name}</div>}
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}

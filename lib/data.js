'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

// Live subscription to a doc / query. Returns undefined while loading, null on missing/error.
export function useLive(makeRef, deps) {
  const [data, setData] = useState(undefined);
  useEffect(() => {
    let ref;
    try { ref = makeRef(); } catch (e) { console.error(e); ref = null; }
    if (!ref) { setData(null); return; }
    setData(undefined);
    return onSnapshot(ref,
      (snap) => {
        if ('docs' in snap) setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        else setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      },
      (e) => { console.error(e); setData(null); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return data;
}

const DataCtx = createContext({ players: [], teams: [], playerMap: {}, teamMap: {} });

export function DataProvider({ children }) {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  useEffect(() => {
    const u1 = onSnapshot(collection(db(), 'players'), (s) => setPlayers(s.docs.map((d) => ({ id: d.id, ...d.data() }))), console.error);
    const u2 = onSnapshot(collection(db(), 'teams'), (s) => setTeams(s.docs.map((d) => ({ id: d.id, ...d.data() }))), console.error);
    return () => { u1(); u2(); };
  }, []);
  const value = useMemo(() => ({
    players, teams,
    playerMap: Object.fromEntries(players.map((p) => [p.id, p])),
    teamMap: Object.fromEntries(teams.map((t) => [t.id, t])),
  }), [players, teams]);
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export const useData = () => useContext(DataCtx);
export const pname = (p) => (p ? p.onFieldName || p.fullName || 'Unknown' : 'Unknown');
export const tname = (t) => (t ? t.name : 'TBD');
export const tshort = (t) => (t ? (t.shortName || t.name || '').toUpperCase() : 'TBD');

import { backend, newId } from '@/backend';
import type { Comp, CompType, Round, Score, ScoreMap, Tour, UserProfile } from '@/core/types';
import sample from '@/sample/sample-tours.json';

export const COMP_TYPES: { type: CompType; label: string; about: string }[] = [
  { type: 'stableford', label: 'Stableford', about: 'Points per hole against your handicap. Most points wins.' },
  { type: 'stroke', label: 'Stroke play', about: 'Total strokes, gross or net. Lowest wins.' },
  { type: 'skins', label: 'Skins', about: 'Win a hole outright to win its skin. Ties carry over.' },
  { type: 'scramble', label: 'Scramble', about: 'Teams play the best shot each time and post one score.' },
  { type: 'match', label: 'Match play', about: 'Hole-by-hole head to head, singles or better ball.' },
  { type: 'nassau', label: 'Nassau', about: 'Three bets in one: front nine, back nine and overall.' },
  { type: 'lowhigh', label: 'Low ball / high ball', about: 'Two points a hole: best low ball and best high ball.' },
];
export const compLabel = (t: CompType) => COMP_TYPES.find((c) => c.type === t)?.label ?? t;

export function newComp(type: CompType): Comp {
  return {
    id: newId('g'),
    name: compLabel(type),
    type,
    basis: 'net',
    allowance: type === 'scramble' ? 100 : type === 'stroke' || type === 'stableford' ? 100 : 100,
    display: type === 'stableford' ? 'points' : undefined,
    carry: type === 'skins' ? true : undefined,
    rounds: [],
    pairings: ['match', 'nassau', 'lowhigh'].includes(type) ? [] : undefined,
  };
}

export const today = () => new Date().toISOString().slice(0, 10);

export function fmtDate(d: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d || '';
  return new Date(d + 'T12:00:00Z').toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' });
}
export function fmtRange(a: string, b: string) {
  if (!a) return '';
  if (!b || a === b) return fmtDate(a, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmtDate(a)} – ${fmtDate(b, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
export const isLive = (t: Tour) => !!t.startDate && t.startDate <= today() && today() <= (t.endDate || t.startDate);

export function blankRound(t: Tour): Round {
  return {
    id: newId('r'),
    name: `Round ${t.rounds.length + 1}`,
    date: t.startDate || today(),
    course: { name: '', tee: '', rating: null, slope: null, par: Array(18).fill(4), si: Array.from({ length: 18 }, (_, i) => i + 1) },
    groups: [],
  };
}

/** Splits players into groups of `size` with tee times `gap` minutes apart. */
export function autoGroups(ids: string[], size: number, first: string, gap: number) {
  const [h, m] = (first || '08:00').split(':').map(Number);
  const out = [];
  for (let i = 0; i * size < ids.length; i++) {
    const mins = h * 60 + m + i * gap;
    const teeTime = `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    out.push({ id: newId('g'), teeTime, startHole: 1, ids: ids.slice(i * size, i * size + size) });
  }
  return out;
}

/** Offline test mode: two finished sample tours to look around with. */
export async function loadSample(me: UserProfile) {
  const data = sample as unknown as { tours: Tour[]; scores: ScoreMap };
  for (const t of data.tours) {
    const year = t.id.slice(-4);
    const start = `${year}-12-20`;
    const id = await backend.createTour({
      ...t,
      name: `Sample Tour ${year}`,
      location: 'Garden Route',
      timezone: 'Africa/Johannesburg',
      startDate: start,
      endDate: `${year}-12-22`,
      ownerUid: me.uid,
      adminUids: [],
      memberUids: [me.uid],
      rounds: t.rounds.map((r, i) => ({ ...r, date: `${year}-12-${20 + i}`, groups: r.groups.map((g, gi) => ({ ...g, teeTime: `0${8 + Math.floor(gi / 6)}:${String((gi * 10) % 60).padStart(2, '0')}` })) })),
    });
    for (const s of Object.values(data.scores).filter((x) => x.tourId === t.id)) {
      await backend.saveScore({ ...(s as Score), tourId: id }, { silent: true });
    }
  }
}

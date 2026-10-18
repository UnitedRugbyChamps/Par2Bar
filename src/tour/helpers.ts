import { backend, newId, offline } from '@/backend';
import { defaultPrefs, type Comp, type CompType, type HoleStat, type Post, type Round, type Score, type ScoreMap, type Tour, type UserProfile } from '@/core/types';
import sample from '@/sample/sample-tours.json';
import { teamColors } from '@/ui/theme';

export const COMP_TYPES: { type: CompType; label: string; about: string }[] = [
  { type: 'stableford', label: 'Stableford', about: 'Points per hole against your handicap. Most points wins.' },
  { type: 'stroke', label: 'Stroke play', about: 'Total strokes, gross or net. Lowest wins.' },
  { type: 'skins', label: 'Skins', about: 'Win a hole outright to win its skin. Ties carry over.' },
  { type: 'scramble', label: 'Scramble', about: 'Teams play the best shot each time and post one score.' },
  { type: 'match', label: 'Match play', about: 'Hole-by-hole head to head, singles or better ball.' },
  { type: 'nassau', label: 'Nassau', about: 'Three bets in one: front nine, back nine and overall.' },
  { type: 'lowhigh', label: 'Low ball / high ball', about: 'Two points a hole: best low ball and best high ball.' },
  { type: 'bogey', label: 'Par / bogey', about: 'Play each hole against par with your shots: win, halve or lose. Most holes up wins.' },
  { type: 'eclectic', label: 'Eclectic', about: 'Your best score on each hole across all the rounds makes one dream card.' },
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

const SAMPLE_BIOS = ['Fairways and greens.', 'Weekend hacker, weekday dreamer.', 'Chasing single figures.', 'Long off the tee, sometimes straight.', 'Here for the 19th.', 'Putter is my best friend and my worst enemy.'];
const SAMPLE_CLUBS = ['Fancourt', 'Pinnacle Point', 'Simola', 'Oubaai', 'George GC'];
const SAMPLE_STORIES = ['Range session before the big one', 'Who is buying at the 19th?', 'Tee times are out', 'New driver. Same slice.'];

/** Made-up but believable putts and hole stats for the sample cards (seeded, so the same every time). */
function sampleDetail(strokes: (number | null)[], par: number[], seed: string): Pick<Score, 'putts' | 'stats'> {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const putts: (number | null)[] = [];
  const stats: (HoleStat | null)[] = [];
  strokes.forEach((g, i) => {
    if (!g) {
      putts.push(null);
      stats.push(null);
      return;
    }
    const d = g - par[i];
    let pu = d <= -1 ? (rnd() < 0.8 ? 1 : 2) : d >= 2 ? (rnd() < 0.3 ? 3 : 2) : rnd() < 0.08 ? 3 : rnd() < 0.15 ? 1 : 2;
    pu = Math.max(d <= -2 ? 0 : 1, Math.min(pu, g - 1));
    putts.push(pu);
    const st: HoleStat = {};
    if (par[i] >= 4) {
      const miss = rnd() < (d >= 2 ? 0.75 : d === 1 ? 0.55 : 0.35);
      st.fw = !miss ? 'hit' : rnd() < 0.45 ? 'left' : rnd() < 0.85 ? 'right' : 'short';
    }
    if (rnd() < (d >= 2 ? 0.3 : d === 1 ? 0.2 : 0.06)) st.sand = 1;
    if (d >= 2) {
      const r = rnd();
      if (r < 0.22) st.water = 1;
      else if (r < 0.36) st.ob = 1;
      else if (r < 0.5) st.lost = 1;
    }
    stats.push(st);
  });
  return { putts, stats };
}

/** Offline test mode: a sample club with two finished tours, other golfers'
 *  profiles, follows and stories, with you playing as the 2024 champion. */
export async function loadSample(me: UserProfile) {
  const data = sample as unknown as { tours: Tour[]; scores: ScoreMap };
  const off = offline;
  const uidOf = (pid: string) => (pid === 'p7' ? me.uid : `sample-${pid}`);
  const people = new Map<string, string>();
  data.tours.forEach((t) => t.players.forEach((p) => p.id !== 'p7' && people.set(p.id, p.name)));
  const others = [...people.entries()].map(([pid, name], i) => ({ pid, name, uid: uidOf(pid), i }));
  await off?.seedProfiles(
    others.map(({ name, uid, i }) => ({
      uid,
      name,
      email: '',
      hi: null,
      hiAuto: true,
      affiliated: i % 3 !== 2,
      homeClub: SAMPLE_CLUBS[i % SAMPLE_CLUBS.length],
      bio: SAMPLE_BIOS[i % SAMPLE_BIOS.length],
      notify: { ...defaultPrefs },
      createdAt: Date.now(),
    })),
  );
  const members = [me.uid, ...others.map((o) => o.uid)];
  const clubId = await backend.createClub({
    name: 'Par 2 Bar',
    about: 'Our annual tour: three rounds, one champion, and a team cup with bragging rights for a year.',
    location: 'Garden Route',
    founded: '2018',
    ownerUid: me.uid,
    adminUids: [],
    memberUids: [me.uid],
  });
  await backend.updateClub(clubId, {
    memberUids: members,
    formats: ['stableford', 'skins', 'ryder'],
    sponsors: [
      { id: 'sp1', name: 'The 19th Hole', blurb: 'Tour Championship trophy' },
      { id: 'sp2', name: 'Fairway Motors', blurb: 'Longest drive, every round' },
      { id: 'sp3', name: 'Coastal Brew Co.', blurb: 'Nearest the pin on the par 3s' },
    ],
  });

  for (const t of data.tours) {
    const year = t.id.slice(-4);
    const start = `${year}-12-20`;
    const id = await backend.createTour({
      ...t,
      name: `Par 2 Bar ${year}`,
      clubId,
      location: 'Garden Route',
      timezone: 'Africa/Johannesburg',
      startDate: start,
      endDate: `${year}-12-22`,
      ownerUid: me.uid,
      adminUids: [],
      memberUids: [me.uid, ...t.players.map((p) => uidOf(p.id)).filter((u) => u !== me.uid)],
      players: t.players.map((p) => ({ ...p, uid: uidOf(p.id), name: p.id === 'p7' ? me.name : p.name })),
      teams: t.teams.map((x, i) => ({ ...x, name: i ? 'Gold' : 'Black', color: i ? teamColors[2] : teamColors[0] })),
      comps: t.comps.map((c) => (c.main ? { ...c, cut: { mode: 'percent', value: 50 } } : c)),
      rounds: t.rounds.map((r, i) => ({ ...r, date: `${year}-12-${20 + i}`, groups: r.groups.map((g, gi) => ({ ...g, teeTime: `0${8 + Math.floor(gi / 6)}:${String((gi * 10) % 60).padStart(2, '0')}` })) })),
    });
    for (const s of Object.values(data.scores).filter((x) => x.tourId === t.id)) {
      const r = t.rounds.find((x) => x.id === s.rid);
      const detail = r ? sampleDetail(s.strokes, r.course.par, `${t.id}${s.rid}${s.unitId}`) : {};
      await backend.saveScore({ ...(s as Score), ...detail, tourId: id }, { silent: true });
    }
  }

  // a few people to follow, who follow back, and some stories to watch
  for (const o of others.slice(0, 8)) {
    await backend.follow(me.uid, o.uid);
    await backend.follow(o.uid, me.uid);
  }
  // a little chat under your latest round
  const latest = (await new Promise<Post[]>((res) => {
    const off = backend.watchPosts([me.uid], (p) => {
      res(p);
      setTimeout(() => off(), 0);
    });
  }))[0];
  if (latest) {
    await backend.addComment({ postId: latest.id, uid: others[0].uid, text: 'Solid finish. Drinks are on you tonight.', at: Date.now() - 3 * 3600000 });
    await backend.addComment({ postId: latest.id, uid: others[2].uid, text: 'Big week. Same again next year? 👏', at: Date.now() - 2 * 3600000 });
    await backend.toggleLike(latest.id, others[1].uid);
    await backend.toggleLike(latest.id, others[3].uid);
  }
  for (const [i, text] of SAMPLE_STORIES.entries()) {
    await backend.addStory({ uid: others[i].uid, text, at: Date.now() - (i + 1) * 47 * 60000 });
  }
}

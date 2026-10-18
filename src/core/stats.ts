/* Tour statistics: per-hole detail rolled up per player, group, team and
 * tour, with the streaks and oddities that make the end-of-tour awards. */
import { model, points, roundLine, type Model } from './engine.ts';
import type { HoleStat, Round, RoundRecord, ScoreMap, Tour } from './types.ts';

export interface StatLine {
  rounds: number;
  holes: number;
  strokes: number;
  par: number;
  pts: number;
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubles: number;
  triples: number;
  /** quadruple bogey or worse */
  quads: number;
  /** holes scoring no Stableford points */
  blobs: number;
  /** tee shots recorded on par 4s and 5s, and where they went */
  fwHoles: number;
  fwHit: number;
  fwLeft: number;
  fwRight: number;
  fwShortLong: number;
  /** holes with putts recorded, and greens hit in regulation among them */
  puttHoles: number;
  putts: number;
  gir: number;
  onePutts: number;
  threePutts: number;
  sand: number;
  ob: number;
  water: number;
  lost: number;
  pen: number;
  /** longest runs within one round */
  birdieStreak: number;
  parStreak: number;
  bogeyStreak: number;
  doubleStreak: number;
  /** worst score against par on one hole, and the hole's gross */
  worstHole: number;
  worstGross: number;
}

export const emptyLine = (): StatLine => ({
  rounds: 0,
  holes: 0,
  strokes: 0,
  par: 0,
  pts: 0,
  eagles: 0,
  birdies: 0,
  pars: 0,
  bogeys: 0,
  doubles: 0,
  triples: 0,
  quads: 0,
  blobs: 0,
  fwHoles: 0,
  fwHit: 0,
  fwLeft: 0,
  fwRight: 0,
  fwShortLong: 0,
  puttHoles: 0,
  putts: 0,
  gir: 0,
  onePutts: 0,
  threePutts: 0,
  sand: 0,
  ob: 0,
  water: 0,
  lost: 0,
  pen: 0,
  birdieStreak: 0,
  parStreak: 0,
  bogeyStreak: 0,
  doubleStreak: 0,
  worstHole: -99,
  worstGross: 0,
});

export const penalties = (s: StatLine) => s.ob + s.water + s.lost + s.pen;
export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null);

/** Adds one card to a line. Holes are walked in order so streaks are real. */
export function addCard(
  line: StatLine,
  r: Round,
  strokes: (number | null)[],
  putts: (number | null)[] | undefined,
  stats: (HoleStat | null)[] | undefined,
  h: number,
): StatLine {
  const c = r.course;
  let played = 0;
  let run = { b: 0, p: 0, bo: 0, d: 0 };
  for (let i = 0; i < 18; i++) {
    const g = strokes[i];
    if (!g) {
      run = { b: 0, p: 0, bo: 0, d: 0 };
      continue;
    }
    played++;
    const par = c.par[i];
    const d = g - par;
    line.holes++;
    line.strokes += g;
    line.par += par;
    const pt = points(g, par, c.si[i], h) ?? 0;
    line.pts += pt;
    if (pt === 0) line.blobs++;
    if (d <= -2) line.eagles++;
    else if (d === -1) line.birdies++;
    else if (d === 0) line.pars++;
    else if (d === 1) line.bogeys++;
    else if (d === 2) line.doubles++;
    else if (d === 3) line.triples++;
    else line.quads++;
    if (d > line.worstHole) {
      line.worstHole = d;
      line.worstGross = g;
    }
    run = { b: d <= -1 ? run.b + 1 : 0, p: d <= 0 ? run.p + 1 : 0, bo: d >= 1 ? run.bo + 1 : 0, d: d >= 2 ? run.d + 1 : 0 };
    line.birdieStreak = Math.max(line.birdieStreak, run.b);
    line.parStreak = Math.max(line.parStreak, run.p);
    line.bogeyStreak = Math.max(line.bogeyStreak, run.bo);
    line.doubleStreak = Math.max(line.doubleStreak, run.d);

    const pu = putts?.[i];
    if (pu != null) {
      line.puttHoles++;
      line.putts += pu;
      if (g - pu <= par - 2) line.gir++;
      if (pu === 1) line.onePutts++;
      if (pu >= 3) line.threePutts++;
    }
    const st = stats?.[i];
    if (st) {
      if (par >= 4 && st.fw) {
        line.fwHoles++;
        if (st.fw === 'hit') line.fwHit++;
        else if (st.fw === 'left') line.fwLeft++;
        else if (st.fw === 'right') line.fwRight++;
        else line.fwShortLong++;
      }
      line.sand += st.sand ?? 0;
      line.ob += st.ob ?? 0;
      line.water += st.water ?? 0;
      line.lost += st.lost ?? 0;
      line.pen += st.pen ?? 0;
    }
  }
  if (played) line.rounds++;
  return line;
}

export function mergeLines(a: StatLine, b: StatLine): StatLine {
  const out = { ...a };
  (Object.keys(b) as (keyof StatLine)[]).forEach((k) => {
    if (k.endsWith('Streak') || k === 'worstHole') (out[k] as number) = Math.max(a[k], b[k]);
    else if (k === 'worstGross') out.worstGross = b.worstHole > a.worstHole ? b.worstGross : a.worstGross;
    else (out[k] as number) = a[k] + b[k];
  });
  return out;
}

export interface Breakdown {
  id: string;
  name: string;
  /** player ids included */
  ids: string[];
  line: StatLine;
}

export interface TourReport {
  /** rounds covered (one, or all) */
  rounds: Round[];
  players: Breakdown[];
  /** four-balls, one per tee time; only for a single round */
  groups: Breakdown[];
  teams: Breakdown[];
  tour: StatLine;
  /** whether anyone recorded fairways, putts or trouble */
  detail: { fairways: boolean; putts: boolean; trouble: boolean };
}

/** Stats for the whole tour, or for one round. Team-ball rounds (foursomes,
 *  scramble) count towards nobody's individual line. */
export function tourReport(tour: Tour, scores: ScoreMap, rid?: string | null, M: Model = model(tour, scores)): TourReport {
  const rounds = rid ? M.rounds.filter((r) => r.id === rid) : M.rounds;
  const lines: Record<string, StatLine> = {};
  tour.players.forEach((p) => (lines[p.id] = emptyLine()));
  rounds.forEach((r) => {
    tour.players.forEach((p) => {
      if (M.inTeamBall(r, p.id)) return;
      const card = M.card(r.id, p.id);
      if (!card) return;
      const h = roundLine(M, r, p.id).h;
      addCard(lines[p.id], r, card.strokes, card.putts, card.stats, h);
    });
  });
  const sumOf = (ids: string[]) => ids.reduce((acc, id) => (lines[id] ? mergeLines(acc, lines[id]) : acc), emptyLine());
  const players = tour.players.filter((p) => lines[p.id].holes).map((p) => ({ id: p.id, name: p.name, ids: [p.id], line: lines[p.id] }));
  const groups =
    rounds.length === 1
      ? rounds[0].groups
          .map((g, gi) => ({ id: g.id, name: `${g.teeTime || `Group ${gi + 1}`} · ${g.ids.map((id) => M.pm[id]?.name.split(' ')[0] ?? '?').join(', ')}`, ids: g.ids, line: sumOf(g.ids) }))
          .filter((g) => g.line.holes)
      : [];
  const teams = tour.teams
    .map((t) => {
      const ids = tour.players.filter((p) => p.team === t.id).map((p) => p.id);
      return { id: t.id, name: t.name, ids, line: sumOf(ids) };
    })
    .filter((t) => t.line.holes);
  const tourLine = sumOf(tour.players.map((p) => p.id));
  return {
    rounds,
    players,
    groups,
    teams,
    tour: tourLine,
    detail: { fairways: tourLine.fwHoles > 0, putts: tourLine.puttHoles > 0, trouble: tourLine.sand + penalties(tourLine) > 0 },
  };
}

export interface Award {
  id: string;
  title: string;
  /** good news, or one for the fines sheet */
  kind: 'honour' | 'fine';
  winners: string[];
  value: string;
}

interface AwardDef {
  id: string;
  title: string;
  kind: 'honour' | 'fine';
  /** the number to rank by (higher wins), or null when it doesn't apply */
  score: (s: StatLine) => number | null;
  show: (v: number, s: StatLine) => string;
  /** below this nobody gets it */
  min?: number;
}

const per = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;

export const AWARDS: AwardDef[] = [
  { id: 'birdies', title: 'Most birdies', kind: 'honour', score: (s) => s.birdies + s.eagles, show: (v) => per(v, 'birdie'), min: 1 },
  { id: 'eagles', title: 'Eagle club', kind: 'honour', score: (s) => s.eagles, show: (v) => per(v, 'eagle'), min: 1 },
  { id: 'birdieStreak', title: 'Longest birdie streak', kind: 'honour', score: (s) => s.birdieStreak, show: (v) => `${v} in a row`, min: 2 },
  { id: 'parStreak', title: 'Longest run at par or better', kind: 'honour', score: (s) => s.parStreak, show: (v) => `${v} holes`, min: 3 },
  { id: 'fairways', title: 'Fairway finder', kind: 'honour', score: (s) => (s.fwHoles >= 5 ? s.fwHit / s.fwHoles : null), show: (_, s) => `${pct(s.fwHit, s.fwHoles)}% fairways` },
  { id: 'gir', title: 'Greens in regulation', kind: 'honour', score: (s) => (s.puttHoles >= 9 ? s.gir / s.puttHoles : null), show: (_, s) => `${pct(s.gir, s.puttHoles)}% greens` },
  { id: 'putter', title: 'Hot putter', kind: 'honour', score: (s) => (s.puttHoles >= 9 ? -s.putts / s.puttHoles : null), show: (_, s) => `${((s.putts / s.puttHoles) * 18).toFixed(1)} putts a round` },
  { id: 'onePutts', title: 'Most one-putts', kind: 'honour', score: (s) => s.onePutts, show: (v) => per(v, 'one-putt'), min: 1 },
  { id: 'clean', title: 'Cleanest card', kind: 'honour', score: (s) => (s.holes >= 18 ? -(s.doubles + s.triples + s.quads) / s.holes : null), show: (_, s) => `${per(s.doubles + s.triples + s.quads, 'hole')} at double or worse` },

  { id: 'quads', title: 'Quadruple bogey club', kind: 'fine', score: (s) => s.quads, show: (v) => `${v} quad${v === 1 ? '' : 's'} or worse`, min: 1 },
  { id: 'worstHole', title: 'Worst single hole', kind: 'fine', score: (s) => (s.holes ? s.worstHole : null), show: (v, s) => `${s.worstGross} (+${v})`, min: 3 },
  { id: 'doubles', title: 'Most doubles or worse', kind: 'fine', score: (s) => s.doubles + s.triples + s.quads, show: (v) => per(v, 'hole'), min: 1 },
  { id: 'bogeyStreak', title: 'Longest bogey-or-worse streak', kind: 'fine', score: (s) => s.bogeyStreak, show: (v) => `${v} in a row`, min: 3 },
  { id: 'doubleStreak', title: 'Longest double-or-worse streak', kind: 'fine', score: (s) => s.doubleStreak, show: (v) => `${v} in a row`, min: 2 },
  { id: 'blobs', title: 'Most blobs (no points)', kind: 'fine', score: (s) => s.blobs, show: (v) => per(v, 'blob'), min: 1 },
  { id: 'threePutts', title: 'Three-putt king', kind: 'fine', score: (s) => s.threePutts, show: (v) => per(v, 'three-putt'), min: 1 },
  { id: 'lost', title: 'Most lost balls', kind: 'fine', score: (s) => s.lost, show: (v) => per(v, 'ball'), min: 1 },
  { id: 'water', title: 'Most water balls', kind: 'fine', score: (s) => s.water, show: (v) => per(v, 'ball'), min: 1 },
  { id: 'ob', title: 'Most out of bounds', kind: 'fine', score: (s) => s.ob, show: (v) => per(v, 'ball'), min: 1 },
  { id: 'penalties', title: 'Most penalty strokes', kind: 'fine', score: (s) => penalties(s), show: (v) => per(v, 'stroke'), min: 1 },
  { id: 'sand', title: 'Beach holiday (most sand shots)', kind: 'fine', score: (s) => s.sand, show: (v) => per(v, 'shot'), min: 1 },
  { id: 'left', title: 'Hooked it (most misses left)', kind: 'fine', score: (s) => s.fwLeft, show: (v) => per(v, 'fairway'), min: 2 },
  { id: 'right', title: 'Sliced it (most misses right)', kind: 'fine', score: (s) => s.fwRight, show: (v) => per(v, 'fairway'), min: 2 },
];

/** Award winners among these lines (ties share an award). */
export function awards(lines: Breakdown[]): Award[] {
  const out: Award[] = [];
  AWARDS.forEach((a) => {
    let best: number | null = null;
    let who: Breakdown[] = [];
    lines.forEach((b) => {
      const v = a.score(b.line);
      if (v == null || (a.min != null && v < a.min)) return;
      if (best == null || v > best + 1e-9) {
        best = v;
        who = [b];
      } else if (Math.abs(v - best) < 1e-9) who.push(b);
    });
    if (best != null && who.length) out.push({ id: a.id, title: a.title, kind: a.kind, winners: who.map((w) => w.name), value: a.show(best, who[0].line) });
  });
  return out;
}

/** Position the cut falls at, for a field of `n` ranked players: the top N or N%, and ties. */
export function cutPosition(n: number, cut: { mode: 'top' | 'percent'; value: number }) {
  if (cut.mode === 'top') return Math.max(1, Math.min(n, Math.round(cut.value)));
  return Math.max(1, Math.ceil((n * cut.value) / 100));
}

/** One stat line over a player's round history (profile stats). */
export function lineFromRecords(records: Pick<RoundRecord, 'par' | 'si' | 'strokes' | 'putts' | 'stats' | 'courseHcp'>[]): StatLine {
  const line = emptyLine();
  records.forEach((r) => addCard(line, { id: '', name: '', date: '', groups: [], course: { name: '', tee: '', rating: null, slope: null, par: r.par, si: r.si } }, r.strokes, r.putts, r.stats, r.courseHcp));
  return line;
}

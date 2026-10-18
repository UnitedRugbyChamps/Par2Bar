/* World Handicap System maths: adjusted gross score, score differentials,
 * the handicap index from the last 20 rounds, and lifetime stats. */
import { courseHcp, points, shots } from './engine.ts';
import type { Player, Round, RoundRecord, Score, Tour } from './types.ts';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/** Each hole is capped at net double bogey (par + 2 + strokes received). */
export function adjustedGross(strokes: number[], par: number[], si: number[], ch: number | null): number {
  return sum(strokes.map((g, i) => Math.min(g, ch == null ? par[i] + 5 : par[i] + 2 + shots(ch, si[i]))));
}

/** (113 ÷ Slope) × (Adjusted Gross − Course Rating), to one decimal. */
export function differential(adjGross: number, rating: number, slope: number): number {
  return Math.round((113 / slope) * (adjGross - rating) * 10) / 10;
}

/** How many of the lowest differentials count, and the adjustment, by rounds available (WHS table). */
const TABLE: [number, number][] = [
  [0, 0], [0, 0], [0, 0], [1, -2], [1, -1], [1, 0], [2, -1], [2, 0], [2, 0], [3, 0], [3, 0], [3, 0],
  [4, 0], [4, 0], [4, 0], [5, 0], [5, 0], [6, 0], [6, 0], [7, 0], [8, 0],
];

/** Handicap index from the most recent 20 rounds, or null with fewer than 3. */
export function handicapIndex(records: Pick<RoundRecord, 'differential' | 'date' | 'at'>[]): number | null {
  const recent = [...records].sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at).slice(0, 20);
  if (recent.length < 3) return null;
  const [n, adj] = TABLE[recent.length];
  const best = recent.map((r) => r.differential).sort((a, b) => a - b).slice(0, n);
  const hi = Math.round((sum(best) / n + adj) * 10) / 10;
  return Math.min(54, hi);
}

/** Builds the round record when a linked player's card is complete. */
export function roundRecord(tour: Tour, round: Round, player: Player, score: Score, ch: number): RoundRecord | null {
  if (!player.uid || score.strokes.length < 18 || score.strokes.some((g) => !g)) return null;
  const strokes = score.strokes as number[];
  const c = round.course;
  const parTotal = sum(c.par);
  const adjGross = adjustedGross(strokes, c.par, c.si, player.hi == null ? null : ch);
  const estimated = !c.rating || !c.slope;
  const pts = sum(strokes.map((g, i) => points(g, c.par[i], c.si[i], ch) ?? 0));
  return {
    id: `${tour.id}~${round.id}~${player.id}`,
    uid: player.uid,
    playerId: player.id,
    tourId: tour.id,
    tourName: tour.name,
    clubId: tour.clubId ?? undefined,
    rid: round.id,
    roundName: round.name,
    date: round.date,
    course: c.name,
    tee: c.tee,
    rating: c.rating,
    slope: c.slope,
    par: c.par,
    si: c.si,
    strokes,
    putts: score.putts,
    ...(score.stats ? { stats: score.stats } : {}),
    courseHcp: ch,
    gross: sum(strokes),
    adjGross,
    pts,
    differential: differential(adjGross, c.rating || parTotal, c.slope || 113),
    estimated,
    at: score.updatedAt ?? Date.now(),
  };
}

/** Round records produced by a score change: cards that reach 18 holes, or finished cards that change. */
export function finishedRecords(tour: Tour, before: Score | undefined, after: Score, chOf: (r: Round, pid: string) => number): RoundRecord[] {
  const was = (before?.strokes ?? []).filter(Boolean).length;
  const same = (k: 'strokes' | 'putts' | 'stats') => JSON.stringify(before?.[k] ?? null) === JSON.stringify(after[k] ?? null);
  if (was === 18 && same('strokes') && same('putts') && same('stats')) return [];
  const round = tour.rounds.find((r) => r.id === after.rid);
  const player = tour.players.find((p) => p.id === after.unitId);
  if (!round || !player) return [];
  const rec = roundRecord(tour, round, player, after, chOf(round, player.id));
  return rec ? [rec] : [];
}

export { courseHcp };

export interface LifetimeStats {
  rounds: number;
  avgGross: number | null;
  avgToPar: number | null;
  avgPts: number | null;
  best: RoundRecord | null;
  worst: RoundRecord | null;
  bestPts: RoundRecord | null;
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubles: number;
  holes: number;
  par3: number | null;
  par4: number | null;
  par5: number | null;
  puttsAvg: number | null;
  courses: number;
  trend: { date: string; differential: number }[];
}

export function lifetimeStats(records: RoundRecord[]): LifetimeStats {
  const avg = (a: number[]) => (a.length ? sum(a) / a.length : null);
  const s = { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, holes: 0 };
  const byPar: Record<number, number[]> = { 3: [], 4: [], 5: [] };
  const putts: number[] = [];
  records.forEach((r) => {
    r.strokes.forEach((g, i) => {
      const d = g - r.par[i];
      s.holes++;
      if (d <= -2) s.eagles++;
      else if (d === -1) s.birdies++;
      else if (d === 0) s.pars++;
      else if (d === 1) s.bogeys++;
      else s.doubles++;
      byPar[r.par[i]]?.push(g);
    });
    if (r.putts?.every((p) => p != null)) putts.push(sum(r.putts as number[]));
  });
  const toPar = (r: RoundRecord) => r.gross - sum(r.par);
  const sorted = [...records].sort((a, b) => toPar(a) - toPar(b) || a.gross - b.gross);
  return {
    rounds: records.length,
    avgGross: avg(records.map((r) => r.gross)),
    avgToPar: avg(records.map(toPar)),
    avgPts: avg(records.map((r) => r.pts)),
    best: sorted[0] ?? null,
    worst: sorted[sorted.length - 1] ?? null,
    bestPts: [...records].sort((a, b) => b.pts - a.pts)[0] ?? null,
    ...s,
    par3: avg(byPar[3]),
    par4: avg(byPar[4]),
    par5: avg(byPar[5]),
    puttsAvg: avg(putts),
    courses: new Set(records.map((r) => r.course)).size,
    trend: [...records].sort((a, b) => a.date.localeCompare(b.date) || a.at - b.at).map((r) => ({ date: r.date, differential: r.differential })),
  };
}

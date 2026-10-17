import { cup, fmtRel, leaderboard, model, roundLine } from '@/core/engine';
import { mainComp } from '@/core/notify';
import type { Comp, ScoreMap, Tour } from '@/core/types';

export interface Honour {
  tour: Tour;
  year: string;
  /** Winners of the headline competition (several if tied) */
  champions: { name: string; uid?: string; score: string }[];
  cup: { winner: string | null; a: number; b: number; teamA: string; teamB: string } | null;
  /** still being played */
  live: boolean;
}

export interface ClubRecord {
  label: string;
  name: string;
  uid?: string;
  value: string;
  detail: string;
}

/** A leaderboard total the way the competition reads: points, or to par (also stableford shown against 36). */
export function fmtTotal(comp: Pick<Comp, 'type' | 'display'>, n: number | null) {
  if (n == null) return '';
  return comp.type === 'stableford' && comp.display !== 'vs36' ? `${n} pts` : fmtRel(n);
}

export function honours(tour: Tour, scores: ScoreMap | undefined, today: string): Honour {
  const year = (tour.startDate || '').slice(0, 4);
  const live = !!tour.startDate && (tour.endDate || tour.startDate) >= today;
  const empty = { tour, year, champions: [], cup: null, live };
  if (!scores) return empty;
  const M = model(tour, scores);
  const comp = mainComp(tour);
  let champions: Honour['champions'] = [];
  if (comp) {
    const rows = leaderboard(M, comp).rows.filter((r) => r.pos === 1 && r.total != null);
    champions = rows.map((r) => ({
      name: r.name,
      uid: tour.players.find((p) => p.id === r.uid)?.uid,
      score: fmtTotal(comp, r.total),
    }));
  }
  const c = cup(M);
  const name = (id?: string) => tour.teams.find((t) => t.id === id)?.name ?? '';
  const cupOut = c && c.matches.length ? { winner: c.a > c.b ? name(c.teamA) : c.b > c.a ? name(c.teamB) : null, a: c.a, b: c.b, teamA: name(c.teamA), teamB: name(c.teamB) } : null;
  return { tour, year, champions, cup: cupOut, live };
}

/** All-time club records across its tours. Players are matched by account, else by name. */
export function clubRecords(tours: Tour[], scores: Record<string, ScoreMap>, hs: Honour[]): ClubRecord[] {
  const key = (p: { uid?: string; name: string }) => p.uid || p.name.trim().toLowerCase();
  type Best = { name: string; uid?: string; v: number; detail: string };
  let low: Best | null = null;
  let pts: Best | null = null;
  const birdies = new Map<string, { name: string; uid?: string; n: number }>();
  const rounds = new Map<string, { name: string; uid?: string; n: number }>();
  for (const t of tours) {
    const s = scores[t.id];
    if (!s) continue;
    const M = model(t, s);
    for (const r of M.rounds) {
      for (const p of t.players) {
        if (M.inTeamBall(r, p.id)) continue;
        const line = roundLine(M, r, p.id);
        if (!line.n) continue;
        const k = key(p);
        const st = M.strokes(r, p.id);
        const b = st.filter((g, i) => g && g - r.course.par[i] <= -1).length;
        const cur = birdies.get(k) ?? { name: p.name, uid: p.uid, n: 0 };
        birdies.set(k, { ...cur, n: cur.n + b });
        if (line.n < 18 || line.gross == null) continue;
        const rc = rounds.get(k) ?? { name: p.name, uid: p.uid, n: 0 };
        rounds.set(k, { ...rc, n: rc.n + 1 });
        const detail = `${r.course.name}, ${t.startDate.slice(0, 4)}`;
        if (!low || line.gross < low.v) low = { name: p.name, uid: p.uid, v: line.gross, detail };
        if (!pts || line.pts > pts.v) pts = { name: p.name, uid: p.uid, v: line.pts, detail };
      }
    }
  }
  const titles = new Map<string, { name: string; uid?: string; n: number; years: string[] }>();
  hs.filter((h) => !h.live).forEach((h) =>
    h.champions.forEach((c) => {
      const k = key(c);
      const cur = titles.get(k) ?? { name: c.name, uid: c.uid, n: 0, years: [] };
      titles.set(k, { ...cur, n: cur.n + 1, years: [...cur.years, h.year] });
    }),
  );
  const top = <T extends { n: number }>(m: Map<string, T>) => [...m.values()].sort((a, b) => b.n - a.n)[0];
  const out: ClubRecord[] = [];
  const mostTitles = top(titles);
  if (mostTitles) out.push({ label: 'Most titles', name: mostTitles.name, uid: mostTitles.uid, value: String(mostTitles.n), detail: mostTitles.years.join(', ') });
  if (low) out.push({ label: 'Lowest round', name: low.name, uid: low.uid, value: String(low.v), detail: low.detail });
  if (pts) out.push({ label: 'Best stableford round', name: pts.name, uid: pts.uid, value: `${pts.v}`, detail: pts.detail });
  const mb = top(birdies);
  if (mb?.n) out.push({ label: 'Most birdies', name: mb.name, uid: mb.uid, value: String(mb.n), detail: 'All tours' });
  const mr = top(rounds);
  if (mr?.n) out.push({ label: 'Most rounds played', name: mr.name, uid: mr.uid, value: String(mr.n), detail: 'All tours' });
  return out;
}

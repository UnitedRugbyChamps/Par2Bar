/* Scoring engine: handicaps, leaderboards, skins, matches and the team cup.
 * Ported from the engine verified against two years of real tour results
 * (Stableford, net better-ball fourballs and singles). Pure functions only. */
import type { Comp, Round, RoundCourse, ScoreMap, Tour, Player } from './types.ts';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/** Handicap strokes received on a hole of stroke index `si` for playing handicap `h`.
 *  Plus handicaps give strokes back, starting from stroke index 18. */
export function shots(h: number, si: number): number {
  if (h < 0) {
    const g = -h;
    return -(Math.floor(g / 18) + (19 - si <= g % 18 ? 1 : 0)) || 0;
  }
  return Math.floor(h / 18) + (si <= h % 18 ? 1 : 0);
}

/** Stableford points for gross `g` on a hole. */
export function points(g: number | null, par: number, si: number, h: number): number | null {
  return g ? Math.max(0, 2 + par + shots(h, si) - g) : null;
}

export const pairId = (ids: string[]) => 'x-' + [...ids].sort().join('-');

/** WHS course handicap: Index × Slope / 113 + (Course Rating − Par).
 *  Without a rating and slope it falls back to the index. */
export function courseHcp(hi: number | null | undefined, c: Pick<RoundCourse, 'par' | 'rating' | 'slope'>): number {
  if (hi == null || Number.isNaN(+hi)) return 0;
  if (!c.slope || !c.rating) return Math.round(+hi);
  return Math.round((+hi * c.slope) / 113 + (c.rating - sum(c.par)));
}

/** WHS recommended team allowances. */
export function teamHcp(chs: number[], kind: 'foursomes' | 'scramble'): number {
  const s = [...chs].sort((a, b) => a - b);
  if (kind === 'foursomes') return Math.round(sum(s) * 0.5);
  const w = s.length === 2 ? [0.35, 0.15] : s.length === 3 ? [0.3, 0.2, 0.1] : [0.25, 0.2, 0.15, 0.1];
  return Math.round(sum(s.map((h, i) => h * (w[i] || 0))));
}

export interface Unit {
  id: string;
  ids: string[];
  kind: 'player' | 'foursomes' | 'scramble';
  name: string;
  team?: string;
}

export type Model = ReturnType<typeof model>;

export function model(tour: Tour, scores: ScoreMap) {
  const pm: Record<string, Player> = {};
  (tour.players || []).forEach((p) => (pm[p.id] = p));
  const rounds = tour.rounds || [];
  const card = (rid: string, uid: string) => scores[`${tour.id}~${rid}~${uid}`] || null;

  // team-ball units per round: foursomes pairs from the cup, scramble teams from the round
  const teamUnits: Record<string, Omit<Unit, 'name'>[]> = {};
  rounds.forEach((r) => {
    const u: Omit<Unit, 'name'>[] = [];
    (tour.cup?.sessions || [])
      .filter((s) => s.rid === r.id && s.format === 'foursomes')
      .forEach((s) =>
        s.matches.forEach((m) =>
          [m.a, m.b].forEach((ids) => {
            if (ids.length) u.push({ id: pairId(ids), ids, kind: 'foursomes' });
          }),
        ),
      );
    (r.scramble || []).forEach((ids) => {
      if (ids.length) u.push({ id: pairId(ids), ids, kind: 'scramble' });
    });
    teamUnits[r.id] = u;
  });

  /** Course handicap of a player for a round (or its override). */
  function chOf(r: Round, pid: string): number {
    const o = r.hcp?.[pid];
    if (typeof o === 'number') return o;
    return courseHcp(pm[pid]?.hi, r.course);
  }
  function unitOf(r: Round, uid: string): Unit | null {
    if (pm[uid]) return { id: uid, ids: [uid], kind: 'player', name: pm[uid].name, team: pm[uid].team };
    const t = (teamUnits[r.id] || []).find((x) => x.id === uid);
    if (!t) return null;
    return { ...t, name: t.ids.map((i) => pm[i]?.name ?? '?').join(' & '), team: pm[t.ids[0]]?.team };
  }
  function hcpOf(r: Round, uid: string): number {
    const u = unitOf(r, uid);
    if (!u) return 0;
    if (u.kind === 'player') return chOf(r, uid);
    const o = r.hcp?.[uid];
    if (typeof o === 'number') return o;
    return teamHcp(
      u.ids.map((i) => chOf(r, i)),
      u.kind,
    );
  }
  function strokes(r: Round, uid: string): (number | null)[] {
    return card(r.id, uid)?.strokes || Array(18).fill(null);
  }
  /** Whether a player plays a team ball (foursomes, scramble) in a round instead of their own. */
  function inTeamBall(r: Round, pid: string) {
    return (teamUnits[r.id] || []).some((u) => u.ids.includes(pid));
  }
  /** The ball a player's strokes are recorded against in a round. */
  function ballOf(r: Round, pid: string) {
    return (teamUnits[r.id] || []).find((u) => u.ids.includes(pid))?.id ?? pid;
  }
  function scoringUnits(r: Round) {
    return [
      ...(tour.players || []).filter((p) => !inTeamBall(r, p.id)).map((p) => p.id),
      ...(teamUnits[r.id] || []).map((u) => u.id),
    ];
  }
  return { tour, pm, rounds, card, teamUnits, chOf, unitOf, hcpOf, strokes, inTeamBall, ballOf, scoringUnits };
}

export interface RoundLine {
  n: number;
  done: boolean;
  gross: number | null;
  pts: number;
  rel: number | null;
  net: number | null;
  toPar: number | null;
  /** par/bogey: holes won minus holes lost against par, net */
  vsPar: number;
  h: number;
  skip?: boolean;
}

/** One unit's round in one competition. */
export function roundLine(M: Model, r: Round, uid: string, comp?: Partial<Comp>): RoundLine {
  const st = M.strokes(r, uid);
  const c = r.course;
  const allow = (comp?.allowance ?? 100) / 100;
  const h = Math.round(M.hcpOf(r, uid) * allow);
  const net = !comp || comp.basis !== 'gross';
  let n = 0,
    gross = 0,
    pts = 0,
    rel = 0,
    netTot = 0,
    parPlayed = 0,
    vsPar = 0;
  st.forEach((g, i) => {
    if (!g) return;
    n++;
    gross += g;
    parPlayed += c.par[i];
    const p = points(g, c.par[i], c.si[i], net ? h : 0) ?? 0;
    pts += p;
    rel += 2 - p;
    const ng = g - (net ? shots(h, c.si[i]) : 0);
    netTot += ng;
    vsPar += Math.sign(c.par[i] - ng);
  });
  return {
    n,
    done: n === 18,
    gross: n ? gross : null,
    pts,
    rel: n ? rel : null,
    net: n ? netTot : null,
    toPar: n ? netTot - parPlayed : null,
    vsPar,
    h,
  };
}

export interface BoardRow {
  uid: string;
  name: string;
  team?: string;
  per: RoundLine[];
  total: number | null;
  sortKey: number | null;
  gross: number | null;
  last: RoundLine | null;
  pos: number | '';
  tied?: boolean;
}

function compRounds(M: Model, comp: Pick<Comp, 'rounds'>) {
  return M.rounds.filter((r) => !comp.rounds || !comp.rounds.length || comp.rounds.includes(r.id));
}

/** Individual or team stroke competitions: Stableford, stroke play, scramble. */
export function leaderboard(M: Model, comp: Comp): { rows: BoardRow[]; rounds: Round[] } {
  const rs = compRounds(M, comp);
  const kind = comp.type;
  let units: string[];
  if (kind === 'scramble') {
    const seen: Record<string, 1> = {};
    units = [];
    rs.forEach((r) =>
      (M.teamUnits[r.id] || [])
        .filter((u) => u.kind === 'scramble')
        .forEach((u) => {
          if (!seen[u.id]) {
            seen[u.id] = 1;
            units.push(u.id);
          }
        }),
    );
  } else units = (M.tour.players || []).map((p) => p.id);

  const rows: BoardRow[] = units.map((uid) => {
    const per: RoundLine[] = rs.map((r) => {
      const blank: RoundLine = { n: 0, done: false, gross: null, pts: 0, rel: null, net: null, toPar: null, vsPar: 0, h: 0, skip: true };
      if (kind !== 'scramble' && M.inTeamBall(r, uid)) return blank;
      if (kind === 'scramble' && !(M.teamUnits[r.id] || []).some((u) => u.id === uid)) return blank;
      return roundLine(M, r, uid, comp);
    });
    const played = per.filter((x) => x.n);
    let total: number | null = null,
      sortKey: number | null = null;
    if (played.length) {
      if (kind === 'stableford') {
        const pts = sum(played.map((x) => x.pts));
        total = comp.display === 'vs36' ? sum(played.map((x) => x.rel ?? 0)) : pts;
        sortKey = comp.display === 'vs36' ? total : -pts;
      } else if (kind === 'bogey') {
        total = sum(played.map((x) => x.vsPar));
        sortKey = -total;
      } else if (kind === 'eclectic') {
        total = eclecticToPar(M, rs, uid, comp);
        sortKey = total;
      } else {
        total = sum(played.map((x) => x.toPar ?? 0));
        sortKey = total;
      }
    }
    const gross = played.length ? sum(played.map((x) => x.gross ?? 0)) : null;
    const li = per.map((x) => x.n > 0).lastIndexOf(true);
    const u = M.unitOf(rs[Math.max(li, 0)] || M.rounds[0], uid);
    return { uid, name: u?.name ?? '?', team: u?.team, per, total, sortKey, gross, last: li >= 0 ? per[li] : null, pos: '' };
  });
  rows.sort((a, b) => (a.sortKey ?? 1e9) - (b.sortKey ?? 1e9) || a.name.localeCompare(b.name));
  let pos = 0;
  let prev: number | null | undefined;
  rows.forEach((r, i) => {
    if (r.sortKey !== prev) {
      pos = i + 1;
      prev = r.sortKey;
    }
    r.pos = r.sortKey == null ? '' : pos;
  });
  const cnt: Record<string, number> = {};
  rows.forEach((r) => (cnt[r.pos] = (cnt[r.pos] || 0) + 1));
  rows.forEach((r) => {
    if (r.pos && cnt[r.pos] > 1) r.tied = true;
  });
  return { rows, rounds: rs };
}

/** Best score on each hole across the rounds, against par (net unless gross). */
export function eclecticToPar(M: Model, rs: Round[], uid: string, comp: Pick<Comp, 'basis' | 'allowance'>): number | null {
  const best: (number | null)[] = Array(18).fill(null);
  rs.forEach((r) => {
    if (M.inTeamBall(r, uid)) return;
    const h = Math.round(M.hcpOf(r, uid) * ((comp.allowance ?? 100) / 100));
    M.strokes(r, uid).forEach((g, i) => {
      if (!g) return;
      const rel = g - (comp.basis !== 'gross' ? shots(h, r.course.si[i]) : 0) - r.course.par[i];
      if (best[i] == null || rel < best[i]!) best[i] = rel;
    });
  });
  const got = best.filter((x): x is number => x != null);
  return got.length ? sum(got) : null;
}

export interface SkinHole {
  ri: number;
  hole: number;
  uid: string | null;
  value: number;
  score: number;
  tied?: number;
}

/** Skins: lowest score on a hole wins it outright; ties carry if `comp.carry`. */
export function skins(M: Model, comp: Comp) {
  const rs = compRounds(M, comp);
  const net = comp.basis !== 'gross';
  const allow = (comp.allowance ?? 100) / 100;
  const won: Record<string, number[]> = {};
  const holes: SkinHole[] = [];
  rs.forEach((r, ri) => {
    let carry = 0;
    const units = M.scoringUnits(r).filter((u) => M.unitOf(r, u)?.kind === 'player');
    for (let i = 0; i < 18; i++) {
      let best = 99,
        allIn = true;
      let who: string[] = [];
      units.forEach((u) => {
        const g = M.strokes(r, u)[i];
        if (!g) {
          allIn = false;
          return;
        }
        const v = g - (net ? shots(Math.round(M.hcpOf(r, u) * allow), r.course.si[i]) : 0);
        if (v < best) {
          best = v;
          who = [u];
        } else if (v === best) who.push(u);
      });
      if (!who.length) continue;
      const value = 1 + carry;
      if (who.length === 1) {
        (won[who[0]] = won[who[0]] || Array(rs.length).fill(0))[ri] += value;
        holes.push({ ri, hole: i + 1, uid: who[0], value, score: best });
        carry = 0;
      } else {
        holes.push({ ri, hole: i + 1, uid: null, value, tied: who.length, score: best });
        if (comp.carry && allIn) carry = value;
      }
    }
  });
  const rows = (M.tour.players || [])
    .map((p) => ({ uid: p.id, name: p.name, team: p.team, per: won[p.id] || Array(rs.length).fill(0) }))
    .map((r) => ({ ...r, total: sum(r.per) }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  return { rows, rounds: rs, holes };
}

/* Matches: better-ball net, any side size --------------------------------- */
function sideBest(M: Model, r: Round, ids: string[], i: number, mode: 'full' | 'diff', low: number, allow: number) {
  const v = ids.map((u) => {
    const g = M.strokes(r, u)[i];
    if (!g) return null;
    const h = Math.round(M.hcpOf(r, u) * allow);
    return g - shots(mode === 'diff' ? h - low : h, r.course.si[i]);
  });
  return v.some((x) => x == null) ? null : Math.min(...(v as number[]));
}

export interface MatchState {
  up: number; // positive = side A ahead
  thru: number;
  done: boolean;
  dormie: boolean;
  holes: number[];
  margin: string;
}

export function matchPlay(
  M: Model,
  r: Round,
  a: string[],
  b: string[],
  opts: { mode?: 'full' | 'diff'; from?: number; to?: number; noClose?: boolean; allowance?: number } = {},
): MatchState {
  const mode = opts.mode || 'full',
    from = opts.from || 0,
    to = opts.to || 18,
    len = to - from;
  const allow = (opts.allowance ?? 100) / 100;
  const all = [...a, ...b].map((u) => Math.round(M.hcpOf(r, u) * allow));
  const low = Math.min(...all);
  let up = 0,
    thru = 0;
  let closed: string | null = null;
  const holes: number[] = [];
  for (let i = from; i < to; i++) {
    const x = sideBest(M, r, a, i, mode, low, allow),
      y = sideBest(M, r, b, i, mode, low, allow);
    if (x == null || y == null) break;
    const w = x < y ? 1 : y < x ? -1 : 0;
    up += w;
    thru++;
    holes.push(w);
    if (!opts.noClose && thru < len && Math.abs(up) > len - thru) {
      closed = `${Math.abs(up)}&${len - thru}`;
      break;
    }
  }
  const done = !!closed || thru === len;
  const dormie = !done && thru > 0 && Math.abs(up) === len - thru;
  return { up, thru, done, dormie, holes, margin: closed || (up === 0 ? 'A/S' : `${Math.abs(up)} UP`) };
}

/** Low ball / high ball: a point for the better low ball and one for the better high ball on each hole. */
export function lowHigh(M: Model, r: Round, a: string[], b: string[], allowance = 100) {
  let pa = 0,
    pb = 0,
    thru = 0;
  const allow = allowance / 100;
  const net = (u: string, i: number) => {
    const g = M.strokes(r, u)[i];
    return g ? g - shots(Math.round(M.hcpOf(r, u) * allow), r.course.si[i]) : null;
  };
  for (let i = 0; i < 18; i++) {
    const A = a.map((u) => net(u, i)),
      B = b.map((u) => net(u, i));
    if (A.some((x) => x == null) || B.some((x) => x == null)) break;
    thru++;
    const lo = Math.min(...(A as number[])) - Math.min(...(B as number[]));
    const hi = Math.max(...(A as number[])) - Math.max(...(B as number[]));
    if (lo < 0) pa++;
    else if (lo > 0) pb++;
    if (hi < 0) pa++;
    else if (hi > 0) pb++;
  }
  return { pa, pb, thru, done: thru === 18 };
}

export function nassau(M: Model, r: Round, a: string[], b: string[], allowance = 100) {
  return {
    front: matchPlay(M, r, a, b, { from: 0, to: 9, noClose: true, allowance }),
    back: matchPlay(M, r, a, b, { from: 9, to: 18, noClose: true, allowance }),
    total: matchPlay(M, r, a, b, { noClose: true, allowance }),
  };
}

const nameOf = (M: Model, ids: string[]) => ids.map((i) => M.pm[i]?.name ?? '?').join(' & ');

/** Head-to-head games set up as a competition (match play, Nassau, low/high ball). */
export function headToHead(M: Model, comp: Comp) {
  return (comp.pairings || [])
    .map((p, i) => {
      const r = M.rounds.find((x) => x.id === p.rid);
      if (!r || !p.a.length || !p.b.length) return null;
      const names = { a: nameOf(M, p.a), b: nameOf(M, p.b) };
      if (comp.type === 'lowhigh') return { i, r, p, names, lowHigh: lowHigh(M, r, p.a, p.b, comp.allowance) };
      if (comp.type === 'nassau') return { i, r, p, names, nassau: nassau(M, r, p.a, p.b, comp.allowance) };
      return { i, r, p, names, match: matchPlay(M, r, p.a, p.b, { allowance: comp.allowance }) };
    })
    .filter(<T,>(x: T | null): x is T => x != null);
}

/* Team cup (Ryder Cup style) ------------------------------------------------ */
export interface CupMatch {
  si: number;
  mi: number;
  rid: string;
  format: string;
  a: string[];
  b: string[];
  st: MatchState;
  lead: 'a' | 'b' | null;
  pts: { a: number; b: number };
  proj: { a: number; b: number };
  names: { a: string; b: string };
}

export function cup(M: Model) {
  const c = M.tour.cup;
  if (!c || !c.sessions) return null;
  const out: CupMatch[] = [];
  c.sessions.forEach((s, si) => {
    const r = M.rounds.find((x) => x.id === s.rid);
    if (!r) return;
    s.matches.forEach((m, mi) => {
      if (!m.a.length || !m.b.length) return;
      const A = s.format === 'foursomes' ? [pairId(m.a)] : m.a;
      const B = s.format === 'foursomes' ? [pairId(m.b)] : m.b;
      const st = matchPlay(M, r, A, B, { mode: c.hcpMode || 'full' });
      const lead = st.up > 0 ? 'a' : st.up < 0 ? 'b' : null;
      const pts = { a: 0, b: 0 },
        proj = { a: 0, b: 0 };
      if (st.done) {
        if (lead) pts[lead] = 1;
        else pts.a = pts.b = 0.5;
      }
      if (st.thru) {
        if (lead) proj[lead] = 1;
        else proj.a = proj.b = 0.5;
      }
      out.push({ si, mi, rid: r.id, format: s.format, a: m.a, b: m.b, st, lead, pts, proj, names: { a: nameOf(M, m.a), b: nameOf(M, m.b) } });
    });
  });
  const tot = (k: 'a' | 'b') => sum(out.map((x) => x.pts[k]));
  const pr = (k: 'a' | 'b') => sum(out.map((x) => x.proj[k]));
  const avail = out.length;
  return { matches: out, a: tot('a'), b: tot('b'), projA: pr('a'), projB: pr('b'), avail, need: avail / 2 + 0.5, teamA: c.teamA, teamB: c.teamB };
}

/* Player stats over a set of tours ------------------------------------------ */
export function playerStats(Ms: Model[], pid: string) {
  const s = { rounds: 0, holes: 0, gross: [] as number[], eagle: 0, bird: 0, par: 0, bog: 0, dbl: 0, putts: [] as number[], best: null as null | { g: number; course: string; tour: string } };
  Ms.forEach((M) =>
    M.rounds.forEach((r) => {
      if (!M.pm[pid] || M.inTeamBall(r, pid)) return;
      const c = M.card(r.id, pid);
      if (!c) return;
      let n = 0,
        g = 0;
      c.strokes.forEach((x, i) => {
        if (!x) return;
        n++;
        g += x;
        const d = x - r.course.par[i];
        if (d <= -2) s.eagle++;
        else if (d === -1) s.bird++;
        else if (d === 0) s.par++;
        else if (d === 1) s.bog++;
        else s.dbl++;
      });
      s.holes += n;
      if (n === 18) {
        s.rounds++;
        s.gross.push(g);
        if (!s.best || g < s.best.g) s.best = { g, course: r.course.name, tour: M.tour.name };
        if (c.putts?.every((v) => v != null)) s.putts.push(sum(c.putts as number[]));
      }
    }),
  );
  const avg = (a: number[]) => (a.length ? sum(a) / a.length : null);
  return { ...s, avg: avg(s.gross), puttsAvg: avg(s.putts) };
}

/** Formats a to-par or vs-36 number the way golfers read it: E, +3, −2. */
export function fmtRel(v: number | null | undefined): string {
  if (v == null) return '–';
  if (v === 0) return 'E';
  return v > 0 ? `+${v}` : `−${-v}`;
}

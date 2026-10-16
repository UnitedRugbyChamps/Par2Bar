/* What changed when a score was saved, and who wants to hear about it.
 * Used by the Cloud Function that sends push notifications, and by the
 * offline backend to fill the tour feed. */
import { cup, fmtRel, headToHead, leaderboard, model, roundLine } from './engine.ts';
import type { Comp, NotifyPrefs, Score, ScoreMap, Tour, TourEvent, UserProfile } from './types.ts';

export type NewEvent = Omit<TourEvent, 'id' | 'at' | 'tourId'>;

export const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const HOLE_NAMES: Record<number, string> = { [-3]: 'Albatross', [-2]: 'Eagle', [-1]: 'Birdie' };

/** The competition shown first on the tour page. */
export function mainComp(tour: Tour): Comp | undefined {
  const lb = tour.comps.filter((c) => c.type === 'stableford' || c.type === 'stroke');
  return lb.find((c) => c.main) ?? lb[0];
}

function leaders(tour: Tour, scores: ScoreMap, comp: Comp) {
  const rows = leaderboard(model(tour, scores), comp).rows.filter((r) => r.pos === 1);
  return { ids: rows.map((r) => r.uid).sort().join(','), rows };
}

export function diffEvents(tour: Tour, before: ScoreMap, after: ScoreMap, changed: Score, by?: string): NewEvent[] {
  const out: NewEvent[] = [];
  const round = tour.rounds.find((r) => r.id === changed.rid);
  if (!round) return out;
  const M = model(tour, after);
  const unit = M.unitOf(round, changed.unitId);
  const who = unit?.name ?? 'Someone';
  const about = unit?.ids ?? [changed.unitId];
  const prev = before[`${tour.id}~${changed.rid}~${changed.unitId}`]?.strokes ?? [];

  // hole highlights and a plain score line for followers / playing partners
  let lastHole = -1;
  changed.strokes.forEach((g, i) => {
    if (!g || g === prev[i]) return;
    lastHole = i;
    const par = round.course.par[i];
    const name = g === 1 ? 'Hole in one' : HOLE_NAMES[Math.max(-3, g - par)];
    if (name) out.push({ kind: 'highlight', title: `${name}! ${who}`, body: `${who} made ${g === 1 ? 'an ace' : `a ${g}`} on the par-${par} ${ordinal(i + 1)} at ${round.course.name}.`, about, rid: round.id, by });
  });
  if (lastHole >= 0) {
    const line = roundLine(M, round, changed.unitId, mainComp(tour));
    const was = prev.filter(Boolean).length;
    if (line.done && was < 18) {
      out.push({ kind: 'roundDone', title: `${who} is in`, body: `${who} finished ${round.name}: ${line.gross} gross, ${line.pts} points.`, about, rid: round.id, by });
    } else {
      out.push({ kind: 'score', title: who, body: `${changed.strokes[lastHole]} on ${lastHole + 1} · thru ${line.n} · ${line.pts} pts`, about, rid: round.id, by });
    }
  }

  // a new leader in the headline competition
  const comp = mainComp(tour);
  if (comp) {
    const a = leaders(tour, before, comp);
    const b = leaders(tour, after, comp);
    if (b.ids && a.ids !== b.ids) {
      const names = b.rows.map((r) => r.name).join(', ');
      const v = comp.type === 'stableford' && comp.display !== 'vs36' ? `${b.rows[0].total} pts` : fmtRel(b.rows[0].total);
      out.push({ kind: 'leader', title: `${comp.name}: new leader`, body: `${names} ${b.rows.length > 1 ? 'share' : 'leads'} the ${comp.name} on ${v}.`, about: b.rows.map((r) => r.uid), by });
    }
  }

  // team cup matches: lead changes and results
  const teamName = (id: string) => tour.teams.find((t) => t.id === id)?.name ?? id;
  const ca = cup(model(tour, before));
  const cb = cup(M);
  if (ca && cb) {
    cb.matches.forEach((m) => {
      if (m.rid !== round.id) return;
      const old = ca.matches.find((x) => x.si === m.si && x.mi === m.mi);
      if (!old || (old.lead === m.lead && old.st.done === m.st.done)) return;
      const side = m.lead === 'a' ? cb.teamA : cb.teamB;
      const players = [...m.a, ...m.b];
      if (m.st.done) {
        const body = m.lead
          ? `${m.lead === 'a' ? m.names.a : m.names.b} win ${m.st.margin} for ${teamName(side)}. ${teamName(cb.teamA)} ${cb.a} – ${cb.b} ${teamName(cb.teamB)}.`
          : `${m.names.a} and ${m.names.b} halve. ${teamName(cb.teamA)} ${cb.a} – ${cb.b} ${teamName(cb.teamB)}.`;
        out.push({ kind: 'match', title: `${tour.cup?.name ?? 'Cup'}: match result`, body, about: players, rid: round.id, by });
      } else if (m.lead !== old.lead) {
        const body = m.lead ? `${m.lead === 'a' ? m.names.a : m.names.b} go ${m.st.margin} thru ${m.st.thru} for ${teamName(side)}.` : `${m.names.a} v ${m.names.b} back to all square thru ${m.st.thru}.`;
        out.push({ kind: 'match', title: `${tour.cup?.name ?? 'Cup'}: match swings`, body, about: players, rid: round.id, by });
      }
    });
  }

  // head-to-head games (match play, Nassau): results only
  tour.comps
    .filter((c) => c.type === 'match')
    .forEach((c) => {
      const a = headToHead(model(tour, before), c);
      headToHead(M, c).forEach((h) => {
        if (h.r.id !== round.id || !h.match?.done) return;
        const old = a.find((x) => x.i === h.i);
        if (old?.match?.done) return;
        const m = h.match;
        const body = m.up === 0 ? `${h.names.a} and ${h.names.b} halve.` : `${m.up > 0 ? h.names.a : h.names.b} beat ${m.up > 0 ? h.names.b : h.names.a} ${m.margin}.`;
        out.push({ kind: 'match', title: `${c.name}: result`, body, about: [...h.p.a, ...h.p.b], rid: round.id, by });
      });
    });

  return out;
}

/** Which members get a push for an event, by their notification settings. */
export function recipients(tour: Tour, ev: Pick<TourEvent, 'kind' | 'about' | 'rid' | 'by'>, users: UserProfile[]): UserProfile[] {
  const round = ev.rid ? tour.rounds.find((r) => r.id === ev.rid) : undefined;
  const playerOf = (uid: string) => tour.players.find((p) => p.uid === uid)?.id;
  return users.filter((u) => {
    if (!tour.memberUids.includes(u.uid) || u.uid === ev.by) return false;
    const p: NotifyPrefs = u.notify;
    const me = playerOf(u.uid);
    const follows = ev.about.some((id) => p.follow?.includes(id));
    const myGroup = !!(p.myGroup && me && round?.groups.some((g) => g.ids.includes(me) && ev.about.some((id) => g.ids.includes(id))));
    const aboutMe = !!me && ev.about.includes(me);
    switch (ev.kind) {
      case 'leader':
        return p.leader || aboutMe;
      case 'match':
        return p.matches || aboutMe || follows;
      case 'highlight':
        return p.highlights || follows || myGroup;
      case 'score':
      case 'roundDone':
        return follows || myGroup;
      case 'teetime':
        return p.teeTimes && aboutMe;
    }
  });
}

/** Milliseconds since epoch of a wall-clock time in an IANA zone. */
export function zonedTime(date: string, time: string, timeZone = 'UTC'): number {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(guess));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asZone = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'));
  return guess - (asZone - guess);
}

/** Tee times starting within (from, to], as reminder events per group. */
export function teeTimesDue(tour: Tour, from: number, to: number, leadMinutes = 30): NewEvent[] {
  const out: NewEvent[] = [];
  tour.rounds.forEach((r) =>
    r.groups.forEach((g) => {
      if (!r.date || !/^\d{1,2}:\d{2}$/.test(g.teeTime)) return;
      const at = zonedTime(r.date, g.teeTime, tour.timezone);
      const remind = at - leadMinutes * 60000;
      if (remind <= from || remind > to) return;
      const names = g.ids.map((id) => tour.players.find((p) => p.id === id)?.name ?? '?').join(', ');
      out.push({ kind: 'teetime', title: `Tee time ${g.teeTime} at ${r.course.name}`, body: `You're off the ${g.startHole === 10 ? '10th' : '1st'} in ${leadMinutes} minutes with ${names}.`, about: g.ids, rid: r.id });
    }),
  );
  return out;
}

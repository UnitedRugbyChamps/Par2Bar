/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as E from '../src/core/engine.ts';
import type { Tour, ScoreMap } from '../src/core/types.ts';

const data = JSON.parse(readFileSync(new URL('../src/sample/sample-tours.json', import.meta.url), 'utf8')) as {
  tours: Tour[];
  scores: ScoreMap;
};
const tour = (id: string) => data.tours.find((t) => t.id === id)!;

test('WHS course handicap', () => {
  const par = Array(18).fill(4); // par 72
  assert.equal(E.courseHcp(12.4, { par, rating: 71.2, slope: 128 }), 13); // 12.4*128/113 + (71.2-72) = 13.25
  assert.equal(E.courseHcp(-1.5, { par, rating: 73.0, slope: 135 }), -1);
  assert.equal(E.courseHcp(18, { par, rating: null, slope: null }), 18);
});

test('handicap strokes by stroke index, including plus handicaps', () => {
  assert.equal(E.shots(18, 1), 1);
  assert.equal(E.shots(20, 2), 2);
  assert.equal(E.shots(20, 3), 1);
  assert.equal(E.shots(-2, 18), -1);
  assert.equal(E.shots(-2, 17), -1);
  assert.equal(E.shots(-2, 16), 0);
});

test('2024 sample: Stableford winner and runner-up order', () => {
  const t = tour('sample-2024');
  const M = E.model(t, data.scores);
  const lb = E.leaderboard(M, t.comps.find((c) => c.main)!);
  assert.equal(lb.rows[0].uid, 'p7');
  assert.equal(E.fmtRel(lb.rows[0].total), '+3');
});

test('2024 sample: team cup finishes 7.5 – 4.5', () => {
  const t = tour('sample-2024');
  const c = E.cup(E.model(t, data.scores))!;
  assert.equal(c.matches.length, 12);
  assert.equal(c.a, 7.5);
  assert.equal(c.b, 4.5);
  assert.ok(c.matches.every((m) => m.st.done));
});

test('2025 sample: Stableford winner +1, second +7', () => {
  const t = tour('sample-2025');
  const lb = E.leaderboard(E.model(t, data.scores), t.comps.find((c) => c.main)!);
  assert.equal(lb.rows[0].uid, 'p20');
  assert.equal(lb.rows[0].total, 1);
  assert.equal(lb.rows[1].uid, 'p10');
  assert.equal(lb.rows[1].total, 7);
});

test('skins pay out exactly the holes played (with carries)', () => {
  const t = tour('sample-2024');
  const M = E.model(t, data.scores);
  const sk = E.skins(M, t.comps.find((c) => c.type === 'skins')!);
  const paid = sk.rows.reduce((a, r) => a + r.total, 0);
  const lastCarry = (ri: number) => {
    const hs = sk.holes.filter((h) => h.ri === ri);
    const last = hs[hs.length - 1];
    return last.uid ? 0 : last.value;
  };
  assert.equal(paid + lastCarry(0) + lastCarry(1) + lastCarry(2), 54);
});

test('match play closes out and nassau splits nines', () => {
  const r = {
    id: 'r1', name: 'R1', date: '', groups: [],
    course: { name: 'Flat', tee: 'W', rating: null, slope: null, par: Array(18).fill(4), si: Array.from({ length: 18 }, (_, i) => i + 1) },
  };
  const t: Tour = {
    id: 't', name: 't', startDate: '', endDate: '', ownerUid: '', adminUids: [], memberUids: [], joinCode: '',
    players: [{ id: 'a', name: 'A', hi: 0 }, { id: 'b', name: 'B', hi: 0 }], teams: [], rounds: [r], comps: [],
  };
  const s: ScoreMap = {
    't~r1~a': { tourId: 't', rid: 'r1', unitId: 'a', strokes: Array(18).fill(4), putts: [] },
    't~r1~b': { tourId: 't', rid: 'r1', unitId: 'b', strokes: [5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], putts: [] },
  };
  const M = E.model(t, s);
  const m = E.matchPlay(M, r, ['a'], ['b']);
  assert.equal(m.margin, '5&4');
  const n = E.nassau(M, r, ['a'], ['b']);
  assert.equal(n.front.up, 5);
  assert.equal(n.back.up, 0);
  const lh = E.lowHigh(M, r, ['a'], ['b']);
  assert.equal(lh.thru, 18);
});

test('foursomes and scramble team handicaps follow WHS allowances', () => {
  assert.equal(E.teamHcp([10, 20], 'foursomes'), 15);
  assert.equal(E.teamHcp([10, 20, 5, 15], 'scramble'), Math.round(5 * 0.25 + 10 * 0.2 + 15 * 0.15 + 20 * 0.1));
});

test('notifications: new leader, birdies and a cup result from one card', async () => {
  const N = await import('../src/core/notify.ts');
  const t = tour('sample-2024');
  const r3 = t.rounds[2];
  // before: the final round card of one singles player is blank
  const m = t.cup!.sessions.find((s) => s.rid === 'r3')!.matches[0];
  const pid = m.a[0];
  const key = `${t.id}~r3~${pid}`;
  const before = { ...data.scores, [key]: { ...data.scores[key], strokes: Array(18).fill(null) } };
  const evs = N.diffEvents(t, before, data.scores, data.scores[key], 'u1');
  assert.ok(evs.some((e) => e.kind === 'roundDone'));
  assert.ok(evs.some((e) => e.kind === 'match' && /match result/.test(e.title)));
  const users = [
    { uid: 'u1', name: '', email: '', hi: null, notify: { myGroup: true, leader: true, matches: true, highlights: true, teeTimes: true, follow: [] } },
    { uid: 'u2', name: '', email: '', hi: null, notify: { myGroup: false, leader: false, matches: true, highlights: false, teeTimes: true, follow: [] } },
    { uid: 'u3', name: '', email: '', hi: null, notify: { myGroup: false, leader: false, matches: false, highlights: false, teeTimes: true, follow: [pid] } },
  ];
  const tt = { ...t, memberUids: ['u1', 'u2', 'u3'] };
  const done = evs.find((e) => e.kind === 'roundDone')!;
  assert.deepEqual(N.recipients(tt, done, users).map((u) => u.uid), ['u3']); // scorer excluded, follower included
  const match = evs.find((e) => e.kind === 'match')!;
  assert.deepEqual(N.recipients(tt, match, users).map((u) => u.uid), ['u2', 'u3']);
  assert.equal(r3.id, 'r3');
});

test('tee time reminders use the tour time zone', async () => {
  const N = await import('../src/core/notify.ts');
  const at = N.zonedTime('2026-12-20', '08:00', 'Africa/Johannesburg');
  assert.equal(new Date(at).toISOString(), '2026-12-20T06:00:00.000Z');
  const t = { ...tour('sample-2024'), timezone: 'Africa/Johannesburg' };
  t.rounds = t.rounds.map((r, i) => ({ ...r, date: '2026-12-20', groups: i ? [] : [{ ...r.groups[0], teeTime: '08:00' }] }));
  const due = N.teeTimesDue(t, at - 31 * 60000, at - 29 * 60000);
  assert.equal(due.length, 1);
  assert.match(due[0].body, /30 minutes/);
});

test('WHS differentials and handicap index', async () => {
  const H = await import('../src/core/handicap.ts');
  const par = Array(18).fill(4);
  const si = Array.from({ length: 18 }, (_, i) => i + 1);
  // a 9 on a par 4 counts as net double bogey: 6 for a scratch player, 7 with a shot
  assert.equal(H.adjustedGross([9, ...Array(17).fill(4)], par, si, 0), 74);
  assert.equal(H.adjustedGross([9, ...Array(17).fill(4)], par, si, 1), 75);
  assert.equal(H.differential(85, 71.2, 128), 12.2);
  const recs = (ds: number[]) => ds.map((d, i) => ({ differential: d, date: `2026-01-${String(i + 1).padStart(2, '0')}`, at: i }));
  assert.equal(H.handicapIndex(recs([20, 18])), null);
  assert.equal(H.handicapIndex(recs([20, 18, 22])), 16); // lowest 1 minus 2
  assert.equal(H.handicapIndex(recs([10, 12, 14, 16, 18, 20])), 10); // avg lowest 2 minus 1
  const twenty = recs(Array.from({ length: 22 }, (_, i) => i + 1)); // newest 20 are 3..22
  assert.equal(H.handicapIndex(twenty), 6.5); // avg of 3..10
});

test('a finished card makes a round record with stats', async () => {
  const H = await import('../src/core/handicap.ts');
  const t = { ...tour('sample-2024') };
  t.players = t.players.map((p) => (p.id === 'p7' ? { ...p, uid: 'me' } : p));
  const M = E.model(t, data.scores);
  const s = data.scores[`${t.id}~r1~p7`];
  const recs = H.finishedRecords(t, undefined, s, M.chOf);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].gross, s.strokes.reduce((a: number, b) => a + (b ?? 0), 0));
  assert.equal(recs[0].estimated, true);
  assert.equal(H.finishedRecords(t, s, s, M.chOf).length, 0);
  const st = H.lifetimeStats(recs);
  assert.equal(st.rounds, 1);
  assert.equal(st.holes, 18);
});

test('hole stats, streaks, awards and the cut', async () => {
  const S = await import('../src/core/stats.ts');
  const par = Array(18).fill(4);
  const si = Array.from({ length: 18 }, (_, i) => i + 1);
  const r = { id: 'r', name: 'R', date: '2026-01-01', course: { name: 'X', tee: 'W', rating: null, slope: null, par, si }, groups: [] };
  // birdie birdie birdie, then bogey x4, a quad, the rest pars
  const strokes = [3, 3, 3, 5, 5, 5, 5, 8, ...Array(10).fill(4)];
  const putts = [1, 1, 1, 2, 3, 2, 2, 3, ...Array(10).fill(2)];
  const stats = [{ fw: 'hit' as const }, { fw: 'left' as const, sand: 1 }, { fw: 'right' as const, water: 1 }, null, null, null, null, { lost: 1, ob: 1 }, ...Array(10).fill(null)];
  const l = S.addCard(S.emptyLine(), r, strokes, putts, stats, 0);
  assert.equal(l.birdies, 3);
  assert.equal(l.birdieStreak, 3);
  assert.equal(l.bogeyStreak, 5);
  assert.equal(l.quads, 1);
  assert.equal(l.worstHole, 4);
  assert.equal(l.fwHoles, 3);
  assert.equal(l.fwHit, 1);
  assert.equal(S.penalties(l), 3);
  assert.equal(l.threePutts, 2);
  assert.equal(l.gir, 3 + 1 + 10); // birdies, the three-putt bogey, and pars with two putts
  const aw = S.awards([{ id: 'a', name: 'A', ids: ['a'], line: l }, { id: 'b', name: 'B', ids: ['b'], line: S.emptyLine() }]);
  assert.equal(aw.find((a) => a.id === 'quads')?.winners[0], 'A');
  assert.equal(S.cutPosition(16, { mode: 'percent', value: 50 }), 8);
  assert.equal(S.cutPosition(12, { mode: 'top', value: 65 }), 12);

  const rep = S.tourReport(tour('sample-2024'), data.scores);
  assert.equal(rep.players.length, 12);
  assert.equal(rep.teams.length, 2);
  assert.ok(rep.tour.holes > 500);
  assert.equal(S.tourReport(tour('sample-2024'), data.scores, 'r1').groups.length > 0, true);
});

test('par/bogey and eclectic', () => {
  const t = tour('sample-2024');
  const M = E.model(t, data.scores);
  const lb = E.leaderboard(M, { id: 'b', name: 'Bogey', type: 'bogey', basis: 'net', allowance: 100, rounds: [] });
  assert.ok(lb.rows[0].total! >= lb.rows[lb.rows.length - 1].total!);
  const ec = E.leaderboard(M, { id: 'e', name: 'Eclectic', type: 'eclectic', basis: 'net', allowance: 100, rounds: [] });
  const st = E.leaderboard(M, { id: 's', name: 'Stroke', type: 'stroke', basis: 'net', allowance: 100, rounds: [] });
  // the best of three rounds per hole can't be worse than any one round
  const best = Math.min(...st.rows[0].per.filter((p) => p.n === 18).map((p) => p.toPar!));
  assert.ok(ec.rows.find((r) => r.uid === st.rows[0].uid)!.total! <= best);
});

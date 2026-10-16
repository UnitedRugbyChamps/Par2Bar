import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import * as E from '@/core/engine';
import type { Comp, ScoreMap, Tour, TourEvent } from '@/core/types';
import { Avatar, Button, Card, Chip, Empty, H, Icon, List, P, Row } from '@/ui/kit';
import { C, S } from '@/ui/theme';
import { compLabel, fmtDate } from './helpers';

export const teamOf = (t: Tour, id?: string) => t.teams.find((x) => x.id === id);
const teamColor = (t: Tour, id?: string) => teamOf(t, id)?.color;

/** The value a leaderboard shows for one round. */
function roundValue(comp: Comp, l: E.RoundLine) {
  if (!l.n) return '–';
  if (comp.type === 'stableford') return comp.display === 'vs36' ? E.fmtRel(l.rel) : String(l.pts);
  return E.fmtRel(l.toPar);
}
function totalValue(comp: Comp, v: number | null) {
  if (v == null) return '–';
  if (comp.type === 'stableford' && comp.display !== 'vs36') return String(v);
  return E.fmtRel(v);
}

export function CompPicker({ tour, value, onChange }: { tour: Tour; value?: string; onChange: (id: string) => void }) {
  if (tour.comps.length < 2) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {tour.comps.map((c) => (
        <Chip key={c.id} label={c.name} on={c.id === value} onPress={() => onChange(c.id)} />
      ))}
    </View>
  );
}

export function Standings({ tour, scores, comp }: { tour: Tour; scores: ScoreMap; comp: Comp }) {
  const M = useMemo(() => E.model(tour, scores), [tour, scores]);
  if (comp.type === 'skins') return <Skins M={M} tour={tour} comp={comp} />;
  if (comp.type === 'match' || comp.type === 'nassau' || comp.type === 'lowhigh') return <HeadToHead M={M} tour={tour} comp={comp} />;
  const lb = E.leaderboard(M, comp);
  if (!lb.rounds.length) return <Empty icon="calendar-outline" title="No rounds yet">{<P sub center>Add a round to start scoring.</P>}</Empty>;
  if (!lb.rows.length) return <Empty icon="people-outline" title={comp.type === 'scramble' ? 'No scramble teams yet' : 'No players yet'} />;
  // the latest round anyone has scored in is "today"
  let cur = 0;
  lb.rounds.forEach((r, i) => {
    if (lb.rows.some((row) => row.per[i]?.n)) cur = i;
  });
  const hint = comp.type === 'stableford' ? (comp.display === 'vs36' ? 'vs 36 a round · lowest wins' : 'points · most wins') : `${comp.basis} to par`;
  return (
    <View style={{ gap: S.sm }}>
      <P sub style={{ fontSize: 13 }}>
        {compLabel(comp.type)} · {hint}
        {comp.allowance !== 100 ? ` · ${comp.allowance}% handicap` : ''}
      </P>
      <View style={st.table}>
        <View style={[st.tr, st.thead]}>
          <Text style={[st.th, st.pos]}>POS</Text>
          <Text style={[st.th, { flex: 1 }]}>{comp.type === 'scramble' ? 'TEAM' : 'PLAYER'}</Text>
          <Text style={[st.th, st.num]}>{lb.rounds.length > 1 ? `R${cur + 1}` : 'RND'}</Text>
          <Text style={[st.th, st.num]}>THRU</Text>
          <Text style={[st.th, st.num]}>TOT</Text>
        </View>
        {lb.rows.map((row) => {
          const l = row.per[cur];
          const thru = !l || l.skip ? '' : l.done ? 'F' : l.n ? String(l.n) : '–';
          const v = totalValue(comp, row.total);
          return (
            <Pressable
              key={row.uid}
              onPress={() => router.push(`/tour/${tour.id}/card?rid=${lb.rounds[cur].id}&uid=${row.uid}`)}
              style={({ pressed }) => [st.tr, pressed && { backgroundColor: C.bg }]}>
              <Text style={[st.td, st.pos, { fontWeight: '700' }]}>{row.pos ? `${row.tied ? 'T' : ''}${row.pos}` : ''}</Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {row.team && teamColor(tour, row.team) ? <View style={[st.dot, { backgroundColor: teamColor(tour, row.team) }]} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={[st.td, { fontWeight: '600' }]} numberOfLines={1}>
                    {row.name}
                  </Text>
                  {lb.rounds.length > 1 && (
                    <Text style={st.small} numberOfLines={1}>
                      {row.per.map((p, i) => (p.skip ? null : `R${i + 1} ${roundValue(comp, p)}`)).filter(Boolean).join('  ')}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={[st.td, st.num]}>{l && !l.skip ? roundValue(comp, l) : ''}</Text>
              <Text style={[st.td, st.num, { color: C.sub }]}>{thru}</Text>
              <Text style={[st.td, st.num, st.total, v.startsWith('−') && { color: C.under }]}>{v}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Skins({ M, tour, comp }: { M: E.Model; tour: Tour; comp: Comp }) {
  const sk = E.skins(M, comp);
  const won = sk.holes.filter((h) => h.uid);
  return (
    <View style={{ gap: S.sm }}>
      <P sub style={{ fontSize: 13 }}>
        Skins · {comp.basis} · {comp.carry ? 'ties carry over' : 'no carry-overs'}
      </P>
      <List>
        {sk.rows
          .filter((r) => r.total)
          .map((r) => (
            <Row key={r.uid} title={r.name} subtitle={won.filter((h) => h.uid === r.uid).map((h) => `R${h.ri + 1}·${h.hole}${h.value > 1 ? ` (${h.value})` : ''}`).join('  ')} right={String(r.total)} left={<Avatar name={r.name} color={teamColor(tour, r.team)} size={30} />} />
          ))}
        {!won.length && <Row title="No skins won yet" />}
      </List>
    </View>
  );
}

function HeadToHead({ M, tour, comp }: { M: E.Model; tour: Tour; comp: Comp }) {
  const games = E.headToHead(M, comp);
  if (!games.length) return <Empty icon="git-compare-outline" title="No pairings yet">{<P sub center>An organiser can add pairings under Manage, then Games.</P>}</Empty>;
  return (
    <List>
      {games.map((g) => {
        let status = '';
        if (g.match) status = g.match.thru ? (g.match.done ? (g.match.up === 0 ? 'Halved' : `${g.match.up > 0 ? 'A' : 'B'} won ${g.match.margin}`) : `${g.match.margin} thru ${g.match.thru}`) : 'Not started';
        if (g.nassau) status = ['front', 'back', 'total'].map((k) => `${k[0].toUpperCase()}${k.slice(1)} ${(g.nassau as any)[k].thru ? (g.nassau as any)[k].margin : '–'}`).join(' · ');
        if (g.lowHigh) status = `${g.lowHigh.pa} – ${g.lowHigh.pb} pts · thru ${g.lowHigh.thru}`;
        return <Row key={g.i} title={`${g.names.a}  v  ${g.names.b}`} subtitle={`${g.r.name} · ${status}`} />;
      })}
    </List>
  );
}

export function CupView({ tour, scores }: { tour: Tour; scores: ScoreMap }) {
  const M = useMemo(() => E.model(tour, scores), [tour, scores]);
  const c = E.cup(M);
  if (!c || !tour.cup) return <Empty icon="flag-outline" title="No team cup set up" />;
  const A = teamOf(tour, c.teamA),
    B = teamOf(tour, c.teamB);
  const fmt = (n: number) => (n % 1 ? `${Math.floor(n)}½` : String(n));
  return (
    <View style={{ gap: S.md }}>
      <Card style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.sub, letterSpacing: 1 }}>{tour.cup.name.toUpperCase()}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.lg }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={[st.cupScore, { color: A?.color }]}>{fmt(c.a)}</Text>
            <Text style={st.cupTeam}>{A?.name}</Text>
          </View>
          <Text style={{ fontSize: 22, color: C.faint }}>–</Text>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={[st.cupScore, { color: B?.color }]}>{fmt(c.b)}</Text>
            <Text style={st.cupTeam}>{B?.name}</Text>
          </View>
        </View>
        <P sub style={{ fontSize: 13 }}>
          {c.a >= c.need ? `${A?.name} win the cup` : c.b >= c.need ? `${B?.name} win the cup` : `Projected ${fmt(c.projA)} – ${fmt(c.projB)} · ${fmt(c.need)} to win`}
        </P>
      </Card>
      {tour.cup.sessions.map((s, si) => {
        const r = tour.rounds.find((x) => x.id === s.rid);
        const ms = c.matches.filter((m) => m.si === si);
        return (
          <View key={s.id} style={{ gap: S.sm }}>
            <H>
              {r?.name ?? 'Round'} · {s.format === 'fourball' ? 'Fourballs' : s.format === 'foursomes' ? 'Foursomes' : 'Singles'}
            </H>
            <View style={st.table}>
              {ms.map((m) => {
                const lead = m.lead === 'a' ? A : m.lead === 'b' ? B : null;
                const label = !m.st.thru ? '–' : m.st.done ? (m.lead ? (m.st.margin === '1 UP' ? '1 UP' : m.st.margin) : 'HALVED') : `${m.st.margin === 'A/S' ? 'A/S' : m.st.margin}`;
                return (
                  <View key={m.mi} style={[st.tr, { paddingVertical: 10 }]}>
                    <Text style={[st.td, { flex: 1, textAlign: 'right', fontWeight: m.lead === 'a' ? '800' : '500', color: m.lead === 'a' ? A?.color : C.ink }]} numberOfLines={2}>
                      {m.names.a}
                    </Text>
                    <View style={[st.matchPill, { backgroundColor: lead?.color ?? (m.st.thru ? C.faint : C.line) }]}>
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{label}</Text>
                      {m.st.thru > 0 && !m.st.done && <Text style={{ color: '#fff', fontSize: 10 }}>thru {m.st.thru}</Text>}
                      {m.st.done && <Text style={{ color: '#fff', fontSize: 10 }}>final</Text>}
                    </View>
                    <Text style={[st.td, { flex: 1, fontWeight: m.lead === 'b' ? '800' : '500', color: m.lead === 'b' ? B?.color : C.ink }]} numberOfLines={2}>
                      {m.names.b}
                    </Text>
                  </View>
                );
              })}
              {!ms.length && <Row title="No matches drawn yet" />}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function TeeSheet({ tour, canScore }: { tour: Tour; canScore: boolean }) {
  if (!tour.rounds.length) return <Empty icon="time-outline" title="No rounds yet" />;
  const name = (id: string) => tour.players.find((p) => p.id === id)?.name ?? '?';
  return (
    <View style={{ gap: S.md }}>
      {tour.rounds.map((r) => (
        <View key={r.id} style={{ gap: S.sm }}>
          <H>
            {r.name} · {fmtDate(r.date, { weekday: 'short', day: 'numeric', month: 'short' })}
          </H>
          <P sub>
            {r.course.name || 'Course to be set'}
            {r.course.tee ? ` · ${r.course.tee} tees` : ''}
          </P>
          {r.groups.map((g, gi) => (
            <Card key={g.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                <Icon name="time-outline" color={C.brand} />
                <Text style={{ fontWeight: '800', fontSize: 17, color: C.ink, flex: 1 }}>
                  {g.teeTime || `Group ${gi + 1}`}
                  {g.startHole !== 1 ? `  · hole ${g.startHole}` : ''}
                </Text>
                {canScore && <Button small title="Score" icon="create-outline" onPress={() => router.push(`/tour/${tour.id}/score?rid=${r.id}&gid=${g.id}`)} />}
              </View>
              <P>{g.ids.map(name).join(', ')}</P>
            </Card>
          ))}
          {!r.groups.length && <P sub>Groups and tee times not set yet.</P>}
        </View>
      ))}
    </View>
  );
}

const EVENT_ICONS: Record<TourEvent['kind'], { icon: any; color: string }> = {
  leader: { icon: 'trophy', color: C.accent },
  match: { icon: 'flag', color: C.brand },
  highlight: { icon: 'sparkles', color: C.under },
  score: { icon: 'create', color: C.sub },
  roundDone: { icon: 'checkmark-done', color: C.brand },
  teetime: { icon: 'time', color: C.over },
};

export function Feed({ events }: { events: TourEvent[] }) {
  const [now] = useState(() => Date.now());
  if (!events.length) return <Empty icon="chatbubbles-outline" title="Nothing yet">{<P sub center>Birdies, lead changes and match results show up here as scores come in.</P>}</Empty>;
  return (
    <List>
      {events.map((e) => {
        const ic = EVENT_ICONS[e.kind];
        const ago = Math.round((now - e.at) / 60000);
        const when = ago < 1 ? 'now' : ago < 60 ? `${ago}m` : ago < 1440 ? `${Math.round(ago / 60)}h` : fmtDate(new Date(e.at).toISOString().slice(0, 10));
        return <Row key={e.id} left={<Icon name={ic.icon} color={ic.color} />} title={e.title} subtitle={e.body} right={<Text style={st.small}>{when}</Text>} />;
      })}
    </List>
  );
}

const st = StyleSheet.create({
  table: { backgroundColor: C.card, borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  thead: { backgroundColor: C.brand },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.md, paddingVertical: 9, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  th: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  td: { fontSize: 15, color: C.ink },
  pos: { width: 34 },
  num: { width: 44, textAlign: 'center', fontVariant: ['tabular-nums'] },
  total: { fontWeight: '800', fontSize: 16 },
  small: { fontSize: 11, color: C.sub },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cupScore: { fontSize: 48, fontWeight: '900', fontVariant: ['tabular-nums'] },
  cupTeam: { fontSize: 14, fontWeight: '700', color: C.ink },
  matchPill: { minWidth: 76, alignItems: 'center', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 6 },
});

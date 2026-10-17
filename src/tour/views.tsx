import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import * as E from '@/core/engine';
import type { Comp, ScoreMap, Tour, TourEvent } from '@/core/types';
import { Avatar, Button, Card, Chip, Display, Empty, H, Icon, Label, List, Num, P, Row } from '@/ui/kit';
import { C, F, R, S, shadow } from '@/ui/theme';
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
              style={({ pressed }) => [st.tr, row.pos === 1 && st.leadRow, pressed && { backgroundColor: C.soft }]}>
              {row.pos === 1 && <View style={st.leadBar} />}
              <Text style={[st.td, st.pos, { fontFamily: F.heavy }]}>{row.pos ? `${row.tied ? 'T' : ''}${row.pos}` : ''}</Text>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {row.team && teamColor(tour, row.team) ? <View style={[st.dot, { backgroundColor: teamColor(tour, row.team) }]} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={[st.td, { fontFamily: F.semi }]} numberOfLines={1}>
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
      <View style={[{ backgroundColor: C.ink, borderRadius: R.lg, padding: S.xl, alignItems: 'center', gap: S.sm }, shadow]}>
        <Label color={C.champagne}>{tour.cup.name}</Label>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.lg }}>
          <View style={{ alignItems: 'center', flex: 1, gap: 2 }}>
            <Num size={56} color={C.white}>
              {fmt(c.a)}
            </Num>
            <Display size={13} color={C.white}>
              {A?.name}
            </Display>
          </View>
          <Text style={{ fontSize: 22, color: '#444', fontFamily: F.display }}>/</Text>
          <View style={{ alignItems: 'center', flex: 1, gap: 2 }}>
            <Num size={56} color={C.champagne}>
              {fmt(c.b)}
            </Num>
            <Display size={13} color={C.champagne}>
              {B?.name}
            </Display>
          </View>
        </View>
        <View style={{ flexDirection: 'row', height: 4, alignSelf: 'stretch', borderRadius: 2, overflow: 'hidden', backgroundColor: '#2A2A28', marginTop: S.sm }}>
          <View style={{ flex: c.projA || 0.0001, backgroundColor: C.white }} />
          <View style={{ flex: Math.max(0, c.avail - c.projA - c.projB) || 0.0001 }} />
          <View style={{ flex: c.projB || 0.0001, backgroundColor: C.champagne }} />
        </View>
        <Text style={{ color: C.faint, fontFamily: F.medium, fontSize: 12 }}>
          {c.a >= c.need ? `${A?.name} win the cup` : c.b >= c.need ? `${B?.name} win the cup` : `Projected ${fmt(c.projA)} – ${fmt(c.projB)} · ${fmt(c.need)} to win`}
        </Text>
      </View>
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
                const label = !m.st.thru ? '–' : m.st.done ? (m.lead ? (m.st.margin === '1 UP' ? '1 UP' : m.st.margin) : 'HALVED') : `${m.st.margin === 'A/S' ? 'A/S' : m.st.margin}`;
                return (
                  <View key={m.mi} style={[st.tr, { paddingVertical: 10 }]}>
                    <Text style={[st.td, { flex: 1, textAlign: 'right', fontFamily: m.lead === 'a' ? F.heavy : F.medium, color: C.ink }]} numberOfLines={2}>
                      {m.names.a}
                    </Text>
                    <View style={[st.matchPill, { backgroundColor: m.lead === 'a' ? C.ink : m.lead === 'b' ? C.champagne : m.st.thru ? C.soft : C.bg }]}>
                      <Text style={{ color: m.lead === 'a' ? C.white : C.ink, fontFamily: F.heavy, fontSize: 13 }}>{label}</Text>
                      {m.st.thru > 0 && !m.st.done && <Text style={{ color: m.lead === 'a' ? C.faint : C.sub, fontSize: 10, fontFamily: F.medium }}>thru {m.st.thru}</Text>}
                      {m.st.done && <Text style={{ color: m.lead === 'a' ? C.faint : C.sub, fontSize: 10, fontFamily: F.medium }}>final</Text>}
                    </View>
                    <Text style={[st.td, { flex: 1, fontFamily: m.lead === 'b' ? F.heavy : F.medium, color: C.ink }]} numberOfLines={2}>
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
                <Text style={{ fontFamily: F.heavy, fontSize: 22, color: C.ink, flex: 1, fontVariant: ['tabular-nums'] }}>
                  {g.teeTime || `Group ${gi + 1}`}
                  {g.startHole !== 1 ? `  · hole ${g.startHole}` : ''}
                </Text>
                {canScore && <Button small title="Score" icon="create-outline" onPress={() => router.push(`/tour/${tour.id}/score?rid=${r.id}&gid=${g.id}`)} />}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {g.ids.map((pid) => (
                  <View key={pid} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.soft, borderRadius: R.pill, paddingRight: 10, padding: 2 }}>
                    <Avatar name={name(pid)} size={22} />
                    <Text style={{ fontFamily: F.semi, fontSize: 13, color: C.ink }}>{name(pid)}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ))}
          {!r.groups.length && <P sub>Groups and tee times not set yet.</P>}
        </View>
      ))}
    </View>
  );
}

const EVENT_ICONS: Record<TourEvent['kind'], { icon: any; color: string }> = {
  leader: { icon: 'trophy', color: C.champagne },
  match: { icon: 'flag', color: C.white },
  highlight: { icon: 'sparkles', color: C.champagne },
  score: { icon: 'create', color: C.faint },
  roundDone: { icon: 'checkmark-done', color: C.white },
  teetime: { icon: 'time', color: C.white },
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
        return <Row key={e.id} left={
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={ic.icon} color={ic.color} size={16} />
              </View>
            } title={e.title} subtitle={e.body} right={<Text style={st.small}>{when}</Text>} />;
      })}
    </List>
  );
}

const st = StyleSheet.create({
  table: { backgroundColor: C.card, borderRadius: R.lg, overflow: 'hidden', ...shadow },
  thead: { backgroundColor: C.ink },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.md, paddingVertical: 11, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  leadRow: { backgroundColor: '#FBF8F1' },
  leadBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: C.champagne },
  th: { color: C.white, fontSize: 10, fontFamily: F.bold, letterSpacing: 1.4 },
  td: { fontSize: 15, color: C.ink, fontFamily: F.medium },
  pos: { width: 34 },
  num: { width: 44, textAlign: 'center', fontVariant: ['tabular-nums'] },
  total: { fontFamily: F.heavy, fontSize: 17 },
  small: { fontSize: 11, color: C.sub, fontFamily: F.body },
  dot: { width: 8, height: 8, borderRadius: 4 },
  matchPill: { minWidth: 76, alignItems: 'center', borderRadius: R.pill, paddingVertical: 5, paddingHorizontal: 8 },
});

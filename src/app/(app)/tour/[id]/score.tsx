import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { backend } from '@/backend';
import * as E from '@/core/engine';
import { mainComp } from '@/core/notify';
import { scoreKey, type Group, type Round, type ScoreMap, type Tour } from '@/core/types';
import { useMe, useTour } from '@/state/session';
import { teamOf } from '@/tour/views';
import { Avatar, Button, Empty, Icon, Loading, P, Screen } from '@/ui/kit';
import { scoreColor } from '@/ui/score';
import { C, R, S } from '@/ui/theme';

export default function ScoreEntry() {
  const { id, rid, gid } = useLocalSearchParams<{ id: string; rid: string; gid: string }>();
  const { tour, scores, scoresReady } = useTour(id);
  if (!tour || !scoresReady) return <Loading />;
  const round = tour.rounds.find((r) => r.id === rid);
  const group = round?.groups.find((g) => g.id === gid);
  if (!round || !group)
    return (
      <Screen>
        <Empty icon="alert-circle-outline" title="Group not found" />
      </Screen>
    );
  if (!round.course.name)
    return (
      <Screen>
        <Empty icon="flag-outline" title="This round has no course yet">
          <P sub center>
            An organiser needs to pick the course and tee first.
          </P>
        </Empty>
      </Screen>
    );
  return <ScoreForm key={`${rid}~${gid}`} tour={tour} scores={scores} round={round} group={group} />;
}

function ScoreForm({ tour, scores, round, group }: { tour: Tour; scores: ScoreMap; round: Round; group: Group }) {
  const me = useMe();
  const M = useMemo(() => E.model(tour, scores), [tour, scores]);
  const units = useMemo(() => [...new Set(group.ids.map((p) => M.ballOf(round, p)))], [M, round, group]);
  // taps show instantly; the saved card catches up from the backend
  const [edits, setEdits] = useState<Record<string, (number | null)[]>>({});
  const cardOf = (u: string) => edits[u] ?? scores[scoreKey(tour.id, round.id, u)]?.strokes ?? Array(18).fill(null);
  const order = useMemo(() => {
    const start = (group.startHole ?? 1) - 1;
    return Array.from({ length: 18 }, (_, i) => (start + i) % 18);
  }, [group]);
  const [pos, setPos] = useState(() => {
    const first = order.findIndex((h) => units.some((u) => !scores[scoreKey(tour.id, round.id, u)]?.strokes?.[h]));
    return first < 0 ? 17 : first;
  });

  const hole = order[pos];
  const par = round.course.par[hole];
  const si = round.course.si[hole];
  const comp = mainComp(tour);
  const allow = (comp?.allowance ?? 100) / 100;

  const set = (u: string, v: number | null) => {
    const next = [...cardOf(u)];
    next[hole] = v;
    setEdits((c) => ({ ...c, [u]: next }));
    const prev = scores[scoreKey(tour.id, round.id, u)];
    backend.saveScore({ tourId: tour.id, rid: round.id, unitId: u, strokes: next, putts: prev?.putts ?? Array(18).fill(null), updatedBy: me.uid });
  };
  const holeDone = (h: number) => units.every((u) => cardOf(u)[h]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: `${round.name} · ${group.teeTime || 'Group'}` }} />
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md }}>
        <View style={st.holeCard}>
          <Text style={st.holeLabel}>HOLE</Text>
          <Text style={st.holeNo}>{hole + 1}</Text>
          <Text style={st.holeMeta}>
            Par {par} · Stroke index {si}
          </Text>
          <Text style={[st.holeMeta, { opacity: 0.7 }]}>{round.course.name}</Text>
        </View>

        {units.map((u) => {
          const unit = M.unitOf(round, u)!;
          const h = Math.round(M.hcpOf(round, u) * allow);
          const strokes = E.shots(h, si);
          const g = cardOf(u)[hole] ?? null;
          const pts = E.points(g, par, si, h);
          const line = E.roundLine(M, round, u, comp);
          const team = teamOf(tour, unit.team);
          return (
            <View key={u} style={st.unit}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                <Avatar name={unit.name} color={team?.color} size={32} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }} numberOfLines={1}>
                    {unit.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.sub }}>
                    Plays off {h} · {strokes > 0 ? `${'●'.repeat(strokes)} gets ${strokes}` : strokes < 0 ? `gives ${-strokes}` : 'no shot'}
                    {line.n ? ` · ${line.pts} pts thru ${line.n}` : ''}
                  </Text>
                </View>
                {g ? (
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.brand }}>
                    {pts} pt{pts === 1 ? '' : 's'}
                  </Text>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Pressable style={st.step} onPress={() => set(u, g && g > 1 ? g - 1 : null)}>
                  <Icon name="remove" />
                </Pressable>
                {[par - 1, par, par + 1, par + 2, par + 3].map((v) => {
                  const col = scoreColor(v, par);
                  const on = g === v;
                  return (
                    <Pressable key={v} onPress={() => set(u, v)} style={[st.num, on && { backgroundColor: col.bg === C.card ? C.brand : col.bg, borderColor: 'transparent' }]}>
                      <Text style={[st.numText, on && { color: col.bg === C.card ? '#fff' : col.fg }]}>{v}</Text>
                    </Pressable>
                  );
                })}
                <Pressable style={st.step} onPress={() => set(u, (g ?? par) + (g ? 1 : 0))}>
                  <Icon name="add" />
                </Pressable>
              </View>
              {g != null && (g < par - 1 || g > par + 3) && <Text style={{ textAlign: 'center', fontWeight: '800', fontSize: 18, color: C.ink }}>{g}</Text>}
            </View>
          );
        })}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {order.map((h, i) => (
            <Pressable key={h} onPress={() => setPos(i)} style={[st.dot, holeDone(h) && { backgroundColor: C.brandSoft, borderColor: C.brand }, i === pos && { backgroundColor: C.brand, borderColor: C.brand }]}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: i === pos ? '#fff' : C.ink }}>{h + 1}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={st.footer}>
        <View style={{ flex: 1 }}>
          <Button title="Previous" kind="secondary" icon="chevron-back" disabled={pos === 0} onPress={() => setPos(pos - 1)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title={pos === 17 ? 'Finish' : 'Next hole'} onPress={() => (pos === 17 ? router.back() : setPos(pos + 1))} />
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  holeCard: { backgroundColor: C.brand, borderRadius: R.lg, padding: S.lg, alignItems: 'center' },
  holeLabel: { color: C.accent, fontWeight: '800', letterSpacing: 2, fontSize: 12 },
  holeNo: { color: '#fff', fontSize: 56, fontWeight: '900', lineHeight: 62 },
  holeMeta: { color: '#fff', fontSize: 15, fontWeight: '600' },
  unit: { backgroundColor: C.card, borderRadius: R.lg, padding: S.md, gap: S.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  step: { width: 40, height: 44, borderRadius: R.sm, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  num: { flex: 1, height: 44, borderRadius: R.sm, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 18, fontWeight: '800', color: C.ink },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: S.sm, padding: S.md, paddingBottom: S.xl, backgroundColor: C.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
});

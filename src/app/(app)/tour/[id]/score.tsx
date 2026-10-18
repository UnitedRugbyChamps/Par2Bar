import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { backend } from '@/backend';
import * as E from '@/core/engine';
import { mainComp } from '@/core/notify';
import { scoreKey, type Fairway, type Group, type HoleStat, type Round, type ScoreMap, type Tour } from '@/core/types';
import { ScoreMark } from '@/social/ScoreCard';
import { useMe, useTour } from '@/state/session';
import { teamOf } from '@/tour/views';
import { Avatar, Button, Empty, Icon, Loading, P, Screen, type IconName } from '@/ui/kit';
import { C, F, R, S, shadow } from '@/ui/theme';

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
  const [edits, setEdits] = useState<Record<string, Card>>({});
  const [detail, setDetail] = useState(false);
  const savedOf = (u: string): Card => {
    const s = scores[scoreKey(tour.id, round.id, u)];
    return { strokes: s?.strokes ?? Array(18).fill(null), putts: s?.putts ?? Array(18).fill(null), stats: s?.stats ?? Array(18).fill(null) };
  };
  const fullOf = (u: string) => edits[u] ?? savedOf(u);
  const cardOf = (u: string) => fullOf(u).strokes;
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

  const write = (u: string, next: Card) => {
    setEdits((c) => ({ ...c, [u]: next }));
    backend.saveScore({ tourId: tour.id, rid: round.id, unitId: u, ...next, updatedBy: me.uid });
  };
  const at = <T,>(a: T[], v: T) => a.map((x, i) => (i === hole ? v : x));
  const set = (u: string, v: number | null) => write(u, { ...fullOf(u), strokes: at(fullOf(u).strokes, v) });
  const setPutts = (u: string, v: number | null) => write(u, { ...fullOf(u), putts: at(fullOf(u).putts, v) });
  const setStat = (u: string, p: Partial<HoleStat>) => {
    const cur = fullOf(u);
    write(u, { ...cur, stats: at(cur.stats, { ...(cur.stats[hole] ?? {}), ...p }) });
  };
  const holeDone = (h: number) => units.every((u) => cardOf(u)[h]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: `${round.name} · ${group.teeTime || 'Group'}` }} />
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md }}>
        <View style={st.holeCard}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={st.holeLabel}>HOLE</Text>
            <Text style={st.holeNo}>{hole + 1}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: S.lg }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={st.metaNum}>{par}</Text>
                <Text style={st.metaLab}>PAR</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={st.metaNum}>{si}</Text>
                <Text style={st.metaLab}>S.I.</Text>
              </View>
            </View>
            <Text style={st.holeMeta} numberOfLines={1}>
              {round.course.name}
            </Text>
          </View>
        </View>
        <Pressable onPress={() => setDetail(!detail)} style={st.detailToggle}>
          <Icon name={detail ? 'stats-chart' : 'stats-chart-outline'} size={16} />
          <Text style={{ flex: 1, fontFamily: F.semi, fontSize: 13, color: C.ink }}>Hole stats: putts, fairways, sand and penalties</Text>
          <Switch value={detail} onValueChange={setDetail} trackColor={{ true: C.ink, false: C.line }} thumbColor={C.white} {...webSwitch} />
        </Pressable>

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
                <Avatar name={unit.name} color={team?.color === C.ink ? C.ink : C.charcoal} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontFamily: F.bold, color: C.ink }} numberOfLines={1}>
                    {unit.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: C.sub, fontFamily: F.body }}>
                    Plays off {h} · {strokes > 0 ? `${'●'.repeat(strokes)} gets ${strokes}` : strokes < 0 ? `gives ${-strokes}` : 'no shot'}
                    {line.n ? ` · ${line.pts} pts thru ${line.n}` : ''}
                  </Text>
                </View>
                {g ? (
                  <Text style={{ fontSize: 13, fontFamily: F.heavy, color: C.ink }}>
                    {pts} pt{pts === 1 ? '' : 's'}
                  </Text>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Pressable style={st.step} onPress={() => set(u, g && g > 1 ? g - 1 : null)}>
                  <Icon name="remove" />
                </Pressable>
                {[par - 1, par, par + 1, par + 2, par + 3].map((v) => {
                  const on = g === v;
                  return (
                    <Pressable key={v} onPress={() => set(u, v)} style={[st.num, on && { backgroundColor: C.ink, borderColor: C.ink }]}>
                      <Text style={[st.numText, on && { color: C.white }]}>{v}</Text>
                      <Text style={[st.numLab, on && { color: C.champagne }]}>{NAMES[v - par + 1]}</Text>
                    </Pressable>
                  );
                })}
                <Pressable style={st.step} onPress={() => set(u, (g ?? par) + (g ? 1 : 0))}>
                  <Icon name="add" />
                </Pressable>
              </View>
              {detail && g ? <HoleDetail par={par} putts={fullOf(u).putts[hole]} stat={fullOf(u).stats[hole]} setPutts={(v) => setPutts(u, v)} setStat={(p) => setStat(u, p)} /> : null}
              {g != null && (g < par - 1 || g > par + 3) && <View style={{ alignItems: 'center' }}>
                  <ScoreMark g={g} par={par} size={34} />
                </View>}
            </View>
          );
        })}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {order.map((h, i) => (
            <Pressable key={h} onPress={() => setPos(i)} style={[st.dot, holeDone(h) && { backgroundColor: C.soft, borderColor: C.ink }, i === pos && { backgroundColor: C.ink, borderColor: C.ink }]}>
              <Text style={{ fontSize: 12, fontFamily: F.bold, color: i === pos ? C.white : C.ink }}>{h + 1}</Text>
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

type Card = { strokes: (number | null)[]; putts: (number | null)[]; stats: (HoleStat | null)[] };
const webSwitch = (Platform.OS === 'web' ? { activeThumbColor: C.white, activeTrackColor: C.ink } : {}) as object;

const FAIRWAY: { v: Fairway; label: string; icon: IconName }[] = [
  { v: 'left', label: 'Left', icon: 'arrow-back' },
  { v: 'hit', label: 'Fairway', icon: 'arrow-up' },
  { v: 'right', label: 'Right', icon: 'arrow-forward' },
  { v: 'short', label: 'Short', icon: 'arrow-down' },
];
const TROUBLE: { k: 'sand' | 'water' | 'ob' | 'lost' | 'pen'; label: string }[] = [
  { k: 'sand', label: 'Sand' },
  { k: 'water', label: 'Water' },
  { k: 'ob', label: 'OB' },
  { k: 'lost', label: 'Lost ball' },
  { k: 'pen', label: 'Other penalty' },
];

/** Optional detail for one player on one hole. */
function HoleDetail({ par, putts, stat, setPutts, setStat }: { par: number; putts: number | null; stat: HoleStat | null; setPutts: (v: number | null) => void; setStat: (p: Partial<HoleStat>) => void }) {
  return (
    <View style={st.detail}>
      <View style={st.detailRow}>
        <Text style={st.detailLab}>PUTTS</Text>
        <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
          {[0, 1, 2, 3, 4].map((n) => (
            <Pressable key={n} onPress={() => setPutts(putts === n ? null : n)} style={[st.pill, putts === n && st.pillOn]}>
              <Text style={[st.pillText, putts === n && { color: C.white }]}>{n === 4 ? '4+' : n}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {par >= 4 && (
        <View style={st.detailRow}>
          <Text style={st.detailLab}>TEE SHOT</Text>
          <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
            {FAIRWAY.map((f) => {
              const on = stat?.fw === f.v;
              return (
                <Pressable key={f.v} onPress={() => setStat({ fw: on ? null : f.v })} style={[st.pill, { flex: 1 }, on && st.pillOn]}>
                  <Icon name={f.icon} size={13} color={on ? C.white : C.ink} />
                  <Text style={[st.pillText, { fontSize: 11 }, on && { color: C.white }]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {TROUBLE.map((t) => {
          const n = stat?.[t.k] ?? 0;
          return (
            <View key={t.k} style={[st.counter, n > 0 && { borderColor: C.ink }]}>
              <Pressable hitSlop={6} onPress={() => setStat({ [t.k]: Math.max(0, n - 1) })} disabled={!n}>
                <Icon name="remove" size={14} color={n ? C.ink : C.faint} />
              </Pressable>
              <Text style={[st.pillText, { fontSize: 12 }]}>
                {t.label}
                {n ? ` ${n}` : ''}
              </Text>
              <Pressable hitSlop={6} onPress={() => setStat({ [t.k]: n + 1 })}>
                <Icon name="add" size={14} />
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const NAMES = ['BIRDIE', 'PAR', 'BOGEY', 'DOUBLE', 'TRIPLE'];

const st = StyleSheet.create({
  holeCard: { backgroundColor: C.ink, borderRadius: R.lg, padding: S.xl, flexDirection: 'row', alignItems: 'flex-end', ...shadow },
  holeLabel: { color: C.champagne, fontFamily: F.semi, letterSpacing: 4, fontSize: 11 },
  holeNo: { color: C.white, fontSize: 84, fontFamily: F.display, lineHeight: 88, letterSpacing: -2 },
  metaNum: { color: C.white, fontSize: 28, fontFamily: F.heavy, fontVariant: ['tabular-nums'] },
  metaLab: { color: C.faint, fontSize: 9, fontFamily: F.semi, letterSpacing: 1.5 },
  holeMeta: { color: C.faint, fontSize: 12, fontFamily: F.medium, maxWidth: 170 },
  unit: { backgroundColor: C.card, borderRadius: R.lg, padding: S.md, gap: S.md, ...shadow },
  step: { width: 40, height: 52, borderRadius: R.md, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  num: { flex: 1, height: 52, borderRadius: R.md, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', gap: 1 },
  numText: { fontSize: 19, fontFamily: F.heavy, color: C.ink },
  numLab: { fontSize: 7.5, fontFamily: F.semi, color: C.faint, letterSpacing: 0.6 },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  detailToggle: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.card, borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: 8, ...shadow },
  detail: { gap: S.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, paddingTop: S.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  detailLab: { width: 62, fontSize: 9, fontFamily: F.bold, letterSpacing: 1.2, color: C.sub },
  pill: { minWidth: 36, height: 34, paddingHorizontal: 8, borderRadius: R.pill, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  pillOn: { backgroundColor: C.ink, borderColor: C.ink },
  pillText: { fontFamily: F.bold, fontSize: 14, color: C.ink },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: R.pill, borderWidth: 1, borderColor: C.line, paddingHorizontal: 10, height: 32 },
  footer: { flexDirection: 'row', gap: S.sm, padding: S.md, paddingBottom: S.xl, backgroundColor: C.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
});

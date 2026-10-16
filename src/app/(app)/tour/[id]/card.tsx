import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import * as E from '@/core/engine';
import { mainComp } from '@/core/notify';
import { useTour } from '@/state/session';
import { Chip, Empty, Loading, P, Screen, Title } from '@/ui/kit';
import { C, S } from '@/ui/theme';
import { scoreColor } from '@/ui/score';

export default function ScoreCard() {
  const { id, rid, uid } = useLocalSearchParams<{ id: string; rid: string; uid: string }>();
  const { tour, scores } = useTour(id);
  const [roundId, setRoundId] = useState(rid);
  const M = useMemo(() => (tour ? E.model(tour, scores) : null), [tour, scores]);
  if (!tour || !M) return <Loading />;
  const round = tour.rounds.find((r) => r.id === roundId) ?? tour.rounds[0];
  if (!round) return <Empty icon="alert-circle-outline" title="No rounds" />;
  // a player in a team ball that day is shown on the team's card
  const unitId = M.pm[uid] ? M.ballOf(round, uid) : uid;
  const unit = M.unitOf(round, unitId);
  const comp = mainComp(tour);
  const line = E.roundLine(M, round, unitId, comp);
  const st = M.strokes(round, unitId);
  const c = round.course;
  const pts = st.map((g, i) => E.points(g, c.par[i], c.si[i], line.h));
  const part = (from: number, to: number, a: (number | null)[]) => {
    const v = a.slice(from, to).filter((x): x is number => x != null);
    return v.length ? v.reduce((x, y) => x + y, 0) : '';
  };
  const cols = [...Array(9).keys(), 'OUT', ...Array.from({ length: 9 }, (_, i) => i + 9), 'IN', 'TOT'] as (number | string)[];
  const cell = (row: (number | null)[], k: number | string) =>
    k === 'OUT' ? part(0, 9, row) : k === 'IN' ? part(9, 18, row) : k === 'TOT' ? part(0, 18, row) : (row[k as number] ?? '');

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Scorecard' }} />
      <Title>{unit?.name ?? 'Card'}</Title>
      <P sub>
        {round.name} · {c.name}
        {c.tee ? ` · ${c.tee}` : ''} · plays off {line.h}
      </P>
      {tour.rounds.length > 1 && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {tour.rounds.map((r) => (
            <Chip key={r.id} label={r.name} on={r.id === round.id} onPress={() => setRoundId(r.id)} />
          ))}
        </View>
      )}
      <ScrollView horizontal style={sty.wrap}>
        <View>
          {[
            ['HOLE', cols.map((k) => (typeof k === 'number' ? k + 1 : k))],
            ['PAR', cols.map((k) => cell(c.par, k))],
            ['SI', cols.map((k) => (typeof k === 'number' ? c.si[k] : ''))],
          ].map(([label, vals]) => (
            <View key={label as string} style={[sty.tr, label === 'HOLE' && { backgroundColor: C.brand }]}>
              <Text style={[sty.label, label === 'HOLE' && { color: '#fff' }]}>{label as string}</Text>
              {(vals as (string | number)[]).map((v, i) => (
                <Text key={i} style={[sty.td, typeof cols[i] === 'string' && sty.sum, label === 'HOLE' && { color: '#fff', fontWeight: '800' }]}>
                  {v}
                </Text>
              ))}
            </View>
          ))}
          <View style={sty.tr}>
            <Text style={sty.label}>SCORE</Text>
            {cols.map((k, i) => {
              if (typeof k === 'string') return <Text key={i} style={[sty.td, sty.sum]}>{cell(st, k)}</Text>;
              const col = scoreColor(st[k], c.par[k]);
              return (
                <View key={i} style={sty.tdBox}>
                  <View style={[sty.score, { backgroundColor: st[k] ? col.bg : 'transparent' }]}>
                    <Text style={{ color: col.fg, fontWeight: '800' }}>{st[k] ?? ''}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={sty.tr}>
            <Text style={sty.label}>PTS</Text>
            {cols.map((k, i) => (
              <Text key={i} style={[sty.td, typeof k === 'string' && sty.sum, { color: C.brand }]}>
                {cell(pts, k)}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
      <P sub style={{ fontSize: 13 }}>
        {line.n ? `${line.gross} gross · ${E.fmtRel(line.toPar)} net · ${line.pts} Stableford points` : 'No scores yet'}
      </P>
    </Screen>
  );
}

const W = 34;
const sty = StyleSheet.create({
  wrap: { backgroundColor: C.card, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, minHeight: 36 },
  label: { width: 56, paddingLeft: S.sm, fontSize: 11, fontWeight: '800', color: C.sub },
  td: { width: W, textAlign: 'center', fontSize: 14, color: C.ink, fontVariant: ['tabular-nums'] },
  tdBox: { width: W, alignItems: 'center' },
  sum: { width: W + 8, fontWeight: '800', backgroundColor: C.bg, paddingVertical: 9 },
  score: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});

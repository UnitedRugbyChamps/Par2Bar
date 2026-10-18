import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import * as E from '@/core/engine';
import { mainComp } from '@/core/notify';
import { addCard, emptyLine } from '@/core/stats';
import { RoundStats } from '@/social/RoundStats';
import { ScoreCard } from '@/social/ScoreCard';
import { useTour } from '@/state/session';
import { Avatar, Card, Chip, Display, Empty, Label, Loading, Num, Screen } from '@/ui/kit';
import { C, F, S } from '@/ui/theme';

export default function TourScoreCard() {
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
  const card = M.card(round.id, unitId);
  const pts = st.map((g, i) => E.points(g, c.par[i], c.si[i], line.h));

  return (
    <Screen>
      <Stack.Screen options={{ title: round.name }} />
      <Card dark style={{ gap: S.md, padding: S.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <Avatar name={unit?.name ?? '?'} size={44} color="#2A2A28" />
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.white, fontFamily: F.heavy, fontSize: 20 }}>{unit?.name ?? 'Card'}</Text>
            <Text style={{ color: C.faint, fontFamily: F.medium, fontSize: 12 }}>Plays off {line.h}</Text>
          </View>
        </View>
        <Display size={18} color={C.white}>
          {c.name}
        </Display>
        <Text style={{ color: C.faint, fontFamily: F.medium, fontSize: 12, marginTop: -6 }}>
          {[c.tee && `${c.tee} tees`, c.rating && `${c.rating} / ${c.slope}`].filter(Boolean).join(' · ')}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Big v={line.n ? String(line.gross) : '–'} l="Gross" />
          <Big v={line.n ? E.fmtRel(line.toPar) : '–'} l="Net to par" accent />
          <Big v={line.n ? String(line.pts) : '–'} l="Points" />
          <Big v={line.done ? 'F' : String(line.n)} l="Thru" />
        </View>
      </Card>
      {tour.rounds.length > 1 && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {tour.rounds.map((r) => (
            <Chip key={r.id} label={r.name} on={r.id === round.id} onPress={() => setRoundId(r.id)} />
          ))}
        </View>
      )}
      <Card>
        <ScoreCard par={c.par} si={c.si} strokes={st} pts={pts} putts={card?.putts} stats={card?.stats} />
      </Card>
      {line.n ? <RoundStats s={addCard(emptyLine(), round, st, card?.putts, card?.stats, line.h)} /> : null}
    </Screen>
  );
}

function Big({ v, l, accent }: { v: string; l: string; accent?: boolean }) {
  return (
    <View style={{ gap: 2 }}>
      <Num size={28} color={accent ? C.champagne : C.white}>
        {v}
      </Num>
      <Label color={C.faint} style={{ fontSize: 9 }}>
        {l}
      </Label>
    </View>
  );
}

import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { fmtRel, points } from '@/core/engine';
import { ScoreCard } from '@/social/ScoreCard';
import { useRound, useUser } from '@/state/session';
import { fmtDate } from '@/tour/helpers';
import { Avatar, Button, Card, Display, Empty, Label, Loading, Num, P, Screen } from '@/ui/kit';
import { C, F, S } from '@/ui/theme';

const sum = (a: (number | null | undefined)[]) => a.reduce<number>((x, y) => x + (y ?? 0), 0);

export default function RoundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const r = useRound(id ? decodeURIComponent(id) : undefined);
  const user = useUser(r?.uid);
  if (r === undefined) return <Loading />;
  if (!r) return <Empty icon="golf-outline" title="Round not found" />;
  const par = sum(r.par);
  const pts = r.strokes.map((g, i) => points(g, r.par[i], r.si[i], r.courseHcp));
  const count = (f: (d: number) => boolean) => r.strokes.filter((g, i) => g && f(g - r.par[i])).length;
  const putts = r.putts?.filter((x): x is number => x != null);
  return (
    <Screen>
      <Stack.Screen options={{ title: r.roundName }} />
      <Card dark style={{ gap: S.md, padding: S.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Avatar name={user?.name ?? '?'} uri={user?.avatar} size={28} />
          <Text style={{ color: C.white, fontFamily: F.semi, fontSize: 13, flex: 1 }} onPress={() => router.push(`/user/${r.uid}`)}>
            {user?.name ?? ''}
          </Text>
          <Label color={C.faint}>{fmtDate(r.date, { day: 'numeric', month: 'short', year: 'numeric' })}</Label>
        </View>
        <Display size={24} color={C.white}>
          {r.course}
        </Display>
        <Text style={{ color: C.faint, fontFamily: F.medium, fontSize: 13 }}>
          {r.tee} tees{r.rating ? ` · ${r.rating} / ${r.slope}` : ''} · {r.tourName}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: S.sm }}>
          <Big value={r.gross} label="Gross" />
          <Big value={fmtRel(r.gross - par)} label="To par" accent />
          <Big value={r.pts} label="Points" />
          <Big value={r.differential.toFixed(1)} label={r.estimated ? 'Diff (est.)' : 'Differential'} />
        </View>
      </Card>

      <Card>
        <ScoreCard par={r.par} si={r.si} strokes={r.strokes} pts={pts} />
      </Card>

      <View style={{ flexDirection: 'row', gap: S.md }}>
        <Mini value={count((d) => d <= -1)} label="Birdies+" />
        <Mini value={count((d) => d === 0)} label="Pars" />
        <Mini value={count((d) => d === 1)} label="Bogeys" />
        <Mini value={count((d) => d >= 2)} label="Doubles+" />
      </View>
      <Card style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
        <Mini plain value={r.courseHcp} label="Playing hcp" />
        <Mini plain value={r.adjGross} label="Adj. gross" />
        <Mini plain value={sum(r.strokes.slice(0, 9))} label="Out" />
        <Mini plain value={sum(r.strokes.slice(9))} label="In" />
        {putts?.length ? <Mini plain value={sum(putts)} label="Putts" /> : null}
      </Card>
      <P sub style={{ fontSize: 12 }}>
        Adjusted gross caps each hole at net double bogey. The differential is 113 ÷ slope × (adjusted gross − course rating){r.estimated ? '; this tee has no rating or slope, so par and 113 stand in' : ''}.
      </P>
      <Button kind="secondary" title="Open the tour" onPress={() => router.push(`/tour/${r.tourId}`)} />
    </Screen>
  );
}

function Big({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <View style={{ gap: 2 }}>
      <Num size={30} color={accent ? C.champagne : C.white}>
        {value}
      </Num>
      <Label color={C.faint} style={{ fontSize: 9 }}>
        {label}
      </Label>
    </View>
  );
}

function Mini({ value, label, plain }: { value: string | number; label: string; plain?: boolean }) {
  const body = (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Num size={22}>{value}</Num>
      <Label style={{ fontSize: 9 }}>{label}</Label>
    </View>
  );
  return plain ? body : <Card style={{ flex: 1, alignItems: 'center', padding: S.md }}>{body}</Card>;
}

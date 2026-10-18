import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { points } from '@/core/engine';
import { lineFromRecords } from '@/core/stats';
import { RoundStats } from '@/social/RoundStats';
import { ScoreCard } from '@/social/ScoreCard';
import { Comments } from '@/social/Comments';
import { RoundTile } from '@/social/PostCard';
import { SocialBar } from '@/social/SocialBar';
import { useMe, usePost, useRound, useUser } from '@/state/session';
import { fmtDate } from '@/tour/helpers';
import { Avatar, Button, Card, Empty, Label, Loading, Num, P, Screen } from '@/ui/kit';
import { C, F, R, S } from '@/ui/theme';

const sum = (a: (number | null | undefined)[]) => a.reduce<number>((x, y) => x + (y ?? 0), 0);

export default function RoundScreen() {
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const rid = id ? decodeURIComponent(id) : undefined;
  const r = useRound(rid);
  const user = useUser(r?.uid);
  const me = useMe();
  const post = usePost(rid ? `round-${rid}` : undefined);
  if (r === undefined) return <Loading />;
  if (!r) return <Empty icon="golf-outline" title="Round not found" />;
  const pts = r.strokes.map((g, i) => points(g, r.par[i], r.si[i], r.courseHcp));
  const count = (f: (d: number) => boolean) => r.strokes.filter((g, i) => g && f(g - r.par[i])).length;
  const putts = r.putts?.filter((x): x is number => x != null);
  return (
    <Screen>
      <Stack.Screen options={{ title: r.roundName }} />
      <View style={{ borderRadius: R.lg, overflow: 'hidden' }}>
        <RoundTile round={r} photo={post?.images[0]} />
      </View>
      <Pressable onPress={() => router.push(`/user/${r.uid}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
        <Avatar name={user?.name ?? '?'} uri={user?.avatar} size={32} />
        <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.ink, flex: 1 }}>{user?.name ?? ''}</Text>
        <Text style={{ fontFamily: F.medium, fontSize: 12, color: C.sub }}>{fmtDate(r.date, { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
      </Pressable>
      {post && <SocialBar post={post} author={user ?? undefined} me={me.uid} />}
      <Card>
        <ScoreCard par={r.par} si={r.si} strokes={r.strokes} pts={pts} putts={r.putts} stats={r.stats} />
      </Card>

      <RoundStats s={lineFromRecords([r])} />
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
      {post && <Comments post={post} me={me.uid} focus={focus === '1'} />}
    </Screen>
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

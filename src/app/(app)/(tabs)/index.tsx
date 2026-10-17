import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useFollows, useMe, useMyTours, usePosts, useStories } from '@/state/session';
import { PostCard } from '@/social/PostCard';
import { StoriesBar } from '@/social/StoriesBar';
import { useProfiles } from '@/social/util';
import { fmtRange, isLive } from '@/tour/helpers';
import { Button, Display, Empty, IconButton, Label, Loading, P } from '@/ui/kit';
import { TopBar } from '@/ui/TopBar';
import { C, F, R, S } from '@/ui/theme';

export default function Home() {
  const me = useMe();
  const follows = useFollows(me.uid);
  const circle = useMemo(() => [me.uid, ...follows.following].sort(), [me.uid, follows.following]);
  const posts = usePosts(circle);
  const stories = useStories(circle);
  const tours = useMyTours();
  const profiles = useProfiles([...circle, ...stories.map((s) => s.uid)]);
  const live = (tours ?? []).filter(isLive);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar
        title="Tour Card"
        right={
          <>
            <IconButton icon="camera-outline" onPress={() => router.push('/post/new')} />
            <IconButton icon="people-outline" onPress={() => router.push('/explore')} />
          </>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: S.lg }}>
        <StoriesBar me={me} stories={stories} profiles={{ ...profiles, [me.uid]: me }} />
        {live.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.md, paddingHorizontal: S.lg }}>
            {live.map((t) => (
              <Pressable key={t.id} onPress={() => router.push(`/tour/${t.id}`)} style={{ width: 260, backgroundColor: C.ink, borderRadius: R.lg, padding: S.lg, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.live }} />
                  <Label color={C.white}>Live now</Label>
                </View>
                <Display size={18} color={C.white}>
                  {t.name}
                </Display>
                <Text style={{ color: C.faint, fontFamily: F.medium, fontSize: 12 }}>{fmtRange(t.startDate, t.endDate)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <View style={{ paddingHorizontal: S.lg, gap: S.lg }}>
          {posts === null ? (
            <Loading />
          ) : posts.length ? (
            posts.map((p) => <PostCard key={p.id} post={p} author={p.uid === me.uid ? me : profiles[p.uid]} me={me.uid} />)
          ) : (
            <Empty icon="people-outline" title="Your feed is quiet">
              <P sub center>
                Follow the golfers you play with. Their rounds, photos and stories show up here, and your finished rounds post automatically.
              </P>
              <Button title="Find golfers" onPress={() => router.push('/explore')} />
            </Empty>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

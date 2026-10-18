import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backend } from '@/backend';
import { fmtRel } from '@/core/engine';
import type { Post } from '@/core/types';
import { useFollows, useMe, usePosts, useRounds, useUser } from '@/state/session';
import { Avatar, BackButton, Button, Display, Empty, IconButton, Label, Loading, Num, P, Segmented } from '@/ui/kit';
import { C, F, S } from '@/ui/theme';
import { PostCard } from './PostCard';
import { StatsView } from './StatsView';
import { fmtHi } from './util';

type Tab = 'posts' | 'activity' | 'stats';
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

function Tile({ p, size }: { p: Post; size: number }) {
  const go = () => router.push(`/post/${p.id}`);
  return (
    <Pressable onPress={go} style={{ width: size, height: size }}>
      {p.kind === 'photo' ? (
        <Image source={{ uri: p.images[0] }} style={{ width: size, height: size, backgroundColor: C.soft }} contentFit="cover" />
      ) : p.round ? (
        <View style={{ width: size, height: size, backgroundColor: C.ink, padding: 10, justifyContent: 'space-between', overflow: 'hidden' }}>
          {p.images[0] ? (
            <>
              <Image source={{ uri: p.images[0] }} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
              <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
            </>
          ) : null}
          <Text numberOfLines={2} style={{ color: C.faint, fontSize: 9, fontFamily: F.semi, letterSpacing: 1, textTransform: 'uppercase' }}>
            {p.round.course}
          </Text>
          <View>
            <Num size={size / 3.2} color={C.white}>
              {p.round.gross}
            </Num>
            <Text style={{ color: C.champagne, fontSize: 11, fontFamily: F.bold }}>{fmtRel(p.round.gross - sum(p.round.par))}</Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

export function ProfileView({ uid, back }: { uid: string; back?: boolean }) {
  const me = useMe();
  const user = useUser(uid);
  const follows = useFollows(uid);
  const posts = usePosts([uid]);
  const rounds = useRounds(uid);
  const [tab, setTab] = useState<Tab>('posts');
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const W = Math.min(width, 640);
  if (user === undefined) return <Loading />;
  if (!user) return <Empty icon="person-outline" title="Profile not found" />;
  const mine = uid === me.uid;
  const following = follows.followers.includes(me.uid);
  const tile = (W - 4) / 3;
  return (
    <View style={{ backgroundColor: C.bg }}>
      <View style={{ height: 210 + insets.top, backgroundColor: C.ink }}>
        {user.cover ? <Image source={{ uri: user.cover }} style={{ position: 'absolute', inset: 0 }} contentFit="cover" /> : <CoverArt />}
        <LinearGradient colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.35)']} style={{ position: 'absolute', inset: 0 }} />
        <View style={{ position: 'absolute', top: insets.top + 6, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          {back ? <BackButton color={C.white} /> : <View />}
          {mine && <IconButton icon="settings-outline" color={C.white} onPress={() => router.push('/settings')} />}
        </View>
      </View>
      <View style={{ paddingHorizontal: S.lg, marginTop: -48, gap: S.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View style={{ borderWidth: 4, borderColor: C.bg, borderRadius: 60 }}>
            <Avatar name={user.name} uri={user.avatar} size={96} />
          </View>
          <View style={{ paddingBottom: 6 }}>
            {mine ? (
              <Button small kind="secondary" title="Edit profile" onPress={() => router.push('/profile/edit')} />
            ) : (
              <Button small kind={following ? 'secondary' : 'primary'} title={following ? 'Following' : 'Follow'} onPress={() => (following ? backend.unfollow(me.uid, uid) : backend.follow(me.uid, uid))} />
            )}
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: F.heavy, fontSize: 26, color: C.ink, letterSpacing: -0.6 }}>{user.name}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <View style={{ borderWidth: 1, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ fontFamily: F.semi, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: C.ink }}>{user.affiliated ? 'Affiliated' : 'Not affiliated'}</Text>
            </View>
            {user.homeClub ? <Text style={{ fontFamily: F.medium, fontSize: 13, color: C.sub }}>{user.homeClub}</Text> : null}
          </View>
          {user.bio ? <P style={{ marginTop: 4 }}>{user.bio}</P> : null}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: S.sm }}>
          <View>
            <Num size={34}>{fmtHi(user.hi)}</Num>
            <Label>Handicap{user.hiAuto !== false ? ' · auto' : ''}</Label>
          </View>
          <CountLink n={rounds?.length ?? 0} label="Rounds" onPress={() => setTab('stats')} />
          <CountLink n={follows.followers.length} label="Followers" onPress={() => router.push(`/user/${uid}/follows?tab=followers`)} />
          <CountLink n={follows.following.length} label="Following" onPress={() => router.push(`/user/${uid}/follows?tab=following`)} />
        </View>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'posts', label: 'Posts' },
            { value: 'activity', label: 'Activity' },
            { value: 'stats', label: 'Stats' },
          ]}
        />
      </View>
      <View style={{ paddingTop: S.md, paddingBottom: 60 }}>
        {tab === 'posts' &&
          (posts?.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, alignSelf: 'center', width: W }}>
              {posts.map((p) => (
                <Tile key={p.id} p={p} size={tile} />
              ))}
            </View>
          ) : (
            <Empty icon="camera-outline" title={mine ? 'Share your first post' : 'No posts yet'}>
              {mine && <Button small title="New post" icon="add" onPress={() => router.push('/post/new')} />}
            </Empty>
          ))}
        {tab === 'activity' && (
          <View style={{ gap: S.lg, paddingHorizontal: S.lg }}>
            {(posts ?? []).filter((p) => p.kind === 'round').map((p) => (
              <PostCard key={p.id} post={p} author={user} me={me.uid} />
            ))}
            {!posts?.some((p) => p.kind === 'round') && <Empty icon="golf-outline" title="No rounds posted yet" />}
          </View>
        )}
        {tab === 'stats' && (
          <View style={{ paddingHorizontal: S.lg }}>
            <StatsView rounds={rounds ?? []} />
          </View>
        )}
      </View>
    </View>
  );
}

function CountLink({ n, label, onPress }: { n: number; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ alignItems: 'flex-start' }}>
      <Num size={34}>{n}</Num>
      <Label>{label}</Label>
    </Pressable>
  );
}

/** Default cover: fine contour lines like a yardage book. */
export function CoverArt({ label }: { label?: string }) {
  return (
    <View style={{ position: 'absolute', inset: 0, backgroundColor: C.ink, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: 9 }, (_, i) => (
        <View
          key={i}
          style={{ position: 'absolute', width: 120 + i * 90, height: 70 + i * 52, borderRadius: 999, borderWidth: 1, borderColor: `rgba(217,199,160,${0.32 - i * 0.03})`, right: -60 - i * 30, top: -10 - i * 18 }}
        />
      ))}
      {label ? (
        <Display size={22} color={C.champagne}>
          {label}
        </Display>
      ) : null}
    </View>
  );
}

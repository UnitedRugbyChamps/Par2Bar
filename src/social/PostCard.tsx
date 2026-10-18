import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { backend } from '@/backend';
import { fmtRel } from '@/core/engine';
import type { Post, UserProfile } from '@/core/types';
import { confirm } from '@/ui/confirm';
import { Avatar, Display, Icon, IconButton, Label, Num } from '@/ui/kit';
import { C, F, R, S, shadow } from '@/ui/theme';
import { ScoreMark } from './ScoreCard';
import { sharePost } from './share';
import { ago } from './util';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

/** The black round card; a photo, when the player adds one, sits behind it. */
export function RoundTile({ round, photo, onPress }: { round: NonNullable<Post['round']>; photo?: string; onPress?: () => void }) {
  const toPar = round.gross - sum(round.par);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ backgroundColor: C.ink, padding: S.xl, gap: S.lg, opacity: pressed ? 0.9 : 1, overflow: 'hidden' }, photo ? { minHeight: 340, justifyContent: 'flex-end' } : null]}>
      {photo ? (
        <>
          <Image source={{ uri: photo }} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.88)']} locations={[0, 0.4, 1]} style={{ position: 'absolute', inset: 0 }} />
        </>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Label color={C.champagne}>Round complete</Label>
        <Label color={C.faint}>{round.date ? new Date(round.date + 'T12:00:00Z').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : ''}</Label>
      </View>
      <View style={{ gap: 4 }}>
        <Display size={24} color={C.white}>
          {round.course}
        </Display>
        <Text style={{ color: C.faint, fontFamily: F.medium, fontSize: 13 }}>
          {round.tourName} · {round.roundName}
          {round.tee ? ` · ${round.tee} tees` : ''}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: S.xl }}>
        <View>
          <Num size={56} color={C.white} style={{ lineHeight: 60 }}>
            {round.gross}
          </Num>
          <Label color={C.faint}>Gross</Label>
        </View>
        <View style={{ paddingBottom: 4 }}>
          <Num size={26} color={toPar < 0 ? C.under : C.white}>
            {fmtRel(toPar)}
          </Num>
          <Label color={C.faint}>To par</Label>
        </View>
        <View style={{ paddingBottom: 4 }}>
          <Num size={26} color={C.white}>
            {round.pts}
          </Num>
          <Label color={C.faint}>Points</Label>
        </View>
        <View style={{ paddingBottom: 4 }}>
          <Num size={26} color={C.champagne}>
            {round.differential.toFixed(1)}
          </Num>
          <Label color={C.faint}>Diff.</Label>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {round.strokes.map((g, i) => (
          <ScoreMark key={i} g={g} par={round.par[i]} size={16} dark />
        ))}
      </View>
    </Pressable>
  );
}

/** A post in the feed; `detail` is the full-screen version, where taps don't navigate again. */
export function PostCard({ post, author, me, detail, onComment }: { post: Post; author?: UserProfile; me: string; detail?: boolean; onComment?: () => void }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 640) - S.lg * 2;
  const [page, setPage] = useState(0);
  const [now] = useState(() => Date.now());
  const liked = post.likes.includes(me);
  const name = author?.name ?? '…';
  const open = detail ? undefined : () => router.push(`/post/${post.id}`);
  return (
    <View style={{ backgroundColor: C.card, borderRadius: R.lg, overflow: 'hidden', ...shadow }}>
      <Pressable onPress={() => router.push(`/user/${post.uid}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.md }}>
        <Avatar name={name} uri={author?.avatar} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.ink }}>{name}</Text>
          <Text style={{ fontFamily: F.body, fontSize: 12, color: C.sub }}>
            {post.kind === 'round' ? 'Posted a round' : author?.homeClub || ' '} · {ago(post.at, now)}
          </Text>
        </View>
        {post.uid === me && post.kind === 'photo' && <IconButton icon="ellipsis-horizontal" size={18} onPress={() => confirm('Delete post?', 'This removes it from your profile.', () => backend.deletePost(post.id))} />}
      </Pressable>
      {post.kind === 'round' && post.round ? (
        <RoundTile round={post.round} photo={post.images[0]} onPress={open} />
      ) : (
        <View>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / w))} scrollEventThrottle={32} style={{ width: w + S.lg * 2 }}>
            {post.images.map((uri, i) => (
              <Pressable key={i} onPress={open} disabled={!open}>
                <Image source={{ uri }} style={{ width: w + S.lg * 2, aspectRatio: 1, backgroundColor: C.soft }} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
          {post.images.length > 1 && (
            <View style={{ flexDirection: 'row', gap: 5, position: 'absolute', bottom: 12, alignSelf: 'center' }}>
              {post.images.map((_, i) => (
                <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: i === page ? C.white : 'rgba(255,255,255,0.45)' }} />
              ))}
            </View>
          )}
        </View>
      )}
      <View style={{ padding: S.md, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.lg }}>
          <Pressable hitSlop={8} onPress={() => backend.toggleLike(post.id, me)}>
            <Icon name={liked ? 'heart' : 'heart-outline'} size={25} color={liked ? C.under : C.ink} />
          </Pressable>
          <Pressable hitSlop={8} onPress={onComment ?? (() => router.push(`/post/${post.id}?focus=1`))}>
            <Icon name="chatbubble-outline" size={23} />
          </Pressable>
          <Pressable hitSlop={8} onPress={() => sharePost(post, author)}>
            <Icon name="paper-plane-outline" size={23} />
          </Pressable>
        </View>
        {post.likes.length || post.comments ? (
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: C.ink }}>
            {[post.likes.length && `${post.likes.length} like${post.likes.length === 1 ? '' : 's'}`, post.comments && `${post.comments} comment${post.comments === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        {post.caption ? (
          <Text style={{ fontFamily: F.body, fontSize: 14, color: C.ink, lineHeight: 20 }}>
            <Text style={{ fontFamily: F.bold }}>{name} </Text>
            {post.caption}
          </Text>
        ) : null}
        {!detail && post.comments ? (
          <Text onPress={open} style={{ fontFamily: F.medium, fontSize: 13, color: C.sub }}>
            View {post.comments === 1 ? 'the comment' : `all ${post.comments} comments`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

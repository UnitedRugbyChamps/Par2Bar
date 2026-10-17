import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { Story, UserProfile } from '@/core/types';
import { Avatar, Icon } from '@/ui/kit';
import { C, F, S } from '@/ui/theme';

/** Round avatars along the top of the feed; a ring means there's a story to watch. */
export function StoriesBar({ me, stories, profiles }: { me: UserProfile; stories: Story[]; profiles: Record<string, UserProfile> }) {
  const byUser = new Map<string, Story[]>();
  stories.forEach((s) => byUser.set(s.uid, [...(byUser.get(s.uid) ?? []), s]));
  const others = [...byUser.keys()].filter((u) => u !== me.uid);
  const mine = byUser.get(me.uid);
  const item = (key: string, label: string, avatar: React.ReactNode, onPress: () => void) => (
    <Pressable key={key} onPress={onPress} style={{ alignItems: 'center', gap: 6, width: 72 }}>
      {avatar}
      <Text numberOfLines={1} style={{ fontSize: 11, fontFamily: F.medium, color: C.ink }}>
        {label}
      </Text>
    </Pressable>
  );
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.lg, paddingVertical: S.sm }}>
      {item(
        'me',
        'Your story',
        <View>
          <Avatar name={me.name} uri={me.avatar} size={58} ring={mine ? 'new' : undefined} />
          {!mine && (
            <View style={{ position: 'absolute', right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: C.ink, borderWidth: 2, borderColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="add" size={14} color={C.white} />
            </View>
          )}
        </View>,
        () => router.push(mine ? `/story/${me.uid}` : '/story/new'),
      )}
      {others.map((uid) => {
        const p = profiles[uid];
        return item(uid, p?.name.split(' ')[0] ?? '…', <Avatar name={p?.name ?? '?'} uri={p?.avatar} size={58} ring="new" />, () => router.push(`/story/${uid}`));
      })}
    </ScrollView>
  );
}

import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Icon, type IconName } from '@/ui/kit';
import { TopBar } from '@/ui/TopBar';
import { C, F, R, S, shadow } from '@/ui/theme';

const ITEMS: { icon: IconName; title: string; sub: string; href: string }[] = [
  { icon: 'image-outline', title: 'Post', sub: 'Share photos to your profile', href: '/post/new' },
  { icon: 'aperture-outline', title: 'Story', sub: 'A photo or note that lasts 24 hours', href: '/story/new' },
  { icon: 'trophy-outline', title: 'Tour', sub: 'Players, rounds, tee times and games', href: '/tour/new' },
  { icon: 'shield-outline', title: 'Club', sub: 'Your society or group, home to its tours each year', href: '/club/new' },
  { icon: 'flag-outline', title: 'Course', sub: 'Add a course from its scorecard', href: '/course/new' },
];

export default function Create() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Create" />
      <View style={{ padding: S.lg, gap: S.md }}>
        {ITEMS.map((it) => (
          <Pressable key={it.title} onPress={() => router.push(it.href)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: S.lg, backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, opacity: pressed ? 0.8 : 1 }, shadow]}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={it.icon} color={C.white} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.bold, fontSize: 17, color: C.ink }}>{it.title}</Text>
              <Text style={{ fontFamily: F.body, fontSize: 13, color: C.sub }}>{it.sub}</Text>
            </View>
            <Icon name="chevron-forward" color={C.faint} size={18} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

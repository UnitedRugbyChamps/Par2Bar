import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ago } from '@/social/util';
import { useStories, useUser } from '@/state/session';
import { Avatar, IconButton } from '@/ui/kit';
import { C, F, S } from '@/ui/theme';

const SHOW_MS = 5000;
const TICK = 50;

const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function StoryViewer() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const stories = useStories(uid ? [uid] : []);
  const user = useUser(uid);
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const [t, setT] = useState(0);
  const [now] = useState(() => Date.now());
  const [paused, setPaused] = useState(false);
  const n = stories.length;

  const pos = useRef({ i: 0, t: 0 });

  useEffect(() => {
    if (!n || paused) return;
    const h = setInterval(() => {
      const p = pos.current;
      p.t += TICK;
      if (p.t >= SHOW_MS) {
        p.t = 0;
        if (p.i + 1 >= n) {
          clearInterval(h);
          close();
          return;
        }
        p.i += 1;
        setI(p.i);
      }
      setT(p.t);
    }, TICK);
    return () => clearInterval(h);
  }, [n, paused]);

  const s = stories[Math.min(i, n - 1)];
  const go = (d: number) => {
    const j = i + d;
    if (j >= n) return close();
    pos.current = { i: Math.max(0, j), t: 0 };
    setI(pos.current.i);
    setT(0);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {s?.image ? <Image source={{ uri: s.image }} style={{ position: 'absolute', inset: 0 }} contentFit="cover" /> : null}
      {s && !s.image ? (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', padding: S.xl }}>
          <Text style={{ color: C.white, fontFamily: F.displayMed, fontSize: 30, letterSpacing: 2, textAlign: 'center', lineHeight: 40, textTransform: 'uppercase' }}>{s.text}</Text>
        </View>
      ) : null}
      {s?.image && s.text ? (
        <View style={{ position: 'absolute', bottom: insets.bottom + 48, left: S.lg, right: S.lg, alignItems: 'center' }}>
          <Text style={{ color: C.white, fontFamily: F.semi, fontSize: 17, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, overflow: 'hidden' }}>{s.text}</Text>
        </View>
      ) : null}

      <View style={{ flex: 1, flexDirection: 'row' }}>
        <Pressable style={{ flex: 1 }} onPress={() => go(-1)} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)} />
        <Pressable style={{ flex: 2 }} onPress={() => go(1)} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)} />
      </View>

      <View style={{ position: 'absolute', top: insets.top + 8, left: S.md, right: S.md, gap: S.md }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {stories.map((x, j) => (
            <View key={x.id} style={{ flex: 1, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
              <View style={{ height: '100%', backgroundColor: C.white, width: j < i ? '100%' : j > i ? '0%' : `${Math.min(100, (t / SHOW_MS) * 100)}%` }} />
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Pressable onPress={() => uid && router.replace(`/user/${uid}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, flex: 1 }}>
            <Avatar name={user?.name ?? '?'} uri={user?.avatar} size={32} />
            <Text style={{ color: C.white, fontFamily: F.bold, fontSize: 14 }}>{user?.name ?? ''}</Text>
            {s ? <Text style={{ color: 'rgba(255,255,255,0.7)', fontFamily: F.body, fontSize: 13 }}>{ago(s.at, now)}</Text> : null}
          </Pressable>
          <IconButton icon="close" color={C.white} onPress={close} />
        </View>
      </View>
      {!n ? (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
          <Text style={{ color: C.faint, fontFamily: F.medium }}>No stories in the last 24 hours</Text>
        </View>
      ) : null}
    </View>
  );
}

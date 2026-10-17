import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { backend } from '@/backend';
import { useMe } from '@/state/session';
import { pickAndUpload } from '@/ui/pickImage';
import { Button, ErrorText, Field, Icon, IconButton, P, Screen } from '@/ui/kit';
import { C, F, R, S } from '@/ui/theme';

const MAX = 6;

export default function NewPost() {
  const me = useMe();
  const [images, setImages] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState<'' | 'pick' | 'post'>('');
  const [err, setErr] = useState('');
  const add = async () => {
    setBusy('pick');
    setErr('');
    try {
      const url = await pickAndUpload(me.uid, { aspect: [1, 1], width: 1080 });
      if (url) setImages((x) => [...x, url]);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  };
  const share = async () => {
    setBusy('post');
    try {
      await backend.createPost({ uid: me.uid, kind: 'photo', images, caption: caption.trim(), at: Date.now(), likes: [] });
      router.back();
    } catch (e: any) {
      setErr(e.message);
      setBusy('');
    }
  };
  const size = 110;
  return (
    <Screen>
      <Stack.Screen options={{ title: 'New post' }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm }}>
        {images.map((uri, i) => (
          <View key={uri + i}>
            <Image source={{ uri }} style={{ width: size, height: size, borderRadius: R.md, backgroundColor: C.soft }} contentFit="cover" />
            <View style={{ position: 'absolute', top: 4, right: 4 }}>
              <IconButton icon="close" size={14} color={C.white} bg="rgba(0,0,0,0.6)" onPress={() => setImages((x) => x.filter((_, j) => j !== i))} />
            </View>
          </View>
        ))}
        {images.length < MAX && (
          <Pressable onPress={add} style={{ width: size, height: size, borderRadius: R.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.ink, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Icon name={busy === 'pick' ? 'hourglass-outline' : 'add'} size={26} />
            <Text style={{ fontFamily: F.semi, fontSize: 12, color: C.ink }}>{images.length ? 'Add more' : 'Add photos'}</Text>
          </Pressable>
        )}
      </ScrollView>
      <Field label="Caption" value={caption} onChangeText={setCaption} multiline placeholder="Write a caption…" maxLength={500} />
      <ErrorText>{err}</ErrorText>
      <Button title="Share" icon="paper-plane-outline" onPress={share} busy={busy === 'post'} disabled={!images.length || busy === 'pick'} />
      <P sub center style={{ fontSize: 12 }}>
        Posts appear on your profile and in your followers' feeds.
      </P>
    </Screen>
  );
}

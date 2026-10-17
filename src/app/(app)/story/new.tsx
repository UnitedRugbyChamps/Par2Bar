import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { backend } from '@/backend';
import { useMe } from '@/state/session';
import { pickAndUpload } from '@/ui/pickImage';
import { Button, ErrorText, Icon, Screen, Segmented } from '@/ui/kit';
import { C, F, R, S } from '@/ui/theme';

export default function NewStory() {
  const me = useMe();
  const [mode, setMode] = useState<'photo' | 'text'>('photo');
  const [image, setImage] = useState<string>();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const pick = async () => {
    setErr('');
    try {
      const url = await pickAndUpload(me.uid, { aspect: [9, 16], width: 1080 });
      if (url) setImage(url);
    } catch (e: any) {
      setErr(e.message);
    }
  };
  const post = async () => {
    setBusy(true);
    try {
      await backend.addStory({ uid: me.uid, at: Date.now(), ...(mode === 'photo' ? { image, text: text.trim() || undefined } : { text: text.trim() }) });
      router.back();
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };
  const ready = mode === 'photo' ? !!image : !!text.trim();
  return (
    <Screen>
      <Stack.Screen options={{ title: 'New story' }} />
      <Segmented
        value={mode}
        onChange={setMode}
        options={[
          { value: 'photo', label: 'Photo' },
          { value: 'text', label: 'Text' },
        ]}
      />
      <Pressable onPress={mode === 'photo' ? pick : undefined} style={{ aspectRatio: 9 / 16, maxHeight: 520, alignSelf: 'center', width: '100%', maxWidth: 292, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
        {mode === 'photo' && image ? <Image source={{ uri: image }} style={{ position: 'absolute', inset: 0 }} contentFit="cover" /> : null}
        {mode === 'photo' && !image ? (
          <View style={{ alignItems: 'center', gap: S.sm }}>
            <Icon name="image-outline" size={34} color={C.white} />
            <Text style={{ color: C.white, fontFamily: F.semi }}>Choose a photo</Text>
          </View>
        ) : null}
        {mode === 'text' || image ? (
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={mode === 'text' ? 'Type something…' : 'Add a caption'}
            placeholderTextColor="rgba(255,255,255,0.5)"
            multiline
            maxLength={160}
            style={[
              { color: C.white, textAlign: 'center', padding: S.lg, width: '100%' },
              mode === 'text' ? { fontFamily: F.displayMed, fontSize: 26, letterSpacing: 1.5 } : { position: 'absolute', bottom: 24, fontFamily: F.semi, fontSize: 16, backgroundColor: 'rgba(0,0,0,0.45)' },
            ]}
          />
        ) : null}
      </Pressable>
      <ErrorText>{err}</ErrorText>
      <Button title="Share to your story" onPress={post} busy={busy} disabled={!ready} />
    </Screen>
  );
}

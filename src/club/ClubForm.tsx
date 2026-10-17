import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Club } from '@/core/types';
import { CoverArt } from '@/social/ProfileView';
import { useMe } from '@/state/session';
import { pickAndUpload } from '@/ui/pickImage';
import { Avatar, Button, ErrorText, Field, Icon, Screen } from '@/ui/kit';
import { C, F, R, S } from '@/ui/theme';

export type ClubFields = Pick<Club, 'name' | 'about' | 'location' | 'founded' | 'logo' | 'cover'>;

/** Name, story and pictures for a club; shared by create and edit. */
export function ClubForm({ initial, submit, action }: { initial: ClubFields; submit: (c: ClubFields) => Promise<void>; action: string }) {
  const me = useMe();
  const [c, setC] = useState<ClubFields>(initial);
  const [busy, setBusy] = useState<'' | 'logo' | 'cover' | 'save'>('');
  const [err, setErr] = useState('');
  const patch = (p: Partial<ClubFields>) => setC((x) => ({ ...x, ...p }));
  const pick = async (which: 'logo' | 'cover') => {
    setBusy(which);
    setErr('');
    try {
      const url = await pickAndUpload(me.uid, which === 'logo' ? { aspect: [1, 1], width: 480 } : { aspect: [16, 9], width: 1280 });
      if (url) patch({ [which]: url });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  };
  const save = async () => {
    setBusy('save');
    setErr('');
    try {
      await submit({ ...c, name: c.name.trim(), about: c.about?.trim(), location: c.location?.trim(), founded: c.founded?.trim() });
    } catch (e: any) {
      setErr(e.message);
      setBusy('');
    }
  };
  return (
    <Screen pad={false}>
      <Pressable onPress={() => pick('cover')} style={{ height: 160, backgroundColor: C.ink, overflow: 'hidden' }}>
        {c.cover ? <Image source={{ uri: c.cover }} style={{ position: 'absolute', inset: 0 }} contentFit="cover" /> : <CoverArt label={c.name || undefined} />}
        <View style={{ position: 'absolute', right: S.md, bottom: S.md, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7 }}>
          <Icon name="image-outline" size={15} color={C.white} />
          <Text style={{ color: C.white, fontFamily: F.semi, fontSize: 12 }}>{busy === 'cover' ? 'Uploading…' : 'Cover photo'}</Text>
        </View>
      </Pressable>
      <View style={{ paddingHorizontal: S.lg, marginTop: -40, gap: S.md }}>
        <Pressable onPress={() => pick('logo')} style={{ alignSelf: 'flex-start' }}>
          <View style={{ borderWidth: 4, borderColor: C.bg, borderRadius: 60 }}>
            <Avatar name={c.name || 'Club'} uri={c.logo} size={80} />
          </View>
          <View style={{ position: 'absolute', right: 0, bottom: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: C.ink, borderWidth: 2, borderColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="camera" size={13} color={C.white} />
          </View>
        </Pressable>
        <Field label="Club name" value={c.name} onChangeText={(name) => patch({ name })} placeholder="e.g. Par 2 Bar" />
        <Field label="Based in" value={c.location ?? ''} onChangeText={(location) => patch({ location })} placeholder="Town or region" />
        <Field label="Founded" value={c.founded ?? ''} onChangeText={(founded) => patch({ founded })} placeholder="Year" keyboardType="number-pad" maxLength={4} />
        <Field label="About" value={c.about ?? ''} onChangeText={(about) => patch({ about })} multiline placeholder="Who you are, where you play, what's at stake" />
        <ErrorText>{err}</ErrorText>
        <Button title={action} onPress={save} busy={busy === 'save'} disabled={!c.name.trim() || busy === 'logo' || busy === 'cover'} />
      </View>
    </Screen>
  );
}

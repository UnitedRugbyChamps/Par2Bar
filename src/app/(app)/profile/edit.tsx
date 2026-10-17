import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { backend } from '@/backend';
import type { UserProfile } from '@/core/types';
import { CoverArt } from '@/social/ProfileView';
import { fmtHi } from '@/social/util';
import { useMe } from '@/state/session';
import { pickAndUpload } from '@/ui/pickImage';
import { Avatar, Button, ErrorText, Field, Icon, List, P, Screen, Toggle } from '@/ui/kit';
import { C, F, R, S } from '@/ui/theme';

export default function EditProfile() {
  const me = useMe();
  return <ProfileForm key={me.uid} me={me} />;
}

function ProfileForm({ me }: { me: UserProfile }) {
  const [name, setName] = useState(me.name);
  const [bio, setBio] = useState(me.bio ?? '');
  const [club, setClub] = useState(me.homeClub ?? '');
  const [affiliated, setAffiliated] = useState(!!me.affiliated);
  const [auto, setAuto] = useState(me.hiAuto !== false);
  const [hi, setHi] = useState(me.hi == null ? '' : fmtHi(me.hi));
  const [avatar, setAvatar] = useState(me.avatar);
  const [cover, setCover] = useState(me.cover);
  const [busy, setBusy] = useState<'' | 'avatar' | 'cover' | 'save'>('');
  const [err, setErr] = useState('');
  const hiNum = hi.trim() === '' ? null : Number(hi.replace(',', '.').replace(/^\+/, '-'));
  const valid = name.trim() && (auto || hiNum == null || (!Number.isNaN(hiNum) && hiNum >= -10 && hiNum <= 54));

  const pick = async (which: 'avatar' | 'cover') => {
    setBusy(which);
    setErr('');
    try {
      const url = await pickAndUpload(me.uid, which === 'avatar' ? { aspect: [1, 1], width: 480 } : { aspect: [16, 9], width: 1280 });
      if (url) (which === 'avatar' ? setAvatar : setCover)(url);
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
      await backend.updateProfile(me.uid, {
        name: name.trim(),
        bio: bio.trim(),
        homeClub: club.trim(),
        affiliated,
        hiAuto: auto,
        avatar,
        cover,
        ...(auto ? {} : { hi: hiNum }),
      });
      router.back();
    } catch (e: any) {
      setErr(e.message);
      setBusy('');
    }
  };

  return (
    <Screen pad={false}>
      <Stack.Screen options={{ title: 'Edit profile' }} />
      <Pressable onPress={() => pick('cover')} style={{ height: 170, backgroundColor: C.ink, overflow: 'hidden' }}>
        {cover ? <Image source={{ uri: cover }} style={{ position: 'absolute', inset: 0 }} contentFit="cover" /> : <CoverArt />}
        <View style={{ position: 'absolute', right: S.md, bottom: S.md, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7 }}>
          <Icon name="image-outline" size={15} color={C.white} />
          <Text style={{ color: C.white, fontFamily: F.semi, fontSize: 12 }}>{busy === 'cover' ? 'Uploading…' : 'Cover photo'}</Text>
        </View>
      </Pressable>
      <View style={{ paddingHorizontal: S.lg, marginTop: -44, gap: S.md }}>
        <Pressable onPress={() => pick('avatar')} style={{ alignSelf: 'flex-start' }}>
          <View style={{ borderWidth: 4, borderColor: C.bg, borderRadius: 60 }}>
            <Avatar name={name} uri={avatar} size={88} />
          </View>
          <View style={{ position: 'absolute', right: 2, bottom: 4, width: 30, height: 30, borderRadius: 15, backgroundColor: C.ink, borderWidth: 2, borderColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="camera" size={14} color={C.white} />
          </View>
        </Pressable>
        <ErrorText>{err}</ErrorText>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Bio" value={bio} onChangeText={setBio} multiline placeholder="Home course, best ever round, the club you'd never give up" maxLength={160} />
        <Field label="Home club" value={club} onChangeText={setClub} />
        <List>
          <Toggle label="Affiliated golfer" sub="I hold an official handicap through a club and golf union" value={affiliated} onChange={setAffiliated} />
          <Toggle label="Work out my handicap" sub="Updates your index after every finished round, the WHS way (best 8 of your last 20)" value={auto} onChange={setAuto} />
        </List>
        {auto ? (
          <P sub>
            Current index {fmtHi(me.hi)}. It is worked out once you have three finished 18-hole rounds, and keeps up to date after every round after that.
          </P>
        ) : (
          <Field label="Handicap index" value={hi} onChangeText={setHi} keyboardType="numbers-and-punctuation" hint="Use + for plus handicaps, e.g. +1.2" />
        )}
        <Button title="Save" onPress={save} busy={busy === 'save'} disabled={!valid || busy === 'avatar' || busy === 'cover'} />
      </View>
    </Screen>
  );
}

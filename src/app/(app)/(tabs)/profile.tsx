import { Stack } from 'expo-router';
import { useState } from 'react';

import { backend } from '@/backend';
import type { NotifyPrefs } from '@/core/types';
import { useMe } from '@/state/session';
import { confirm } from '@/ui/confirm';
import { Avatar, Button, Card, Field, H, List, P, Screen, Toggle } from '@/ui/kit';

export default function Profile() {
  const me = useMe();
  const [name, setName] = useState(me.name);
  const [hi, setHi] = useState(me.hi == null ? '' : String(me.hi));
  const [club, setClub] = useState(me.homeClub ?? '');
  const [savedAs, setSavedAs] = useState('');
  const snapshot = `${name}|${hi}|${club}`;
  const hiNum = hi.trim() === '' ? null : Number(hi.replace(',', '.').replace(/^\+/, '-'));
  const valid = name.trim() && (hiNum == null || (!Number.isNaN(hiNum) && hiNum >= -10 && hiNum <= 54));
  const pref = (k: keyof Omit<NotifyPrefs, 'follow'>) => (v: boolean) => backend.updateProfile(me.uid, { notify: { ...me.notify, [k]: v } });
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Profile' }} />
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={me.name || '?'} size={52} />
        <P sub>{me.email}</P>
      </Card>
      <Field label="Name" value={name} onChangeText={setName} />
      <Field label="Handicap index" value={hi} onChangeText={setHi} keyboardType="numbers-and-punctuation" hint="Your WHS index. Tours copy it when you join; organisers can update it per tour." />
      <Field label="Home club" value={club} onChangeText={setClub} />
      <Button title={savedAs === snapshot ? 'Saved' : 'Save'} disabled={!valid} onPress={() => backend.updateProfile(me.uid, { name: name.trim(), hi: hiNum, homeClub: club.trim() }).then(() => setSavedAs(snapshot))} />

      <H>Notifications</H>
      <P sub>Sent to your phone as other players post scores. Star players on a tour's Players tab to follow every score they post.</P>
      <List>
        <Toggle label="Lead changes" sub="A new leader in a tour's main competition" value={me.notify.leader} onChange={pref('leader')} />
        <Toggle label="Matches" sub="Team cup and match play results, and matches that change hands" value={me.notify.matches} onChange={pref('matches')} />
        <Toggle label="Birdies and better" sub="Highlights from anyone on the tour" value={me.notify.highlights} onChange={pref('highlights')} />
        <Toggle label="My group" sub="Every score from players in my group" value={me.notify.myGroup} onChange={pref('myGroup')} />
        <Toggle label="Tee times" sub="A reminder 30 minutes before I tee off" value={me.notify.teeTimes} onChange={pref('teeTimes')} />
      </List>

      <Button title="Sign out" kind="secondary" icon="log-out-outline" onPress={() => confirm('Sign out?', 'You can sign back in any time.', () => backend.signOut())} />
      {backend.kind === 'offline' && <P sub center style={{ fontSize: 12 }}>Test mode: data is saved on this phone only.</P>}
    </Screen>
  );
}

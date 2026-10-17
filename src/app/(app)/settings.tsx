import { router, Stack } from 'expo-router';

import { backend } from '@/backend';
import type { NotifyPrefs } from '@/core/types';
import { useMe } from '@/state/session';
import { confirm } from '@/ui/confirm';
import { Avatar, Button, H, Icon, List, P, Row, Screen, Toggle } from '@/ui/kit';
import { C } from '@/ui/theme';

export default function Settings() {
  const me = useMe();
  const pref = (k: keyof Omit<NotifyPrefs, 'follow'>) => (v: boolean) => backend.updateProfile(me.uid, { notify: { ...me.notify, [k]: v } });
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Settings' }} />
      <List>
        <Row left={<Avatar name={me.name} uri={me.avatar} size={44} />} title={me.name} subtitle={me.email} onPress={() => router.push('/profile/edit')} />
        <Row left={<Icon name="flag-outline" />} title="Courses" subtitle="Search courses or add one from its scorecard" onPress={() => router.push('/courses')} />
        <Row left={<Icon name="enter-outline" />} title="Join a tour" subtitle="With the code from the organiser" onPress={() => router.push('/tour/join')} />
      </List>

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
      {backend.kind === 'offline' && (
        <P sub center style={{ fontSize: 12, color: C.faint }}>
          Test mode: everything is saved on this device only.
        </P>
      )}
    </Screen>
  );
}

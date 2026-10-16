import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share } from 'react-native';

import { backend } from '@/backend';
import type { Tour, UserProfile } from '@/core/types';
import { isAdmin, useMe, useTour } from '@/state/session';
import { confirm } from '@/ui/confirm';
import { Button, Field, H, List, Loading, P, Row, Screen, Toggle } from '@/ui/kit';

export default function TourSettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tour } = useTour(id);
  if (!tour) return <Loading />;
  return <SettingsForm key={tour.id} tour={tour} />;
}

function SettingsForm({ tour }: { tour: Tour }) {
  const me = useMe();
  const [f, setF] = useState({ name: tour.name, location: tour.location ?? '', startDate: tour.startDate, endDate: tour.endDate, timezone: tour.timezone ?? '' });
  const [members, setMembers] = useState<UserProfile[]>([]);
  const memberKey = tour.memberUids.join(',');
  useEffect(() => {
    backend.getUsers(memberKey.split(',')).then(setMembers);
  }, [memberKey]);
  const owner = tour.ownerUid === me.uid;
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Tour details' }} />
      <Field label="Name" value={f.name} onChangeText={set('name')} />
      <Field label="Where" value={f.location} onChangeText={set('location')} />
      <Field label="First day" value={f.startDate} onChangeText={set('startDate')} placeholder="YYYY-MM-DD" />
      <Field label="Last day" value={f.endDate} onChangeText={set('endDate')} placeholder="YYYY-MM-DD" />
      <Field label="Time zone" value={f.timezone} onChangeText={set('timezone')} hint="Tee time reminders use this, e.g. Africa/Johannesburg or Europe/London" autoCapitalize="none" />
      <Button title="Save" onPress={() => backend.updateTour(tour.id, f).then(() => router.back())} />

      <H>Invite</H>
      <List>
        <Row title={`Code ${tour.joinCode}`} subtitle="Anyone with the code can join and follow the tour" right="Share" onPress={() => Share.share({ message: `Join "${tour.name}" on Tour Card with code ${tour.joinCode}` })} />
      </List>

      <H>Members</H>
      <P sub>Organisers can change the tour setup. Everyone can score and follow.</P>
      <List>
        {members.map((m) => (
          <Toggle
            key={m.uid}
            label={m.name + (m.uid === tour.ownerUid ? ' (created the tour)' : '')}
            sub={m.email}
            value={isAdmin(tour, m.uid)}
            onChange={(v) => {
              if (m.uid === tour.ownerUid) return;
              backend.updateTour(tour.id, { adminUids: v ? [...tour.adminUids, m.uid] : tour.adminUids.filter((x) => x !== m.uid) });
            }}
          />
        ))}
      </List>

      {owner ? (
        <Button
          title="Delete tour"
          kind="danger"
          onPress={() =>
            confirm('Delete this tour?', 'All rounds and scores will be removed for everyone.', async () => {
              await backend.deleteTour(tour.id);
              router.dismissAll();
            })
          }
        />
      ) : (
        <Button
          title="Leave tour"
          kind="danger"
          onPress={() =>
            confirm('Leave this tour?', 'You can rejoin with the code.', async () => {
              await backend.updateTour(tour.id, { memberUids: tour.memberUids.filter((x) => x !== me.uid) });
              router.dismissAll();
            })
          }
        />
      )}
    </Screen>
  );
}

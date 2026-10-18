import { router, Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useState } from 'react';

import { backend } from '@/backend';
import { isClubAdmin, useMe, useMyClubs } from '@/state/session';
import { applyFormats, formatById } from '@/tour/formats';
import { today } from '@/tour/helpers';
import { Button, Chip, Field, Label, P, Screen } from '@/ui/kit';
import { teamColors } from '@/ui/theme';

export default function NewTour() {
  const me = useMe();
  const params = useLocalSearchParams<{ club?: string }>();
  const clubs = (useMyClubs() ?? []).filter((c) => isClubAdmin(c, me.uid));
  const [clubId, setClubId] = useState<string | null>(params.club ?? null);
  const club = clubs.find((c) => c.id === clubId);
  const formats = club?.formats?.length ? club.formats : ['stableford'];
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [start, setStart] = useState(today());
  const [end, setEnd] = useState(today());
  const [busy, setBusy] = useState(false);
  const valid = name.trim() && /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end) && end >= start;
  return (
    <Screen>
      <Stack.Screen options={{ title: 'New tour' }} />
      <Field label="Tour name" value={name} onChangeText={setName} placeholder="e.g. Coastal Classic 2026" />
      {clubs.length > 0 && (
        <View style={{ gap: 8 }}>
          <Label>Club</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Chip label="None" on={!clubId} onPress={() => setClubId(null)} />
            {clubs.map((c) => (
              <Chip key={c.id} label={c.name} on={clubId === c.id} onPress={() => setClubId(c.id)} />
            ))}
          </View>
        </View>
      )}
      <Field label="Where" value={location} onChangeText={setLocation} placeholder="Town or region" />
      <Field label="First day" value={start} onChangeText={setStart} placeholder="YYYY-MM-DD" />
      <Field label="Last day" value={end} onChangeText={setEnd} placeholder="YYYY-MM-DD" />
      <P sub>Next you'll add players, rounds, tee times and the games you want to play. You can change any of it later.</P>
      <P sub>
        Games to start with: {formats.map((f) => formatById(f)?.label).join(', ')}
        {club?.formats?.length ? ` (from ${club.name})` : ''}. Add more formats later under Manage.
      </P>
      <Button
        title="Create tour"
        busy={busy}
        disabled={!valid}
        onPress={async () => {
          setBusy(true);
          const teams = [
            { id: 'ta', name: 'Team Black', color: teamColors[0] },
            { id: 'tb', name: 'Team Gold', color: teamColors[2] },
          ];
          const games = applyFormats({ comps: [], cup: null, teams, rounds: [] }, formats);
          const id = await backend.createTour({
            name: name.trim(),
            clubId,
            location: location.trim(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            startDate: start,
            endDate: end,
            ownerUid: me.uid,
            adminUids: [],
            memberUids: [me.uid],
            players: [{ id: 'p' + me.uid, name: me.name, uid: me.uid, hi: me.hi }],
            teams,
            rounds: [],
            comps: games.comps,
            cup: games.cup,
          });
          router.replace(`/tour/${id}`);
          router.push(`/tour/${id}/manage`);
        }}
      />
    </Screen>
  );
}

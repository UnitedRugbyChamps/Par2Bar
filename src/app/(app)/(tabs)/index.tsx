import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { backend } from '@/backend';
import { useMe, useMyTours } from '@/state/session';
import { fmtRange, isLive, loadSample } from '@/tour/helpers';
import { Button, Card, Empty, Icon, Loading, P, Screen } from '@/ui/kit';
import { C, S } from '@/ui/theme';

export default function Tours() {
  const me = useMe();
  const tours = useMyTours();
  const [busy, setBusy] = useState(false);
  if (!tours) return <Loading />;
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Tours' }} />
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <View style={{ flex: 1 }}>
          <Button title="New tour" icon="add" onPress={() => router.push('/tour/new')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Join with code" icon="enter-outline" kind="secondary" onPress={() => router.push('/tour/join')} />
        </View>
      </View>
      {tours.length === 0 && (
        <Empty icon="golf-outline" title="No tours yet">
          <P sub center>
            Create a tour and invite your group with its code, or join one a friend set up.
          </P>
          {backend.kind === 'offline' && (
            <Button
              title="Load two sample tours"
              kind="ghost"
              busy={busy}
              onPress={async () => {
                setBusy(true);
                await loadSample(me);
                setBusy(false);
              }}
            />
          )}
        </Empty>
      )}
      {tours.map((t) => (
        <Card key={t.id} onPress={() => router.push(`/tour/${t.id}`)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink, flex: 1 }} numberOfLines={1}>
              {t.name}
            </Text>
            {isLive(t) && (
              <View style={{ backgroundColor: C.under, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>LIVE</Text>
              </View>
            )}
            <Icon name="chevron-forward" color={C.faint} size={18} />
          </View>
          <P sub>
            {[fmtRange(t.startDate, t.endDate), t.location].filter(Boolean).join(' · ')}
          </P>
          <P sub>
            {t.players.length} players · {t.rounds.length} {t.rounds.length === 1 ? 'round' : 'rounds'}
            {t.cup ? ` · ${t.cup.name}` : ''}
          </P>
        </Card>
      ))}
    </Screen>
  );
}

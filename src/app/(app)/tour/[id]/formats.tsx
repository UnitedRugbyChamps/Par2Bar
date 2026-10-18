import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { backend } from '@/backend';
import { useTour } from '@/state/session';
import { applyFormats } from '@/tour/formats';
import { FormatPicker } from '@/tour/FormatPicker';
import { Button, Loading, P, Screen } from '@/ui/kit';

export default function TourFormats() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tour } = useTour(id);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  if (!tour) return <Loading />;
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Game formats' }} />
      <P sub>Pick the formats to play. Each one sets up its games (and the team cup for Ryder Cup and foursomes), which you can fine-tune under Games.</P>
      <FormatPicker selected={picked} onToggle={(f) => setPicked((x) => (x.includes(f) ? x.filter((y) => y !== f) : [...x, f]))} />
      <Button
        title={picked.length ? `Add ${picked.length} format${picked.length === 1 ? '' : 's'}` : 'Add formats'}
        disabled={!picked.length}
        busy={busy}
        onPress={async () => {
          setBusy(true);
          const next = applyFormats(tour, picked);
          await backend.updateTour(tour.id, { comps: next.comps, cup: next.cup ?? null });
          router.back();
        }}
      />
    </Screen>
  );
}

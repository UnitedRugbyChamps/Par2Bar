import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { backend } from '@/backend';
import { useMe } from '@/state/session';
import { Button, ErrorText, Field, P, Screen } from '@/ui/kit';

export default function Join() {
  const me = useMe();
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Join a tour' }} />
      <P sub>Ask the organiser for the six-character tour code.</P>
      <Field label="Tour code" value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" maxLength={6} style={{ fontSize: 24, letterSpacing: 6, textAlign: 'center' }} />
      <ErrorText>{err}</ErrorText>
      <Button
        title="Join"
        busy={busy}
        disabled={code.length !== 6}
        onPress={async () => {
          setBusy(true);
          setErr('');
          try {
            const id = await backend.joinTour(code, me.uid);
            router.replace(`/tour/${id}/players?claim=1`);
          } catch (e: any) {
            setErr(e.message);
          } finally {
            setBusy(false);
          }
        }}
      />
    </Screen>
  );
}

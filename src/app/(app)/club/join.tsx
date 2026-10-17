import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { backend } from '@/backend';
import { useMe } from '@/state/session';
import { Button, ErrorText, Field, P, Screen } from '@/ui/kit';

export default function JoinClub() {
  const me = useMe();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const join = async () => {
    setBusy(true);
    setErr('');
    try {
      const id = await backend.joinClub(code, me.uid);
      router.replace(`/club/${id}`);
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Join a club' }} />
      <P sub>Ask the club's organiser for its six-letter code. Members see every tour the club runs, its honours board and records.</P>
      <Field label="Club code" value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" maxLength={6} placeholder="ABC123" />
      <ErrorText>{err}</ErrorText>
      <Button title="Join" onPress={join} busy={busy} disabled={code.trim().length < 6} />
    </Screen>
  );
}

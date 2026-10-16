import { useState } from 'react';

import { backend } from '@/backend';
import { Button, ErrorText, Field, P, Screen, Title } from '@/ui/kit';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setErr('');
    setBusy(true);
    try {
      await backend.resetPassword(email);
      setSent(true);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Title>Reset password</Title>
      {sent ? (
        <P>Check {email} for a link to choose a new password.</P>
      ) : (
        <>
          <P sub>We'll email you a link to choose a new one.</P>
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <ErrorText>{err}</ErrorText>
          <Button title="Send reset link" onPress={go} busy={busy} disabled={!email} />
        </>
      )}
    </Screen>
  );
}

import { Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { backend } from '@/backend';
import { Button, ErrorText, Field, P, Screen, Title } from '@/ui/kit';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setErr('');
    setBusy(true);
    try {
      await backend.signUp(name, email, pw);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: '' }} />
      <Screen>
        <Title>Create your account</Title>
        <P sub>You can add your handicap index after signing up.</P>
        <Field label="Full name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry autoComplete="new-password" hint="At least 6 characters" />
        <ErrorText>{err}</ErrorText>
        <Button title="Create account" onPress={go} busy={busy} disabled={!name.trim() || !email || pw.length < 6} />
      </Screen>
    </KeyboardAvoidingView>
  );
}

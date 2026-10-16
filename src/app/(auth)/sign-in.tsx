import { Link, Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { backend } from '@/backend';
import { Button, ErrorText, Field, Icon, P, Screen } from '@/ui/kit';
import { C, S } from '@/ui/theme';

export function Brand() {
  return (
    <View style={{ alignItems: 'center', gap: S.sm, paddingVertical: S.xl }}>
      <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="golf" size={40} color={C.accent} />
      </View>
      <Text style={{ fontSize: 30, fontWeight: '800', color: C.ink }}>Tour Card</Text>
      <P sub>Golf tours, live scores and leaderboards</P>
    </View>
  );
}

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setErr('');
    setBusy(true);
    try {
      await backend.signIn(email, pw);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <Brand />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
        <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={go} />
        <ErrorText>{err}</ErrorText>
        <Button title="Sign in" onPress={go} busy={busy} disabled={!email || !pw} />
        <Link href="/forgot" style={{ color: C.brand, textAlign: 'center', padding: S.sm, fontWeight: '600' }}>
          Forgot password?
        </Link>
        <View style={{ height: S.lg }} />
        <P center sub>
          New here?
        </P>
        <Link href="/sign-up" asChild>
          <Button title="Create an account" kind="secondary" onPress={() => {}} />
        </Link>
        {backend.kind === 'offline' && (
          <P sub center style={{ fontSize: 12, marginTop: S.lg }}>
            Test mode: accounts and tours are saved on this phone until the app is connected to its server.
          </P>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

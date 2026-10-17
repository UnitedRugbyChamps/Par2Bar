import { Link, Stack } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { backend } from "@/backend";
import { CoverArt } from "@/social/ProfileView";
import { Button, Display, ErrorText, Field, Icon, P, Screen } from "@/ui/kit";
import { C, F, S } from "@/ui/theme";

/** Black hero with the wordmark, used on the sign-in screens. */
export function Brand({ small }: { small?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: C.ink,
        paddingTop: insets.top + (small ? S.xl : 72),
        paddingBottom: small ? S.xl : 56,
        alignItems: "center",
        gap: S.md,
        overflow: "hidden",
      }}
    >
      <CoverArt />
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          borderWidth: 1,
          borderColor: C.champagne,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="golf-outline" size={30} color={C.white} />
      </View>
      <Display
        size={small ? 24 : 32}
        color={C.white}
        style={{ letterSpacing: small ? 7 : 9 }}
      >
        Tour Card
      </Display>
      <Text
        style={{
          color: C.champagne,
          fontFamily: F.semi,
          fontSize: 10,
          letterSpacing: 3.5,
        }}
      >
        TOURS · CLUBS · LIVE SCORING
      </Text>
    </View>
  );
}

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setErr("");
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Screen pad={false}>
        <Brand />
        <View style={{ padding: S.lg, gap: S.md }}>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Field
            label="Password"
            value={pw}
            onChangeText={setPw}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={go}
          />
          <ErrorText>{err}</ErrorText>
          <Button
            title="Sign in"
            onPress={go}
            busy={busy}
            disabled={!email || !pw}
          />
          <Link
            href="/forgot"
            style={{
              color: C.ink,
              textAlign: "center",
              padding: S.sm,
              fontFamily: F.semi,
            }}
          >
            Forgot password?
          </Link>
          <View style={{ height: S.lg }} />
          <P center sub>
            New here?
          </P>
          <Link href="/sign-up" asChild>
            <Button
              title="Create an account"
              kind="secondary"
              onPress={() => {}}
            />
          </Link>
          {backend.kind === "offline" && (
            <P sub center style={{ fontSize: 12, marginTop: S.lg }}>
              Test mode: accounts and tours are saved on this phone until the
              app is connected to its server.
            </P>
          )}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { DMSans_800ExtraBold } from '@expo-google-fonts/dm-sans/800ExtraBold';
import { DMSans_900Black } from '@expo-google-fonts/dm-sans/900Black';
import { JosefinSans_300Light } from '@expo-google-fonts/josefin-sans/300Light';
import { JosefinSans_500Medium } from '@expo-google-fonts/josefin-sans/500Medium';
import { JosefinSans_700Bold } from '@expo-google-fonts/josefin-sans/700Bold';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { onNotificationTap } from '@/notify/push';
import { SessionProvider, useSession } from '@/state/session';
import { ConfirmHost } from '@/ui/confirm';
import { C } from '@/ui/theme';

SplashScreen.preventAutoHideAsync();

function Root({ fontsReady }: { fontsReady: boolean }) {
  const { loading } = useSession();
  useEffect(() => {
    if (!loading && fontsReady) SplashScreen.hideAsync();
  }, [loading, fontsReady]);
  useEffect(() => onNotificationTap((id) => router.push(`/tour/${id}`)), []);
  if (!fontsReady) return null;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />;
}

export default function RootLayout() {
  const [fontsReady, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    DMSans_900Black,
    JosefinSans_300Light,
    JosefinSans_500Medium,
    JosefinSans_700Bold,
  });
  return (
    <SessionProvider>
      <StatusBar style="light" />
      <Root fontsReady={fontsReady || !!fontError} />
      <ConfirmHost />
    </SessionProvider>
  );
}

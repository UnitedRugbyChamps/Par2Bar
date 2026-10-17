import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { onNotificationTap } from '@/notify/push';
import { SessionProvider, useSession } from '@/state/session';
import { ConfirmHost } from '@/ui/confirm';

SplashScreen.preventAutoHideAsync();

function Root() {
  const { loading } = useSession();
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);
  useEffect(() => onNotificationTap((id) => router.push(`/tour/${id}`)), []);
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="light" />
      <Root />
      <ConfirmHost />
    </SessionProvider>
  );
}

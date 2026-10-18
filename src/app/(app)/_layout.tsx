import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useSession } from '@/state/session';
import { BackButton, Loading } from '@/ui/kit';
import { C, F } from '@/ui/theme';

export default function AppLayout() {
  const { user, loading } = useSession();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/sign-in" />;
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.ink,
          headerTitleStyle: { fontFamily: F.bold, fontSize: 16 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: C.bg },
          headerLeft: () => <BackButton />,
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="user/[uid]/index" options={{ headerShown: false }} />
        <Stack.Screen name="story/[uid]" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="tour/[id]/index" options={{ headerShown: false }} />
        <Stack.Screen name="club/[id]/index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

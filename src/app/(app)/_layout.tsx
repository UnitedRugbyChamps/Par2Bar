import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/state/session';
import { Loading } from '@/ui/kit';
import { C } from '@/ui/theme';

export default function AppLayout() {
  const { user, loading } = useSession();
  if (loading) return <Loading />;
  if (!user) return <Redirect href="/sign-in" />;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: C.brand },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: C.bg },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

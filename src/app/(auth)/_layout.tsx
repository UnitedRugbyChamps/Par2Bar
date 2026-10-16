import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/state/session';
import { Loading } from '@/ui/kit';
import { C } from '@/ui/theme';

export default function AuthLayout() {
  const { user, loading } = useSession();
  if (loading) return <Loading />;
  if (user) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerStyle: { backgroundColor: C.brand }, headerTintColor: '#fff', headerTitle: '', headerShadowVisible: false, contentStyle: { backgroundColor: C.bg } }} />;
}

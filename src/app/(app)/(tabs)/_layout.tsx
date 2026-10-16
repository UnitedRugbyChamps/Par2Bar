import { Tabs } from 'expo-router/js-tabs';

import { Icon } from '@/ui/kit';
import { C } from '@/ui/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: C.brand },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: C.brand,
        tabBarInactiveTintColor: C.faint,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Tours', tabBarIcon: ({ color }) => <Icon name="trophy" color={color as string} size={22} /> }} />
      <Tabs.Screen name="courses" options={{ title: 'Courses', tabBarIcon: ({ color }) => <Icon name="flag" color={color as string} size={22} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Icon name="person-circle" color={color as string} size={22} /> }} />
    </Tabs>
  );
}

import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';

import { useSession } from '@/state/session';
import { Avatar, Icon } from '@/ui/kit';
import { C } from '@/ui/theme';

export default function TabsLayout() {
  const { user } = useSession();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: C.white,
        tabBarInactiveTintColor: '#7C7C78',
        tabBarStyle: { backgroundColor: C.ink, borderTopWidth: 0, height: 84, paddingTop: 10 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, focused }) => <Icon name={focused ? 'home' : 'home-outline'} color={color as string} size={24} /> }} />
      <Tabs.Screen name="tours" options={{ title: 'Tours', tabBarIcon: ({ color, focused }) => <Icon name={focused ? 'trophy' : 'trophy-outline'} color={color as string} size={24} /> }} />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: () => (
            <View style={{ width: 46, height: 34, borderRadius: 12, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="add" color={C.ink} size={26} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: ({ color, focused }) => <Icon name={focused ? 'search' : 'search-outline'} color={color as string} size={24} /> }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <View style={{ borderWidth: 1.5, borderColor: focused ? C.white : 'transparent', borderRadius: 20, padding: 1.5 }}>
              <Avatar name={user?.name ?? '?'} uri={user?.avatar} size={26} color="#3A3A38" />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

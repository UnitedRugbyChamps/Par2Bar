import { useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';

import { ProfileView } from '@/social/ProfileView';
import { C } from '@/ui/theme';

export default function UserProfile() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }}>
      <ProfileView uid={uid} back />
    </ScrollView>
  );
}

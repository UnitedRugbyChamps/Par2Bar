import { ScrollView } from 'react-native';

import { useMe } from '@/state/session';
import { ProfileView } from '@/social/ProfileView';
import { C } from '@/ui/theme';

export default function MyProfile() {
  const me = useMe();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }}>
      <ProfileView uid={me.uid} />
    </ScrollView>
  );
}

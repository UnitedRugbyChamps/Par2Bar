import { router, Stack } from 'expo-router';

import { backend } from '@/backend';
import { ClubForm } from '@/club/ClubForm';
import { useMe } from '@/state/session';

export default function NewClub() {
  const me = useMe();
  return (
    <>
      <Stack.Screen options={{ title: 'New club' }} />
      <ClubForm
        initial={{ name: '' }}
        action="Create club"
        submit={async (c) => {
          const id = await backend.createClub({ ...c, ownerUid: me.uid, adminUids: [], memberUids: [me.uid] });
          router.replace(`/club/${id}`);
        }}
      />
    </>
  );
}

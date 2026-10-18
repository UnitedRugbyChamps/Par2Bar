import { router, Stack, useLocalSearchParams } from 'expo-router';

import { backend } from '@/backend';
import { ClubForm } from '@/club/ClubForm';
import { useClub } from '@/state/session';
import { Loading } from '@/ui/kit';

export default function EditClub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const club = useClub(id);
  if (!club) return <Loading />;
  return (
    <>
      <Stack.Screen options={{ title: 'Edit club' }} />
      <ClubForm
        key={club.id}
        initial={{ name: club.name, about: club.about, location: club.location, founded: club.founded, logo: club.logo, cover: club.cover, sponsors: club.sponsors, formats: club.formats }}
        action="Save"
        submit={async (c) => {
          await backend.updateClub(club.id, c);
          router.back();
        }}
      />
    </>
  );
}

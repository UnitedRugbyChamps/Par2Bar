import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { backend } from '@/backend';
import type { Club, Tour } from '@/core/types';
import { CoverArt } from '@/social/ProfileView';
import { useMe, useMyClubs, useMyTours } from '@/state/session';
import { fmtRange, isLive, loadSample } from '@/tour/helpers';
import { Avatar, Button, Display, Empty, Icon, IconButton, Label, Loading, P } from '@/ui/kit';
import { TopBar } from '@/ui/TopBar';
import { C, F, R, S, shadow } from '@/ui/theme';

export default function Tours() {
  const me = useMe();
  const tours = useMyTours();
  const clubs = useMyClubs();
  const [busy, setBusy] = useState(false);
  if (!tours || !clubs) return <Loading />;
  const clubName = (id?: string | null) => clubs.find((c) => c.id === id)?.name;
  const live = tours.filter(isLive);
  const rest = tours.filter((t) => !isLive(t));
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Tours" right={<IconButton icon="enter-outline" onPress={() => router.push('/tour/join')} />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 60, gap: S.lg }}>
        <View style={{ paddingHorizontal: S.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Label>Clubs</Label>
          <Text onPress={() => router.push('/club/join')} style={{ fontFamily: F.semi, fontSize: 13, color: C.ink }}>
            Join a club
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.md, paddingHorizontal: S.lg }}>
          {clubs.map((c) => (
            <ClubCard key={c.id} club={c} tours={tours.filter((t) => t.clubId === c.id).length} />
          ))}
          <Pressable onPress={() => router.push('/club/new')} style={{ width: 150, height: 170, borderRadius: R.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.faint, alignItems: 'center', justifyContent: 'center', gap: S.sm, padding: S.md }}>
            <Icon name="add" size={26} />
            <Text style={{ fontFamily: F.bold, fontSize: 14, color: C.ink }}>Start a club</Text>
            <Text style={{ fontFamily: F.body, fontSize: 11, color: C.sub, textAlign: 'center' }}>Home to your tours, every year</Text>
          </Pressable>
        </ScrollView>

        <View style={{ paddingHorizontal: S.lg, gap: S.md }}>
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            <View style={{ flex: 1 }}>
              <Button title="New tour" icon="add" onPress={() => router.push('/tour/new')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Join with code" kind="secondary" onPress={() => router.push('/tour/join')} />
            </View>
          </View>

          {live.map((t) => (
            <TourCard key={t.id} t={t} club={clubName(t.clubId)} live />
          ))}
          {rest.length > 0 && <Label style={{ marginTop: S.sm }}>All tours</Label>}
          {rest.map((t) => (
            <TourCard key={t.id} t={t} club={clubName(t.clubId)} />
          ))}

          {tours.length === 0 && (
            <Empty icon="golf-outline" title="No tours yet">
              <P sub center>
                Create a tour and invite your group with its code, or join one a friend set up.
              </P>
              {backend.kind === 'offline' && (
                <Button
                  title="Load a sample club and tours"
                  kind="secondary"
                  busy={busy}
                  onPress={async () => {
                    setBusy(true);
                    await loadSample(me);
                    setBusy(false);
                  }}
                />
              )}
            </Empty>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ClubCard({ club, tours }: { club: Club; tours: number }) {
  return (
    <Pressable onPress={() => router.push(`/club/${club.id}`)} style={[{ width: 150, height: 170, borderRadius: R.lg, overflow: 'hidden', backgroundColor: C.ink }, shadow]}>
      <View style={{ height: 70 }}>{club.cover ? <Image source={{ uri: club.cover }} style={{ position: 'absolute', inset: 0 }} contentFit="cover" /> : <CoverArt />}</View>
      <View style={{ padding: S.md, marginTop: -26, gap: 4 }}>
        <View style={{ borderWidth: 2, borderColor: C.ink, borderRadius: 30, alignSelf: 'flex-start' }}>
          <Avatar name={club.name} uri={club.logo} size={40} />
        </View>
        <Text numberOfLines={1} style={{ fontFamily: F.displayBold, fontSize: 14, letterSpacing: 1.5, textTransform: 'uppercase', color: C.white }}>
          {club.name}
        </Text>
        <Text style={{ fontFamily: F.body, fontSize: 11, color: C.faint }}>
          {club.memberUids.length} members · {tours} tour{tours === 1 ? '' : 's'}
        </Text>
      </View>
    </Pressable>
  );
}

function TourCard({ t, club, live }: { t: Tour; club?: string; live?: boolean }) {
  const fg = live ? C.white : C.ink;
  return (
    <Pressable onPress={() => router.push(`/tour/${t.id}`)} style={({ pressed }) => [{ backgroundColor: live ? C.ink : C.card, borderRadius: R.lg, padding: S.lg, gap: 6, opacity: pressed ? 0.88 : 1 }, shadow]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
        {club ? (
          <Label color={live ? C.champagne : C.sub} style={{ flex: 1 }}>
            {club}
          </Label>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {live && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.live }} />
            <Text style={{ color: C.white, fontFamily: F.bold, fontSize: 10, letterSpacing: 1.2 }}>LIVE</Text>
          </View>
        )}
      </View>
      <Display size={20} color={fg}>
        {t.name}
      </Display>
      <Text style={{ fontFamily: F.body, fontSize: 13, color: live ? C.faint : C.sub }}>
        {[fmtRange(t.startDate, t.endDate), t.location].filter(Boolean).join(' · ')}
      </Text>
      <Text style={{ fontFamily: F.medium, fontSize: 12, color: live ? C.faint : C.sub }}>
        {t.players.length} players · {t.rounds.length} {t.rounds.length === 1 ? 'round' : 'rounds'}
        {t.cup ? ` · ${t.cup.name}` : ''}
      </Text>
    </Pressable>
  );
}

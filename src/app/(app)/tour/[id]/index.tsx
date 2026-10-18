import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backend } from '@/backend';
import * as E from '@/core/engine';
import { mainComp } from '@/core/notify';
import { fmtTotal } from '@/club/honours';
import { CoverArt } from '@/social/ProfileView';
import { isAdmin, useClub, useEvents, useMe, useTour } from '@/state/session';
import { fmtRange } from '@/tour/helpers';
import { TourReport } from '@/tour/Report';
import { CompPicker, CupView, Feed, Standings, TeeSheet, teamOf } from '@/tour/views';
import { shareText } from '@/ui/confirm';
import { Avatar, Button, Display, Empty, Icon, IconButton, Label, List, Loading, Num, P, Row, Screen, Segmented } from '@/ui/kit';
import { C, F, R, S } from '@/ui/theme';

type Tab = 'board' | 'cup' | 'report' | 'tee' | 'feed' | 'players';

export default function TourHub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { tour, scores } = useTour(id);
  const events = useEvents(id);
  const club = useClub(tour?.clubId ?? undefined);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('board');
  const [compId, setCompId] = useState<string>();
  const nextRound = useMemo(() => tour?.rounds.find((r) => r.date >= new Date().toISOString().slice(0, 10)) ?? tour?.rounds[tour.rounds.length - 1], [tour]);

  if (tour === undefined) return <Loading />;
  if (!tour)
    return (
      <Screen>
        <Empty icon="alert-circle-outline" title="This tour no longer exists" />
      </Screen>
    );
  const admin = isAdmin(tour, me.uid);
  const comp = tour.comps.find((c) => c.id === compId) ?? mainComp(tour) ?? tour.comps[0];
  const myPlayer = tour.players.find((p) => p.uid === me.uid);
  const follow = me.notify.follow ?? [];
  const toggleFollow = (pid: string) =>
    backend.updateProfile(me.uid, { notify: { ...me.notify, follow: follow.includes(pid) ? follow.filter((x) => x !== pid) : [...follow, pid] } });

  const tabs: { value: Tab; label: string }[] = [
    { value: 'board', label: 'Leaderboard' },
    ...(tour.cup ? [{ value: 'cup' as Tab, label: tour.cup.name }] : []),
    { value: 'report', label: 'Report' },
    { value: 'tee', label: 'Tee times' },
    { value: 'feed', label: 'Feed' },
    { value: 'players', label: 'Players' },
  ];

  const M = E.model(tour, scores);
  const main = mainComp(tour);
  const lead = main ? E.leaderboard(M, main).rows.filter((r) => r.pos === 1 && r.total != null) : [];
  const cupNow = tour.cup ? E.cup(M) : null;
  const teamName = (tid?: string) => teamOf(tour, tid)?.name ?? '';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <View style={{ backgroundColor: C.ink, paddingTop: insets.top + 6, paddingHorizontal: S.lg, paddingBottom: S.xl, gap: S.md, overflow: 'hidden' }}>
        <CoverArt />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -8 }}>
          <IconButton icon="chevron-back" color={C.white} onPress={() => (router.canGoBack() ? router.back() : router.replace('/tours'))} />
          <View style={{ flexDirection: 'row' }}>
            <IconButton icon="share-outline" color={C.white} onPress={() => shareText(`Join "${tour.name}" on Tour Card with code ${tour.joinCode}`)} />
            {admin && <IconButton icon="settings-outline" color={C.white} onPress={() => router.push(`/tour/${tour.id}/manage`)} />}
          </View>
        </View>
        {club ? (
          <Pressable onPress={() => router.push(`/club/${club.id}`)}>
            <Label color={C.champagne}>{club.name}</Label>
          </Pressable>
        ) : null}
        <Display size={30} color={C.white}>
          {tour.name}
        </Display>
        <Text style={{ color: C.faint, fontFamily: F.medium, fontSize: 13 }}>{[fmtRange(tour.startDate, tour.endDate), tour.location].filter(Boolean).join('  ·  ')}</Text>
        <View style={{ flexDirection: 'row', gap: S.md, marginTop: S.sm }}>
          {lead.length > 0 && main && (
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#2E2E2C', borderRadius: R.md, padding: S.md, gap: 4, backgroundColor: 'rgba(11,11,11,0.6)' }}>
              <Label color={C.faint} style={{ fontSize: 9 }}>
                {main.name}
              </Label>
              <Text numberOfLines={1} style={{ color: C.white, fontFamily: F.bold, fontSize: 15 }}>
                {lead.map((r) => r.name.split(' ')[0]).join(' & ')}
              </Text>
              <Num size={24} color={C.champagne}>
                {fmtTotal(main, lead[0].total)}
              </Num>
            </View>
          )}
          {cupNow && cupNow.matches.length > 0 && (
            <View style={{ flex: 1, borderWidth: 1, borderColor: '#2E2E2C', borderRadius: R.md, padding: S.md, gap: 4, backgroundColor: 'rgba(11,11,11,0.6)' }}>
              <Label color={C.faint} style={{ fontSize: 9 }}>
                {tour.cup!.name}
              </Label>
              <Text numberOfLines={1} style={{ color: C.white, fontFamily: F.bold, fontSize: 15 }}>
                {teamName(cupNow.teamA)} v {teamName(cupNow.teamB)}
              </Text>
              <Num size={24} color={C.champagne}>
                {fmtCup(cupNow.a)}–{fmtCup(cupNow.b)}
              </Num>
            </View>
          )}
        </View>
      </View>

      <View style={{ padding: S.lg, gap: S.md }}>
      {myPlayer && nextRound && nextRound.groups.some((g) => g.ids.includes(myPlayer.id)) && (
        <Button
          title={`Score my group · ${nextRound.name}`}
          icon="create-outline"
          onPress={() => router.push(`/tour/${tour.id}/score?rid=${nextRound.id}&gid=${nextRound.groups.find((g) => g.ids.includes(myPlayer.id))!.id}`)}
        />
      )}
      {!myPlayer && (
        <Button title="Which player are you?" kind="secondary" icon="person-add-outline" onPress={() => router.push(`/tour/${tour.id}/players?claim=1`)} />
      )}

      <Segmented value={tab} options={tabs} onChange={setTab} />

      {tab === 'board' &&
        (comp ? (
          <>
            <CompPicker tour={tour} value={comp.id} onChange={setCompId} />
            <Standings tour={tour} scores={scores} comp={comp} />
          </>
        ) : (
          <Empty icon="podium-outline" title="No games set up" />
        ))}
      {tab === 'cup' && <CupView tour={tour} scores={scores} />}
      {tab === 'report' && <TourReport tour={tour} scores={scores} />}
      {tab === 'tee' && <TeeSheet tour={tour} canScore={tour.memberUids.includes(me.uid)} />}
      {tab === 'feed' && <Feed events={events} />}
      {tab === 'players' && (
        <>
          <P sub style={{ fontSize: 13 }}>
            Tap the star to get a notification for every score a player posts.{nextRound ? ` Playing handicaps are for ${nextRound.name}.` : ''}
          </P>
          <List>
            {tour.players.map((p) => (
              <Row
                key={p.id}
                left={<Avatar name={p.name} color={teamOf(tour, p.team)?.color} />}
                onPress={p.uid ? () => router.push(`/user/${p.uid}`) : undefined}
                chevron={false}
                title={p.name + (p.uid === me.uid ? ' (you)' : '')}
                subtitle={[
                  teamOf(tour, p.team)?.name,
                  p.hi != null ? `Index ${p.hi}` : 'No index',
                  nextRound ? `Plays off ${M.chOf(nextRound, p.id)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                right={
                  <Pressable hitSlop={10} onPress={() => toggleFollow(p.id)}>
                    <Icon name={follow.includes(p.id) ? 'star' : 'star-outline'} color={follow.includes(p.id) ? C.ink : C.faint} />
                  </Pressable>
                }
              />
            ))}
          </List>
        </>
      )}
      </View>
    </ScrollView>
  );
}

const fmtCup = (n: number) => (n % 1 ? `${Math.floor(n)}½` : String(n));

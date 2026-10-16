import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';

import { backend } from '@/backend';
import * as E from '@/core/engine';
import { mainComp } from '@/core/notify';
import { isAdmin, useEvents, useMe, useTour } from '@/state/session';
import { fmtRange } from '@/tour/helpers';
import { CompPicker, CupView, Feed, Standings, TeeSheet, teamOf } from '@/tour/views';
import { Avatar, Button, Empty, Icon, List, Loading, P, Row, Screen, Segmented } from '@/ui/kit';
import { C, S } from '@/ui/theme';

type Tab = 'board' | 'cup' | 'tee' | 'feed' | 'players';

export default function TourHub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { tour, scores } = useTour(id);
  const events = useEvents(id);
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
    { value: 'tee', label: 'Tee times' },
    { value: 'feed', label: 'Feed' },
    { value: 'players', label: 'Players' },
  ];

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: tour.name,
          headerRight: admin
            ? () => (
                <Pressable onPress={() => router.push(`/tour/${tour.id}/manage`)} hitSlop={10}>
                  <Icon name="settings-outline" color="#fff" size={22} />
                </Pressable>
              )
            : undefined,
        }}
      />
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: C.ink }}>{tour.name}</Text>
        <P sub>{[fmtRange(tour.startDate, tour.endDate), tour.location].filter(Boolean).join(' · ')}</P>
        <Pressable onPress={() => Share.share({ message: `Join "${tour.name}" on Tour Card with code ${tour.joinCode}` })} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name="share-social-outline" size={16} color={C.brand} />
          <Text style={{ color: C.brand, fontWeight: '700' }}>Invite code {tour.joinCode}</Text>
        </Pressable>
      </View>

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
                title={p.name + (p.uid === me.uid ? ' (you)' : '')}
                subtitle={[
                  teamOf(tour, p.team)?.name,
                  p.hi != null ? `Index ${p.hi}` : 'No index',
                  nextRound ? `Plays off ${E.model(tour, scores).chOf(nextRound, p.id)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                right={
                  <Pressable hitSlop={10} onPress={() => toggleFollow(p.id)}>
                    <Icon name={follow.includes(p.id) ? 'star' : 'star-outline'} color={follow.includes(p.id) ? C.accent : C.faint} />
                  </Pressable>
                }
              />
            ))}
          </List>
        </>
      )}
      <View style={{ height: S.lg }} />
    </Screen>
  );
}

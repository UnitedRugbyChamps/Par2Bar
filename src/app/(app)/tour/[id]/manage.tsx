import { router, Stack, useLocalSearchParams } from 'expo-router';

import { useTour } from '@/state/session';
import { compLabel } from '@/tour/helpers';
import { H, Icon, List, Loading, P, Row, Screen } from '@/ui/kit';
import { C } from '@/ui/theme';

export default function Manage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tour } = useTour(id);
  if (!tour) return <Loading />;
  const go = (p: string) => () => router.push(`/tour/${id}/${p}`);
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Manage tour' }} />
      <P sub>Set it up in this order: players, rounds and tee times, then the games.</P>
      <List>
        <Row left={<Icon name="information-circle-outline" color={C.brand} />} title="Tour details" subtitle={`Name, dates, time zone · code ${tour.joinCode}`} onPress={go('settings')} />
        <Row left={<Icon name="people-outline" color={C.brand} />} title="Players and teams" subtitle={`${tour.players.length} players · ${tour.teams.length} teams`} onPress={go('players')} />
      </List>
      <H right={<P sub>{tour.rounds.length}</P>}>Rounds and tee times</H>
      <List>
        {tour.rounds.map((r) => (
          <Row key={r.id} title={r.name} subtitle={`${r.date} · ${r.course.name || 'no course yet'} · ${r.groups.length} ${r.groups.length === 1 ? "group" : "groups"}`} onPress={() => router.push(`/tour/${id}/round?rid=${r.id}`)} />
        ))}
        <Row left={<Icon name="add-circle" color={C.brand} />} title="Add a round" onPress={() => router.push(`/tour/${id}/round?rid=new`)} />
      </List>
      <H>Games</H>
      <List>
        {tour.comps.map((c) => (
          <Row key={c.id} title={c.name + (c.main ? '  ★' : '')} subtitle={`${compLabel(c.type)} · ${c.basis} · ${c.allowance}%`} onPress={() => router.push(`/tour/${id}/game?cid=${c.id}`)} />
        ))}
        <Row left={<Icon name="add-circle" color={C.brand} />} title="Add a game" onPress={() => router.push(`/tour/${id}/game?cid=new`)} />
      </List>
      <H>Team cup</H>
      <List>
        <Row
          left={<Icon name="flag-outline" color={C.brand} />}
          title={tour.cup ? tour.cup.name : 'Set up a Ryder Cup style team match'}
          subtitle={tour.cup ? `${tour.cup.sessions.length} sessions · ${tour.cup.sessions.reduce((a, s) => a + s.matches.length, 0)} matches` : 'Fourballs, foursomes and singles between two teams'}
          onPress={go('cup')}
        />
      </List>
    </Screen>
  );
}

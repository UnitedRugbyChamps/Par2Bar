import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { backend, newId } from '@/backend';
import type { Player, Team, UserProfile } from '@/core/types';
import { isAdmin, useMe, useTour } from '@/state/session';
import { teamOf } from '@/tour/views';
import { confirm } from '@/ui/confirm';
import { Avatar, Button, Card, Chip, Field, H, Icon, List, Loading, P, Row, Screen } from '@/ui/kit';
import { C, S, teamColors } from '@/ui/theme';

export default function Players() {
  const { id, claim } = useLocalSearchParams<{ id: string; claim?: string }>();
  const me = useMe();
  const { tour } = useTour(id);
  const [editing, setEditing] = useState<Player | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const memberKey = tour?.memberUids.join(',');
  useEffect(() => {
    if (memberKey) backend.getUsers(memberKey.split(',')).then(setMembers);
  }, [memberKey]);
  if (!tour) return <Loading />;
  const admin = isAdmin(tour, me.uid);
  const mine = tour.players.find((p) => p.uid === me.uid);
  const savePlayers = (players: Player[]) => backend.updateTour(tour.id, { players });
  const saveTeams = (teams: Team[]) => backend.updateTour(tour.id, { teams });
  const unlinked = members.filter((m) => !tour.players.some((p) => p.uid === m.uid));

  // members who just joined pick which player they are
  if (claim && !mine) {
    const open = tour.players.filter((p) => !p.uid);
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Which player are you?' }} />
        <P sub>Pick your name so your handicap and notifications follow you. If you're not listed, add yourself.</P>
        <List>
          {open.map((p) => (
            <Row
              key={p.id}
              left={<Avatar name={p.name} color={teamOf(tour, p.team)?.color} />}
              title={p.name}
              subtitle={p.hi != null ? `Index ${p.hi}` : undefined}
              onPress={async () => {
                await savePlayers(tour.players.map((x) => (x.id === p.id ? { ...x, uid: me.uid, hi: x.hi ?? me.hi } : x)));
                router.replace(`/tour/${tour.id}`);
              }}
            />
          ))}
        </List>
        <Button
          title="Add me as a new player"
          kind="secondary"
          onPress={async () => {
            await savePlayers([...tour.players, { id: newId('p'), name: me.name, uid: me.uid, hi: me.hi }]);
            router.replace(`/tour/${tour.id}`);
          }}
        />
        <Button title="I'm just following" kind="ghost" onPress={() => router.replace(`/tour/${tour.id}`)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Players and teams' }} />
      {!admin && <P sub>Only organisers can change players and teams.</P>}

      <H>Teams</H>
      <P sub>Teams are used for the team cup and to colour the leaderboard. Leave them empty for an individual tour.</P>
      <List>
        {tour.teams.map((t, i) => (
          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.lg, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
            <Avatar name={t.name} color={t.color} size={28} />
            <View style={{ flex: 1 }}>
              <Field label={`Team ${i + 1}`} defaultValue={t.name} editable={admin} onEndEditing={(e) => saveTeams(tour.teams.map((x) => (x.id === t.id ? { ...x, name: e.nativeEvent.text.trim() || x.name } : x)))} />
            </View>
            {admin && (
              <Button
                small
                kind="ghost"
                title=""
                icon="trash-outline"
                onPress={() =>
                  confirm('Remove team?', `${t.name} will be removed and its players left without a team.`, () =>
                    backend.updateTour(tour.id, { teams: tour.teams.filter((x) => x.id !== t.id), players: tour.players.map((p) => (p.team === t.id ? { ...p, team: undefined } : p)) }),
                  )
                }
              />
            )}
          </View>
        ))}
        {admin && <Row left={<Icon name="add-circle" color={C.brand} />} title="Add a team" onPress={() => saveTeams([...tour.teams, { id: newId('t'), name: `Team ${tour.teams.length + 1}`, color: teamColors[tour.teams.length % teamColors.length] }])} />}
      </List>

      <H right={<P sub>{tour.players.length}</P>}>Players</H>
      {editing && admin && <PlayerEditor key={editing.id} tour={tour} player={editing} onDone={() => setEditing(null)} />}
      <List>
        {tour.players.map((p) => (
          <Row
            key={p.id}
            left={<Avatar name={p.name} color={teamOf(tour, p.team)?.color} />}
            title={p.name}
            subtitle={[teamOf(tour, p.team)?.name, p.hi != null ? `Index ${p.hi}` : 'No index', p.uid ? 'has the app' : null].filter(Boolean).join(' · ')}
            onPress={admin ? () => setEditing(p) : undefined}
          />
        ))}
        {admin && <Row left={<Icon name="person-add-outline" color={C.brand} />} title="Add a player" subtitle="Players don't need the app to be scored" onPress={() => setEditing({ id: newId('p'), name: '', hi: null })} />}
      </List>

      {admin && unlinked.length > 0 && (
        <>
          <H>Members not yet playing</H>
          <List>
            {unlinked.map((m) => (
              <Row key={m.uid} title={m.name} subtitle={m.hi != null ? `Index ${m.hi}` : m.email} right={<Icon name="add-circle-outline" color={C.brand} />} onPress={() => savePlayers([...tour.players, { id: newId('p'), name: m.name, uid: m.uid, hi: m.hi }])} />
            ))}
          </List>
        </>
      )}
    </Screen>
  );
}

function PlayerEditor({ tour, player, onDone }: { tour: import('@/core/types').Tour; player: Player; onDone: () => void }) {
  const [name, setName] = useState(player.name);
  const [hi, setHi] = useState(player.hi == null ? '' : String(player.hi));
  const [team, setTeam] = useState(player.team);
  const exists = tour.players.some((p) => p.id === player.id);
  const hiNum = hi.trim() === '' ? null : Number(hi.replace(',', '.').replace(/^\+/, '-'));
  const valid = name.trim() && (hiNum == null || (!Number.isNaN(hiNum) && hiNum >= -10 && hiNum <= 54));
  const save = async () => {
    const p: Player = { ...player, name: name.trim(), hi: hiNum, team };
    await backend.updateTour(tour.id, { players: exists ? tour.players.map((x) => (x.id === p.id ? p : x)) : [...tour.players, p] });
    onDone();
  };
  return (
    <Card>
      <Field label="Name" value={name} onChangeText={setName} autoFocus={!exists} />
      <Field label="Handicap index" value={hi} onChangeText={setHi} keyboardType="numbers-and-punctuation" hint="WHS index, e.g. 12.4. Plus handicaps as +1.2" />
      {tour.teams.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <Chip label="No team" on={!team} onPress={() => setTeam(undefined)} />
          {tour.teams.map((t) => (
            <Chip key={t.id} label={t.name} color={t.color} on={team === t.id} onPress={() => setTeam(t.id)} />
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: S.sm }}>
        <View style={{ flex: 1 }}>
          <Button title="Cancel" kind="secondary" onPress={onDone} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Save" onPress={save} disabled={!valid} />
        </View>
      </View>
      {exists && (
        <Button
          title="Remove player"
          kind="ghost"
          onPress={() =>
            confirm('Remove player?', `${player.name}'s scores stay saved but leave the leaderboards.`, async () => {
              await backend.updateTour(tour.id, {
                players: tour.players.filter((x) => x.id !== player.id),
                rounds: tour.rounds.map((r) => ({ ...r, groups: r.groups.map((g) => ({ ...g, ids: g.ids.filter((i) => i !== player.id) })) })),
              });
              onDone();
            })
          }
        />
      )}
    </Card>
  );
}

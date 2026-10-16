import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { backend, newId } from '@/backend';
import type { Cup, CupFormat, Tour } from '@/core/types';
import { useTour } from '@/state/session';
import { confirm } from '@/ui/confirm';
import { Button, Card, Chip, Empty, Field, H, Icon, List, Loading, P, Row, Screen, Toggle } from '@/ui/kit';
import { C } from '@/ui/theme';

const FORMATS: { f: CupFormat; label: string; size: number }[] = [
  { f: 'fourball', label: 'Fourballs (better ball)', size: 2 },
  { f: 'foursomes', label: 'Foursomes (alternate shot)', size: 2 },
  { f: 'singles', label: 'Singles', size: 1 },
];

export default function CupEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tour } = useTour(id);
  if (!tour) return <Loading />;
  return <CupForm tour={tour} />;
}

function CupForm({ tour }: { tour: Tour }) {
  const [cup, setCup] = useState<Cup | null>(() => (tour.cup ? structuredClone(tour.cup) : null));
  if (tour.teams.length < 2)
    return (
      <Screen>
        <Empty icon="people-outline" title="Add two teams first">
          <Button title="Players and teams" onPress={() => router.replace(`/tour/${tour.id}/players`)} />
        </Empty>
      </Screen>
    );
  if (!cup)
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Team cup' }} />
        <P>Run a Ryder Cup style match between two teams: fourballs, foursomes and singles, one point a match.</P>
        <Button title="Set up a team cup" onPress={() => setCup({ name: 'Ryder Cup', teamA: tour.teams[0].id, teamB: tour.teams[1].id, hcpMode: 'full', sessions: [] })} />
      </Screen>
    );

  const patch = (p: Partial<Cup>) => setCup({ ...cup, ...p });
  const team = (tid: string) => tour.teams.find((t) => t.id === tid);
  const save = async () => {
    await backend.updateTour(tour.id, { cup });
    router.back();
  };
  return (
    <Screen>
      <Stack.Screen options={{ title: cup.name || 'Team cup' }} />
      <Field label="Name" value={cup.name} onChangeText={(name) => patch({ name })} />
      <TeamPick tour={tour} label="Team A" value={cup.teamA} onChange={(teamA) => patch({ teamA })} />
      <TeamPick tour={tour} label="Team B" value={cup.teamB} onChange={(teamB) => patch({ teamB })} />
      <List>
        <Toggle label="Strokes off the lowest handicap" sub="Off: every player gets their full playing handicap" value={cup.hcpMode === 'diff'} onChange={(v) => patch({ hcpMode: v ? 'diff' : 'full' })} />
      </List>

      {cup.sessions.map((s, si) => {
        const fmt = FORMATS.find((x) => x.f === s.format)!;
        const usedA = new Set(s.matches.flatMap((m) => m.a));
        const usedB = new Set(s.matches.flatMap((m) => m.b));
        const setS = (p: Partial<typeof s>) => patch({ sessions: cup.sessions.map((x, i) => (i === si ? { ...x, ...p } : x)) });
        return (
          <View key={s.id} style={{ gap: 8 }}>
            <H right={<Button small kind="ghost" title="" icon="trash-outline" onPress={() => patch({ sessions: cup.sessions.filter((_, i) => i !== si) })} />}>Session {si + 1}</H>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {tour.rounds.map((r) => (
                <Chip key={r.id} label={r.name} on={s.rid === r.id} onPress={() => setS({ rid: r.id })} />
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {FORMATS.map((f) => (
                <Chip key={f.f} label={f.label} on={s.format === f.f} onPress={() => setS({ format: f.f, matches: [] })} />
              ))}
            </View>
            {s.matches.map((m, mi) => (
              <Card key={mi}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ flex: 1, fontWeight: '700' }}>Match {mi + 1}</Text>
                  <Button small kind="ghost" title="" icon="trash-outline" onPress={() => setS({ matches: s.matches.filter((_, i) => i !== mi) })} />
                </View>
                {(['a', 'b'] as const).map((side) => {
                  const tid = side === 'a' ? cup.teamA : cup.teamB;
                  const used = side === 'a' ? usedA : usedB;
                  return (
                    <View key={side} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {tour.players
                        .filter((p) => p.team === tid && (m[side].includes(p.id) || !used.has(p.id)))
                        .map((p) => (
                          <Chip
                            key={p.id}
                            label={p.name}
                            color={team(tid)?.color}
                            on={m[side].includes(p.id)}
                            onPress={() => {
                              const cur = m[side];
                              const next = cur.includes(p.id) ? cur.filter((x) => x !== p.id) : cur.length < fmt.size ? [...cur, p.id] : cur;
                              setS({ matches: s.matches.map((x, i) => (i === mi ? { ...x, [side]: next } : x)) });
                            }}
                          />
                        ))}
                    </View>
                  );
                })}
              </Card>
            ))}
            <List>
              <Row left={<Icon name="add-circle" color={C.brand} />} title="Add a match" onPress={() => setS({ matches: [...s.matches, { a: [], b: [] }] })} />
            </List>
          </View>
        );
      })}
      <List>
        <Row left={<Icon name="add-circle" color={C.brand} />} title="Add a session" subtitle="One format on one round" onPress={() => patch({ sessions: [...cup.sessions, { id: newId('s'), rid: tour.rounds[0]?.id ?? '', format: 'fourball', matches: [] }] })} />
      </List>
      {!tour.players.some((p) => p.team === cup.teamA) && <P sub>No players are on {team(cup.teamA)?.name} yet. Set teams under Players and teams.</P>}
      <Button title="Save cup" onPress={save} disabled={cup.teamA === cup.teamB} />
      {tour.cup && (
        <Button
          title="Remove team cup"
          kind="ghost"
          onPress={() =>
            confirm('Remove the team cup?', 'Scores are kept.', async () => {
              await backend.updateTour(tour.id, { cup: null });
              router.back();
            })
          }
        />
      )}
    </Screen>
  );
}

function TeamPick({ tour, label, value, onChange }: { tour: Tour; label: string; value: string; onChange: (id: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <P sub>{label}</P>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {tour.teams.map((t) => (
          <Chip key={t.id} label={t.name} color={t.color} on={value === t.id} onPress={() => onChange(t.id)} />
        ))}
      </View>
    </View>
  );
}

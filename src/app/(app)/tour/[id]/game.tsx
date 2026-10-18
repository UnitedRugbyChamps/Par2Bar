import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { backend } from '@/backend';
import type { Comp, CompType, Pairing, Tour } from '@/core/types';
import { useTour } from '@/state/session';
import { COMP_TYPES, newComp } from '@/tour/helpers';
import { confirm } from '@/ui/confirm';
import { Button, Card, Chip, Field, H, Icon, List, Loading, P, Row, Screen, Toggle } from '@/ui/kit';
import { C, F, S } from '@/ui/theme';

export default function GameEditor() {
  const { id, cid } = useLocalSearchParams<{ id: string; cid: string }>();
  const { tour } = useTour(id);
  if (!tour) return <Loading />;
  const existing = tour.comps.find((x) => x.id === cid);
  return <GameForm key={cid} tour={tour} initial={existing ? structuredClone(existing) : null} />;
}

const CUTS: { label: string; cut: Comp['cut'] }[] = [
  { label: 'No cut', cut: null },
  { label: 'Top half and ties', cut: { mode: 'percent', value: 50 } },
  { label: 'Top 60% and ties', cut: { mode: 'percent', value: 60 } },
  { label: 'Top 10 and ties', cut: { mode: 'top', value: 10 } },
  { label: 'Top 20 and ties', cut: { mode: 'top', value: 20 } },
];

function GameForm({ tour, initial }: { tour: Tour; initial: Comp | null }) {
  const [c, setC] = useState<Comp | null>(initial);

  if (!c)
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Add a game' }} />
        <P sub>Pick a format. You can run as many games at once as you like.</P>
        <List>
          {COMP_TYPES.map((t) => (
            <Row key={t.type} title={t.label} subtitle={t.about} onPress={() => setC(newComp(t.type))} />
          ))}
        </List>
      </Screen>
    );

  const isNew = !tour.comps.some((x) => x.id === c.id);
  const patch = (p: Partial<Comp>) => setC({ ...c, ...p });
  const save = async () => {
    let comps = isNew ? [...tour.comps, c] : tour.comps.map((x) => (x.id === c.id ? c : x));
    if (c.main) comps = comps.map((x) => (x.id === c.id ? x : { ...x, main: false }));
    await backend.updateTour(tour.id, { comps });
    router.back();
  };
  const h2h = ['match', 'nassau', 'lowhigh'].includes(c.type);

  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? 'New game' : c.name }} />
      <Field label="Name" value={c.name} onChangeText={(name) => patch({ name })} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {COMP_TYPES.map((t) => (
          <Chip key={t.type} label={t.label} on={c.type === t.type} onPress={() => patch({ type: t.type as CompType, pairings: ['match', 'nassau', 'lowhigh'].includes(t.type) ? (c.pairings ?? []) : c.pairings })} />
        ))}
      </View>
      <P sub>{COMP_TYPES.find((t) => t.type === c.type)?.about}</P>

      <H>Scoring</H>
      <List>
        {c.type !== 'stableford' && <Toggle label="Use handicaps (net)" sub="Off for gross scores" value={c.basis === 'net'} onChange={(v) => patch({ basis: v ? 'net' : 'gross' })} />}
        {c.type === 'stableford' && (
          <Toggle label="Show as 36 a round" sub="Off: total points, most wins. On: 36 per round minus points, lowest wins" value={c.display === 'vs36'} onChange={(v) => patch({ display: v ? 'vs36' : 'points' })} />
        )}
        {c.type === 'skins' && <Toggle label="Carry over ties" value={!!c.carry} onChange={(carry) => patch({ carry })} />}
        {(c.type === 'stableford' || c.type === 'stroke') && <Toggle label="Headline competition" sub="Shown first on the tour page and drives lead-change notifications" value={!!c.main} onChange={(main) => patch({ main })} />}
      </List>
      {['stableford', 'stroke', 'bogey'].includes(c.type) && (
        <>
          <H>Cut</H>
          <P sub>Made on the final round's leaderboard only. The pros cut after two rounds to the top 65 and ties; for a tour of friends, the top half and ties works well.</P>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {CUTS.map((x) => (
              <Chip key={x.label} label={x.label} on={JSON.stringify(c.cut ?? null) === JSON.stringify(x.cut)} onPress={() => patch({ cut: x.cut })} />
            ))}
          </View>
        </>
      )}
      <Field
        label="Handicap allowance %"
        value={String(c.allowance)}
        keyboardType="number-pad"
        onChangeText={(v) => patch({ allowance: Math.max(0, Math.min(100, parseInt(v, 10) || 0)) })}
        hint="WHS suggests 95% for individual stroke play and 85% for fourball stroke play"
      />

      <H>Rounds</H>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Chip label="All rounds" on={!c.rounds.length} onPress={() => patch({ rounds: [] })} />
        {tour.rounds.map((r) => (
          <Chip key={r.id} label={r.name} on={c.rounds.includes(r.id)} onPress={() => patch({ rounds: c.rounds.includes(r.id) ? c.rounds.filter((x) => x !== r.id) : [...c.rounds, r.id] })} />
        ))}
      </View>
      {c.type === 'scramble' && <P sub>Set the scramble teams on each round's page.</P>}

      {h2h && <Pairings tour={tour} c={c} patch={patch} />}

      <Button title={isNew ? 'Add game' : 'Save game'} onPress={save} disabled={!c.name.trim()} />
      {!isNew && (
        <Button
          title="Delete game"
          kind="ghost"
          onPress={() =>
            confirm('Delete game?', 'Scores are kept; only this game is removed.', async () => {
              await backend.updateTour(tour.id, { comps: tour.comps.filter((x) => x.id !== c.id) });
              router.back();
            })
          }
        />
      )}
    </Screen>
  );
}

function Pairings({ tour, c, patch }: { tour: Tour; c: Comp; patch: (p: Partial<Comp>) => void }) {
  const ps = c.pairings || [];
  const set = (i: number, p: Partial<Pairing>) => patch({ pairings: ps.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  return (
    <>
      <H>Pairings</H>
      <P sub>One player a side for singles, two for better ball. Tap a name once for side A, again for side B, again to clear.</P>
      {ps.map((p, i) => (
        <Card key={i}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontFamily: F.bold }}>Match {i + 1}</Text>
            <Button small kind="ghost" title="" icon="trash-outline" onPress={() => patch({ pairings: ps.filter((_, j) => j !== i) })} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {tour.rounds.map((r) => (
              <Chip key={r.id} label={r.name} on={p.rid === r.id} onPress={() => set(i, { rid: r.id })} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {tour.players.map((pl) => {
              const side = p.a.includes(pl.id) ? 'A' : p.b.includes(pl.id) ? 'B' : null;
              return (
                <Chip
                  key={pl.id}
                  label={side ? `${side} · ${pl.name}` : pl.name}
                  on={!!side}
                  color={side === 'A' ? '#1F5FBF' : '#C8312B'}
                  onPress={() => {
                    if (!side) set(i, { a: [...p.a, pl.id] });
                    else if (side === 'A') set(i, { a: p.a.filter((x) => x !== pl.id), b: [...p.b, pl.id] });
                    else set(i, { b: p.b.filter((x) => x !== pl.id) });
                  }}
                />
              );
            })}
          </View>
        </Card>
      ))}
      <List>
        <Row left={<Icon name="add-circle" color={C.brand} />} title="Add a match" onPress={() => patch({ pairings: [...ps, { rid: tour.rounds[0]?.id ?? '', a: [], b: [] }] })} />
      </List>
      <View style={{ height: S.sm }} />
    </>
  );
}

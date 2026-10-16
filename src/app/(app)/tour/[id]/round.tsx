import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { backend, newId } from '@/backend';
import { CourseSearch } from '@/courses/CourseSearch';
import { courseHcp } from '@/core/engine';
import type { Course, Round, Tour } from '@/core/types';
import { useTour } from '@/state/session';
import { autoGroups, blankRound } from '@/tour/helpers';
import { confirm } from '@/ui/confirm';
import { Button, Card, Chip, Field, H, Icon, List, Loading, P, Row, Screen } from '@/ui/kit';
import { C, S } from '@/ui/theme';

export default function RoundEditor() {
  const { id, rid } = useLocalSearchParams<{ id: string; rid: string }>();
  const { tour } = useTour(id);
  if (!tour) return <Loading />;
  const existing = tour.rounds.find((x) => x.id === rid);
  return <RoundForm key={rid} tour={tour} initial={existing ? structuredClone(existing) : blankRound(tour)} />;
}

function RoundForm({ tour, initial }: { tour: Tour; initial: Round }) {
  const [r, setR] = useState<Round>(initial);
  const [picking, setPicking] = useState(!initial.course.name);
  const [course, setCourse] = useState<Course | null>(null);
  const courseId = r.course.courseId;
  useEffect(() => {
    if (courseId) backend.getCourse(courseId).then(setCourse);
  }, [courseId]);
  const isNew = !tour.rounds.some((x) => x.id === r.id);
  const patch = (p: Partial<Round>) => setR({ ...r, ...p });
  const save = async () => {
    const rounds = isNew ? [...tour.rounds, r] : tour.rounds.map((x) => (x.id === r.id ? r : x));
    rounds.sort((a, b) => a.date.localeCompare(b.date));
    await backend.updateTour(tour.id, { rounds });
    router.back();
  };
  const pickTee = (c: Course, i: number) => {
    const t = c.tees[i];
    patch({ course: { courseId: c.id, name: c.name, tee: t.name, rating: t.rating, slope: t.slope, par: t.par, si: t.si } });
  };
  const usesScramble = tour.comps.some((c) => c.type === 'scramble' && (!c.rounds.length || c.rounds.includes(r.id)));

  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? 'New round' : r.name }} />
      <Field label="Round name" value={r.name} onChangeText={(name) => patch({ name })} />
      <Field label="Date" value={r.date} onChangeText={(date) => patch({ date })} placeholder="YYYY-MM-DD" />

      <H>Course</H>
      {r.course.name && !picking ? (
        <Card>
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink }}>{r.course.name}</Text>
          <P sub>
            {r.course.tee} tees · par {r.course.par.reduce((a, b) => a + b, 0)}
            {r.course.rating ? ` · rating ${r.course.rating} / slope ${r.course.slope}` : ' · no rating or slope, handicaps use the index'}
          </P>
          {course && course.tees.length > 1 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {course.tees.map((t, i) => (
                <Chip key={t.name + i} label={t.name} on={t.name === r.course.tee} onPress={() => pickTee(course, i)} />
              ))}
            </View>
          )}
          <Button small kind="secondary" title="Change course" onPress={() => setPicking(true)} />
        </Card>
      ) : (
        <>
          <CourseSearch
            onPick={(c) => {
              if (!c.tees.length) return;
              setCourse(c);
              pickTee(c, 0);
              setPicking(false);
            }}
          />
          <Button small kind="ghost" icon="add" title="Course not listed? Add it" onPress={() => router.push('/course/new')} />
        </>
      )}

      <Groups tour={tour} r={r} patch={patch} />

      <H>Handicaps</H>
      <P sub>Playing handicaps come from each player's index and this tee's slope and rating. Type a number to override one.</P>
      <List>
        {tour.players.map((p) => {
          const auto = courseHcp(p.hi, r.course);
          const o = r.hcp?.[p.id];
          return (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.lg, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: C.ink }}>{p.name}</Text>
                <Text style={{ fontSize: 12, color: C.sub }}>
                  Index {p.hi ?? '–'} → plays off {auto}
                </Text>
              </View>
              <View style={{ width: 80 }}>
                <Field
                  label="Override"
                  value={o == null ? '' : String(o)}
                  keyboardType="numbers-and-punctuation"
                  placeholder={String(auto)}
                  onChangeText={(v) => {
                    const hcp = { ...(r.hcp || {}) };
                    const n = parseInt(v, 10);
                    if (v.trim() === '' || Number.isNaN(n)) delete hcp[p.id];
                    else hcp[p.id] = n;
                    patch({ hcp });
                  }}
                />
              </View>
            </View>
          );
        })}
      </List>

      {usesScramble && <Scramble tour={tour} r={r} patch={patch} />}

      <Button title={isNew ? 'Add round' : 'Save round'} onPress={save} disabled={!r.course.name || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)} />
      {!isNew && (
        <Button
          title="Delete round"
          kind="ghost"
          onPress={() =>
            confirm('Delete round?', 'Its scores and any cup matches on it are removed.', async () => {
              await backend.updateTour(tour.id, {
                rounds: tour.rounds.filter((x) => x.id !== r.id),
                cup: tour.cup ? { ...tour.cup, sessions: tour.cup.sessions.filter((s) => s.rid !== r.id) } : null,
                comps: tour.comps.map((c) => ({ ...c, rounds: c.rounds.filter((x) => x !== r.id), ...(c.pairings ? { pairings: c.pairings.filter((p) => p.rid !== r.id) } : {}) })),
              });
              router.back();
            })
          }
        />
      )}
    </Screen>
  );
}

function Groups({ tour, r, patch }: { tour: Tour; r: Round; patch: (p: Partial<Round>) => void }) {
  const [first, setFirst] = useState(r.groups[0]?.teeTime || '08:00');
  const [gap, setGap] = useState('10');
  const [size, setSize] = useState('4');
  const placed = new Set(r.groups.flatMap((g) => g.ids));
  const name = (id: string) => tour.players.find((p) => p.id === id)?.name ?? '?';
  const toggle = (gi: number, pid: string) => {
    const groups = r.groups.map((g, i) => ({ ...g, ids: i === gi ? (g.ids.includes(pid) ? g.ids.filter((x) => x !== pid) : [...g.ids, pid]) : g.ids.filter((x) => x !== pid) }));
    patch({ groups });
  };
  return (
    <>
      <H>Groups and tee times</H>
      <Card>
        <P sub>Make groups automatically in player order, then adjust.</P>
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <View style={{ flex: 1 }}>
            <Field label="First tee" value={first} onChangeText={setFirst} placeholder="08:00" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Minutes apart" value={gap} onChangeText={setGap} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Per group" value={size} onChangeText={setSize} keyboardType="number-pad" />
          </View>
        </View>
        <Button small kind="secondary" icon="shuffle" title="Make groups" onPress={() => patch({ groups: autoGroups(tour.players.map((p) => p.id), Math.max(1, +size || 4), first, +gap || 10) })} />
      </Card>
      {r.groups.map((g, gi) => (
        <Card key={g.id}>
          <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <Field label={`Group ${gi + 1} tee time`} value={g.teeTime} onChangeText={(teeTime) => patch({ groups: r.groups.map((x) => (x.id === g.id ? { ...x, teeTime } : x)) })} placeholder="08:00" />
            </View>
            <Chip label="1st" on={g.startHole === 1} onPress={() => patch({ groups: r.groups.map((x) => (x.id === g.id ? { ...x, startHole: 1 } : x)) })} />
            <Chip label="10th" on={g.startHole === 10} onPress={() => patch({ groups: r.groups.map((x) => (x.id === g.id ? { ...x, startHole: 10 } : x)) })} />
            <Button small kind="ghost" title="" icon="trash-outline" onPress={() => patch({ groups: r.groups.filter((x) => x.id !== g.id) })} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {tour.players
              .filter((p) => g.ids.includes(p.id) || !placed.has(p.id))
              .map((p) => (
                <Chip key={p.id} label={p.name} on={g.ids.includes(p.id)} onPress={() => toggle(gi, p.id)} />
              ))}
          </View>
        </Card>
      ))}
      <List>
        <Row left={<Icon name="add-circle" color={C.brand} />} title="Add a group" onPress={() => patch({ groups: [...r.groups, { id: newId('g'), teeTime: '', startHole: 1, ids: [] }] })} />
      </List>
      {tour.players.some((p) => !placed.has(p.id)) && r.groups.length > 0 && <P sub>Not in a group: {tour.players.filter((p) => !placed.has(p.id)).map((p) => name(p.id)).join(', ')}</P>}
    </>
  );
}

function Scramble({ tour, r, patch }: { tour: Tour; r: Round; patch: (p: Partial<Round>) => void }) {
  const teams = r.scramble || [];
  const placed = new Set(teams.flat());
  return (
    <>
      <H>Scramble teams</H>
      <P sub>Each team posts one score. Team handicaps follow the WHS allowances (2 players 35/15%, 4 players 25/20/15/10%).</P>
      {teams.map((ids, ti) => (
        <Card key={ti}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, fontWeight: '700' }}>Team {ti + 1}</Text>
            <Button small kind="ghost" title="" icon="trash-outline" onPress={() => patch({ scramble: teams.filter((_, i) => i !== ti) })} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {tour.players
              .filter((p) => ids.includes(p.id) || !placed.has(p.id))
              .map((p) => (
                <Chip key={p.id} label={p.name} on={ids.includes(p.id)} onPress={() => patch({ scramble: teams.map((t, i) => (i === ti ? (t.includes(p.id) ? t.filter((x) => x !== p.id) : [...t, p.id]) : t)) })} />
              ))}
          </View>
        </Card>
      ))}
      <List>
        <Row left={<Icon name="add-circle" color={C.brand} />} title="Add a scramble team" onPress={() => patch({ scramble: [...teams, []] })} />
      </List>
    </>
  );
}

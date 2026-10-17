import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { backend } from '@/backend';
import type { Course, Tee } from '@/core/types';
import { useCourse, useMe } from '@/state/session';
import { Button, Card, Empty, ErrorText, Field, H, Loading, P, Screen } from '@/ui/kit';
import { C, F, R } from '@/ui/theme';

const blankTee = (from?: Tee): Tee => ({ name: '', rating: null, slope: null, par: from ? [...from.par] : Array(18).fill(4), si: from ? [...from.si] : Array.from({ length: 18 }, (_, i) => i + 1) });

export function teeProblem(t: Tee): string | null {
  if (!t.name.trim()) return 'Give every tee a name.';
  if (t.par.some((p) => !(p >= 3 && p <= 6))) return `${t.name}: par must be 3 to 6 on every hole.`;
  if (new Set(t.si).size !== 18 || t.si.some((s) => !(s >= 1 && s <= 18))) return `${t.name}: stroke indexes must use 1 to 18 once each.`;
  if (t.slope != null && !(t.slope >= 55 && t.slope <= 155)) return `${t.name}: slope must be between 55 and 155.`;
  if (t.rating != null && !(t.rating > 50 && t.rating < 90)) return `${t.name}: course rating looks wrong.`;
  return null;
}

export default function CourseEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const loaded = useCourse(id === 'new' ? undefined : id);
  if (id === 'new') return <CourseForm isNew initial={{ id: '', name: '', city: '', country: '', tees: [blankTee()], source: 'user', createdBy: me.uid }} />;
  if (loaded === null) return <Empty icon="flag-outline" title="Course not found" />;
  if (!loaded) return <Loading />;
  return <CourseForm key={loaded.id} initial={structuredClone(loaded)} />;
}

function CourseForm({ initial, isNew }: { initial: Course; isNew?: boolean }) {
  const [c, setC] = useState<Course>(initial);
  const [err, setErr] = useState('');
  const patch = (p: Partial<Course>) => setC({ ...c, ...p });
  const setTee = (i: number, p: Partial<Tee>) => patch({ tees: c.tees.map((t, j) => (j === i ? { ...t, ...p } : t)) });
  const save = async () => {
    const problem = !c.name.trim() ? 'Enter the course name.' : c.tees.map(teeProblem).find(Boolean);
    if (problem) return setErr(problem);
    const { id: cid, ...rest } = c;
    await backend.saveCourse(cid ? c : rest);
    router.back();
  };
  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? 'Add a course' : c.name }} />
      <Field label="Course name" value={c.name} onChangeText={(name) => patch({ name })} />
      <Field label="Town" value={c.city ?? ''} onChangeText={(city) => patch({ city })} />
      <Field label="Country" value={c.country ?? ''} onChangeText={(country) => patch({ country })} />
      {c.tees.map((t, i) => (
        <Card key={i}>
          <H right={c.tees.length > 1 ? <Button small kind="ghost" title="" icon="trash-outline" onPress={() => patch({ tees: c.tees.filter((_, j) => j !== i) })} /> : undefined}>Tee {i + 1}</H>
          <Field label="Tee name" value={t.name} onChangeText={(name) => setTee(i, { name })} placeholder="e.g. White, Men's, Blue" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label="Course rating" value={t.rating == null ? '' : String(t.rating)} keyboardType="decimal-pad" placeholder="71.2" onChangeText={(v) => setTee(i, { rating: v ? Number(v.replace(',', '.')) : null })} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Slope" value={t.slope == null ? '' : String(t.slope)} keyboardType="number-pad" placeholder="128" onChangeText={(v) => setTee(i, { slope: v ? parseInt(v, 10) : null })} />
            </View>
          </View>
          <HoleGrid label="Par" values={t.par} onChange={(par) => setTee(i, { par })} />
          <HoleGrid label="Stroke index" values={t.si} onChange={(si) => setTee(i, { si })} />
          <P sub style={{ fontSize: 12 }}>Par {t.par.reduce((a, b) => a + (b || 0), 0)}</P>
        </Card>
      ))}
      <Button small kind="secondary" icon="add" title="Add another tee" onPress={() => patch({ tees: [...c.tees, blankTee(c.tees[0])] })} />
      <ErrorText>{err}</ErrorText>
      <Button title="Save course" onPress={save} />
    </Screen>
  );
}

function HoleGrid({ label, values, onChange }: { label: string; values: number[]; onChange: (v: number[]) => void }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 12, fontFamily: F.bold, color: C.sub }}>{label.toUpperCase()}</Text>
      {[0, 9].map((start) => (
        <View key={start} style={{ flexDirection: 'row', gap: 3 }}>
          {values.slice(start, start + 9).map((v, k) => (
            <View key={k} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: C.faint }}>{start + k + 1}</Text>
              <TextInput
                value={v ? String(v) : ''}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
                onChangeText={(t) => onChange(values.map((x, j) => (j === start + k ? parseInt(t, 10) || 0 : x)))}
                style={{ width: '100%', textAlign: 'center', borderWidth: 1, borderColor: C.line, borderRadius: R.sm, paddingVertical: 6, fontSize: 15, fontFamily: F.bold, color: C.ink, backgroundColor: C.card }}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

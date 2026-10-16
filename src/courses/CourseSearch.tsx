import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { backend } from '@/backend';
import type { Course } from '@/core/types';
import { Field, H, List, P, Row } from '@/ui/kit';
import { C } from '@/ui/theme';
import { searchWorldwide, worldwideSearchEnabled } from './golfcourseapi';

/** Searches saved courses, and the worldwide directory when it's switched on.
 *  Picking a worldwide course saves a copy so everyone on the tour shares it. */
export function CourseSearch({ onPick }: { onPick: (c: Course) => void }) {
  const [q, setQ] = useState('');
  const [mine, setMine] = useState<Course[]>([]);
  const [world, setWorld] = useState<Course[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      setErr('');
      backend.searchCourses(q).then((r) => live && setMine(r));
      if (!worldwideSearchEnabled || q.trim().length < 3) return setWorld([]);
      setBusy(true);
      try {
        const r = await searchWorldwide(q);
        if (live) setWorld(r);
      } catch (e: any) {
        if (live) setErr(e.message);
      } finally {
        if (live) setBusy(false);
      }
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);
  const savedIds = new Set(mine.map((c) => c.id));
  const where = (c: Course) => [c.city, c.country].filter(Boolean).join(', ');
  return (
    <View style={{ gap: 8 }}>
      <Field label="Find a course" value={q} onChangeText={setQ} placeholder="Course or club name" autoCorrect={false} />
      {mine.length > 0 && (
        <List>
          {mine.slice(0, 20).map((c) => (
            <Row key={c.id} title={c.name} subtitle={[where(c), `${c.tees.length} tee${c.tees.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')} onPress={() => onPick(c)} />
          ))}
        </List>
      )}
      {worldwideSearchEnabled && q.trim().length >= 3 && (
        <>
          <H right={busy ? <ActivityIndicator color={C.brand} /> : undefined}>Worldwide</H>
          {err ? <P sub>{err}</P> : null}
          <List>
            {world
              .filter((c) => !savedIds.has(c.id))
              .map((c) => (
                <Row
                  key={c.id}
                  title={c.name}
                  subtitle={[where(c), c.tees.map((t) => t.name).join(', ')].filter(Boolean).join(' · ')}
                  onPress={async () => {
                    await backend.saveCourse(c);
                    onPick(c);
                  }}
                />
              ))}
            {!busy && !world.length && <Row title="No matches" />}
          </List>
        </>
      )}
      {!worldwideSearchEnabled && q.trim().length >= 3 && !mine.length && <P sub>No saved course matches. Add it from the Courses tab with its scorecard.</P>}
    </View>
  );
}

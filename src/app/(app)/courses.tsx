import { router, Stack } from 'expo-router';

import { CourseSearch } from '@/courses/CourseSearch';
import { worldwideSearchEnabled } from '@/courses/golfcourseapi';
import { Button, P, Screen } from '@/ui/kit';

export default function Courses() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Courses' }} />
      <CourseSearch onPick={(c) => router.push(`/course/${c.id}`)} />
      <Button title="Add a course" icon="add" kind="secondary" onPress={() => router.push('/course/new')} />
      <P sub style={{ fontSize: 12 }}>
        {worldwideSearchEnabled
          ? 'Search covers courses worldwide. Picking one saves it for your tours.'
          : 'Add a course from its scorecard: par and stroke index per hole, plus the course rating and slope for each tee. Worldwide course search switches on once a course data provider is connected.'}
      </P>
    </Screen>
  );
}

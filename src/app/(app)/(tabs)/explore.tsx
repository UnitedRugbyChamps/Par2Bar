import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { backend } from '@/backend';
import { CourseSearch } from '@/courses/CourseSearch';
import type { Club, UserProfile } from '@/core/types';
import { useFollows, useMe } from '@/state/session';
import { fmtHi } from '@/social/util';
import { Avatar, Button, Empty, Icon, List, P, Row, Segmented } from '@/ui/kit';
import { TopBar } from '@/ui/TopBar';
import { C, F, R, S } from '@/ui/theme';

type Tab = 'people' | 'clubs' | 'courses';

export default function Explore() {
  const me = useMe();
  const follows = useFollows(me.uid);
  const [tab, setTab] = useState<Tab>('people');
  const [q, setQ] = useState('');
  const [people, setPeople] = useState<UserProfile[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      const run = tab === 'people' ? backend.searchUsers(q).then((r) => live && setPeople(r.filter((u) => u.uid !== me.uid))) : tab === 'clubs' ? backend.searchClubs(q).then((r) => live && setClubs(r)) : Promise.resolve();
      run.catch(() => {});
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, tab, me.uid]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TopBar title="Explore" />
      <View style={{ paddingHorizontal: S.lg, gap: S.sm }}>
        {tab !== 'courses' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.card, borderRadius: R.pill, paddingHorizontal: S.lg, borderWidth: 1, borderColor: C.line }}>
          <Icon name="search" size={18} color={C.sub} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={tab === 'people' ? 'Search golfers' : 'Search clubs and societies'}
            placeholderTextColor={C.faint}
            autoCapitalize="none"
            style={{ flex: 1, paddingVertical: 13, fontFamily: F.body, fontSize: 16, color: C.ink }}
          />
        </View>
        )}
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'people', label: 'Golfers' },
            { value: 'clubs', label: 'Clubs' },
            { value: 'courses', label: 'Courses' },
          ]}
        />
      </View>
      <ScrollView contentContainerStyle={{ padding: S.lg, paddingBottom: 60, gap: S.md }} keyboardShouldPersistTaps="handled">
        {tab === 'people' &&
          (people.length ? (
            <List>
              {people.map((u) => {
                const on = follows.following.includes(u.uid);
                return (
                  <Row
                    key={u.uid}
                    left={<Avatar name={u.name} uri={u.avatar} size={42} />}
                    title={u.name}
                    subtitle={[`HCP ${fmtHi(u.hi)}`, u.homeClub].filter(Boolean).join(' · ')}
                    onPress={() => router.push(`/user/${u.uid}`)}
                    chevron={false}
                    right={<Button small kind={on ? 'secondary' : 'primary'} title={on ? 'Following' : 'Follow'} onPress={() => (on ? backend.unfollow(me.uid, u.uid) : backend.follow(me.uid, u.uid))} />}
                  />
                );
              })}
            </List>
          ) : (
            <Empty icon="people-outline" title={q ? 'Nobody by that name' : 'Find your playing partners'}>
              <P sub center>
                Search by name. Everyone on your tours shows up here once they have an account.
              </P>
            </Empty>
          ))}
        {tab === 'clubs' && (
          <>
            {clubs.length ? (
              <List>
                {clubs.map((c) => (
                  <Row
                    key={c.id}
                    left={<Avatar name={c.name} uri={c.logo} size={42} />}
                    title={c.name}
                    subtitle={[c.location, `${c.memberUids.length} member${c.memberUids.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                    onPress={() => router.push(`/club/${c.id}`)}
                  />
                ))}
              </List>
            ) : (
              <Empty icon="shield-outline" title={q ? 'No clubs found' : 'Clubs and societies'}>
                <P sub center>
                  A club is home to a group's tours, year after year, with its honours board and records.
                </P>
              </Empty>
            )}
            <View style={{ flexDirection: 'row', gap: S.sm }}>
              <View style={{ flex: 1 }}>
                <Button kind="secondary" title="Join with code" onPress={() => router.push('/club/join')} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Start a club" onPress={() => router.push('/club/new')} />
              </View>
            </View>
          </>
        )}
        {tab === 'courses' && (
          <>
            <CourseSearch onPick={(c) => router.push(`/course/${c.id}`)} />
            <Button kind="ghost" icon="add" title="Add a course from its scorecard" onPress={() => router.push('/course/new')} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

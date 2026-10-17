import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { backend } from '@/backend';
import { useFollows, useMe, useUser } from '@/state/session';
import { fmtHi, useProfiles } from '@/social/util';
import { Avatar, Button, Empty, List, Row, Screen, Segmented } from '@/ui/kit';

export default function Follows() {
  const { uid, tab: t } = useLocalSearchParams<{ uid: string; tab?: string }>();
  const me = useMe();
  const user = useUser(uid);
  const f = useFollows(uid);
  const mine = useFollows(me.uid);
  const [tab, setTab] = useState<'followers' | 'following'>(t === 'following' ? 'following' : 'followers');
  const ids = tab === 'followers' ? f.followers : f.following;
  const profiles = useProfiles([...f.followers, ...f.following]);
  return (
    <Screen>
      <Stack.Screen options={{ title: user?.name ?? '' }} />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'followers', label: `${f.followers.length} Followers` },
          { value: 'following', label: `${f.following.length} Following` },
        ]}
      />
      {ids.length ? (
        <List>
          {ids.map((id) => {
            const p = profiles[id];
            const on = mine.following.includes(id);
            return (
              <Row
                key={id}
                left={<Avatar name={p?.name ?? '?'} uri={p?.avatar} size={40} />}
                title={p?.name ?? '…'}
                subtitle={`Handicap ${fmtHi(p?.hi)}${p?.homeClub ? ` · ${p.homeClub}` : ''}`}
                onPress={() => router.push(`/user/${id}`)}
                chevron={false}
                right={id === me.uid ? undefined : <Button small kind={on ? 'secondary' : 'primary'} title={on ? 'Following' : 'Follow'} onPress={() => (on ? backend.unfollow(me.uid, id) : backend.follow(me.uid, id))} />}
              />
            );
          })}
        </List>
      ) : (
        <Empty icon="people-outline" title={tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'} />
      )}
    </Screen>
  );
}

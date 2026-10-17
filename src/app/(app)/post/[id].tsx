import { Stack, useLocalSearchParams } from 'expo-router';

import { PostCard } from '@/social/PostCard';
import { useMe, usePosts, useUser } from '@/state/session';
import { Empty, Loading, Screen } from '@/ui/kit';

export default function PostScreen() {
  const { id, uid } = useLocalSearchParams<{ id: string; uid: string }>();
  const me = useMe();
  const posts = usePosts(uid ? [uid] : []);
  const author = useUser(uid);
  if (posts === null) return <Loading />;
  const post = posts.find((p) => p.id === id);
  return (
    <Screen>
      <Stack.Screen options={{ title: author?.name ?? 'Post' }} />
      {post ? <PostCard post={post} author={author ?? undefined} me={me.uid} /> : <Empty icon="image-outline" title="This post has been removed" />}
    </Screen>
  );
}

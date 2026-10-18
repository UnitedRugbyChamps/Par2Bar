import { Redirect, Stack, useLocalSearchParams } from 'expo-router';

import { Comments } from '@/social/Comments';
import { PostCard } from '@/social/PostCard';
import { useMe, usePost, useUser } from '@/state/session';
import { Empty, Loading, Screen } from '@/ui/kit';

export default function PostScreen() {
  const { id, focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const me = useMe();
  const post = usePost(id);
  const author = useUser(post?.uid);
  if (post === undefined) return <Loading />;
  // a round post opens as the full round: scorecard, stats and comments
  if (post?.kind === 'round' && post.round) return <Redirect href={`/round/${encodeURIComponent(post.round.id)}${focus ? '?focus=1' : ''}`} />;
  return (
    <Screen>
      <Stack.Screen options={{ title: author?.name ?? 'Post' }} />
      {post ? (
        <>
          <PostCard post={post} author={author ?? undefined} me={me.uid} detail />
          <Comments post={post} me={me.uid} focus={focus === '1'} />
        </>
      ) : (
        <Empty icon="image-outline" title="This post has been removed" />
      )}
    </Screen>
  );
}

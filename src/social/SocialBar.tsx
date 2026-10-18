import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { backend } from '@/backend';
import type { Post, UserProfile } from '@/core/types';
import { pickAndUpload } from '@/ui/pickImage';
import { Button, Icon } from '@/ui/kit';
import { C, F, R, S } from '@/ui/theme';
import { sharePost } from './share';

/** Like, comment and share for a post shown full screen, plus the owner's photo and caption. */
export function SocialBar({ post, author, me }: { post: Post; author?: UserProfile; me: string }) {
  const liked = post.likes.includes(me);
  const mine = post.uid === me;
  const [caption, setCaption] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const photo = async () => {
    setBusy(true);
    try {
      const url = await pickAndUpload(me, { aspect: [4, 5], width: 1080 });
      if (url) await backend.updatePost(post.id, { images: [url] });
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: S.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.lg }}>
        <Pressable hitSlop={8} onPress={() => backend.toggleLike(post.id, me)}>
          <Icon name={liked ? 'heart' : 'heart-outline'} size={26} color={liked ? C.under : C.ink} />
        </Pressable>
        <Icon name="chatbubble-outline" size={24} />
        <Pressable hitSlop={8} onPress={() => sharePost(post, author)}>
          <Icon name="paper-plane-outline" size={24} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'right', fontFamily: F.bold, fontSize: 13, color: C.ink }}>
          {[post.likes.length && `${post.likes.length} like${post.likes.length === 1 ? '' : 's'}`, post.comments && `${post.comments} comment${post.comments === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {caption != null ? (
        <View style={{ gap: S.sm }}>
          <TextInput value={caption} onChangeText={setCaption} multiline autoFocus maxLength={500} placeholder="Say something about the round…" placeholderTextColor={C.faint} style={{ backgroundColor: C.card, borderRadius: R.md, borderWidth: 1, borderColor: C.line, padding: S.md, minHeight: 70, fontFamily: F.body, fontSize: 15, color: C.ink }} />
          <Button
            small
            title="Save caption"
            onPress={async () => {
              await backend.updatePost(post.id, { caption: caption.trim() });
              setCaption(null);
            }}
          />
        </View>
      ) : post.caption ? (
        <Text style={{ fontFamily: F.body, fontSize: 15, color: C.ink, lineHeight: 21 }}>
          <Text style={{ fontFamily: F.bold }}>{author?.name ?? ''} </Text>
          {post.caption}
        </Text>
      ) : null}
      {mine && caption == null && (
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          <View style={{ flex: 1 }}>
            <Button small kind="secondary" icon="image-outline" busy={busy} title={post.images.length ? 'Change photo' : 'Add a photo'} onPress={photo} />
          </View>
          <View style={{ flex: 1 }}>
            <Button small kind="secondary" icon="create-outline" title={post.caption ? 'Edit caption' : 'Add caption'} onPress={() => setCaption(post.caption)} />
          </View>
        </View>
      )}
      {mine && post.images.length > 0 && caption == null && (
        <Text onPress={() => backend.updatePost(post.id, { images: [] })} style={{ fontFamily: F.medium, fontSize: 12, color: C.sub, textAlign: 'center' }}>
          Remove photo
        </Text>
      )}
    </View>
  );
}

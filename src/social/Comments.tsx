import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { backend } from '@/backend';
import type { Comment, Post } from '@/core/types';
import { confirm } from '@/ui/confirm';
import { Avatar, Icon, Label } from '@/ui/kit';
import { C, F, R, S } from '@/ui/theme';
import { ago, useProfiles } from './util';

export function useComments(postId: string | undefined) {
  const [list, setList] = useState<Comment[]>([]);
  useEffect(() => (postId ? backend.watchComments(postId, setList) : undefined), [postId]);
  return list;
}

/** Comments under a post, newest at the bottom, with a box to add one. */
export function Comments({ post, me, focus }: { post: Pick<Post, 'id' | 'uid'>; me: string; focus?: boolean }) {
  const list = useComments(post.id);
  const profiles = useProfiles([me, ...list.map((c) => c.uid)]);
  const [text, setText] = useState('');
  const [now] = useState(() => Date.now());
  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    await backend.addComment({ postId: post.id, uid: me, text: t, at: Date.now() });
  };
  return (
    <View style={{ gap: S.md }}>
      <Label>{list.length ? `Comments · ${list.length}` : 'Comments'}</Label>
      {list.map((c) => {
        const p = profiles[c.uid];
        const canDelete = c.uid === me || post.uid === me;
        return (
          <View key={c.id} style={{ flexDirection: 'row', gap: S.md, alignItems: 'flex-start' }}>
            <Pressable onPress={() => router.push(`/user/${c.uid}`)}>
              <Avatar name={p?.name ?? '?'} uri={p?.avatar} size={32} />
            </Pressable>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: F.body, fontSize: 14, color: C.ink, lineHeight: 20 }}>
                <Text style={{ fontFamily: F.bold }}>{p?.name ?? '…'} </Text>
                {c.text}
              </Text>
              <Text style={{ fontFamily: F.medium, fontSize: 11, color: C.faint }}>
                {ago(c.at, now)}
                {canDelete ? (
                  <Text onPress={() => confirm('Delete comment?', '', () => backend.deleteComment(post.id, c.id))} style={{ color: C.sub }}>
                    {'   '}Delete
                  </Text>
                ) : null}
              </Text>
            </View>
          </View>
        );
      })}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.card, borderRadius: R.pill, borderWidth: 1, borderColor: C.line, paddingLeft: S.lg, paddingRight: 6 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add a comment…"
          placeholderTextColor={C.faint}
          autoFocus={focus}
          onSubmitEditing={send}
          maxLength={1000}
          style={{ flex: 1, paddingVertical: 12, fontFamily: F.body, fontSize: 15, color: C.ink }}
        />
        <Pressable onPress={send} disabled={!text.trim()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: text.trim() ? C.ink : C.soft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="arrow-up" size={18} color={text.trim() ? C.white : C.faint} />
        </Pressable>
      </View>
    </View>
  );
}

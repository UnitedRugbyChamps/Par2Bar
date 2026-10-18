import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { newId } from '@/backend';
import type { Club, Sponsor } from '@/core/types';
import { FormatPicker } from '@/tour/FormatPicker';
import { CoverArt } from '@/social/ProfileView';
import { useMe } from '@/state/session';
import { pickAndUpload } from '@/ui/pickImage';
import { Avatar, Button, ErrorText, Field, H, Icon, List, P, Row, Screen } from '@/ui/kit';
import { C, F, R, S } from '@/ui/theme';

export type ClubFields = Pick<Club, 'name' | 'about' | 'location' | 'founded' | 'logo' | 'cover' | 'sponsors' | 'formats'>;

/** Name, story and pictures for a club; shared by create and edit. */
export function ClubForm({ initial, submit, action }: { initial: ClubFields; submit: (c: ClubFields) => Promise<void>; action: string }) {
  const me = useMe();
  const [c, setC] = useState<ClubFields>(initial);
  const [busy, setBusy] = useState<'' | 'logo' | 'cover' | 'save'>('');
  const [err, setErr] = useState('');
  const patch = (p: Partial<ClubFields>) => setC((x) => ({ ...x, ...p }));
  const pick = async (which: 'logo' | 'cover') => {
    setBusy(which);
    setErr('');
    try {
      const url = await pickAndUpload(me.uid, which === 'logo' ? { aspect: [1, 1], width: 480 } : { aspect: [16, 9], width: 1280 });
      if (url) patch({ [which]: url });
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  };
  const save = async () => {
    setBusy('save');
    setErr('');
    try {
      await submit({ ...c, name: c.name.trim(), about: c.about?.trim(), location: c.location?.trim(), founded: c.founded?.trim() });
    } catch (e: any) {
      setErr(e.message);
      setBusy('');
    }
  };
  return (
    <Screen pad={false}>
      <Pressable onPress={() => pick('cover')} style={{ height: 160, backgroundColor: C.ink, overflow: 'hidden' }}>
        {c.cover ? <Image source={{ uri: c.cover }} style={{ position: 'absolute', inset: 0 }} contentFit="cover" /> : <CoverArt label={c.name || undefined} />}
        <View style={{ position: 'absolute', right: S.md, bottom: S.md, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7 }}>
          <Icon name="image-outline" size={15} color={C.white} />
          <Text style={{ color: C.white, fontFamily: F.semi, fontSize: 12 }}>{busy === 'cover' ? 'Uploading…' : 'Cover photo'}</Text>
        </View>
      </Pressable>
      <View style={{ paddingHorizontal: S.lg, marginTop: -40, gap: S.md }}>
        <Pressable onPress={() => pick('logo')} style={{ alignSelf: 'flex-start' }}>
          <View style={{ borderWidth: 4, borderColor: C.bg, borderRadius: 60 }}>
            <Avatar name={c.name || 'Club'} uri={c.logo} size={80} />
          </View>
          <View style={{ position: 'absolute', right: 0, bottom: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: C.ink, borderWidth: 2, borderColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="camera" size={13} color={C.white} />
          </View>
        </Pressable>
        <Field label="Club name" value={c.name} onChangeText={(name) => patch({ name })} placeholder="e.g. Par 2 Bar" />
        <Field label="Based in" value={c.location ?? ''} onChangeText={(location) => patch({ location })} placeholder="Town or region" />
        <Field label="Founded" value={c.founded ?? ''} onChangeText={(founded) => patch({ founded })} placeholder="Year" keyboardType="number-pad" maxLength={4} />
        <Field label="About" value={c.about ?? ''} onChangeText={(about) => patch({ about })} multiline placeholder="Who you are, where you play, what's at stake" />
        <H>Sponsors</H>
        <P sub>Shown on the club page and its tours. Add what they sponsor, like a prize or a hole.</P>
        <Sponsors list={c.sponsors ?? []} onChange={(sponsors) => patch({ sponsors })} uid={me.uid} />
        <H>Formats we play</H>
        <P sub>New tours in the club start with these games set up.</P>
        <FormatPicker selected={c.formats ?? []} onToggle={(f) => patch({ formats: (c.formats ?? []).includes(f) ? (c.formats ?? []).filter((x) => x !== f) : [...(c.formats ?? []), f] })} />
        <ErrorText>{err}</ErrorText>
        <Button title={action} onPress={save} busy={busy === 'save'} disabled={!c.name.trim() || busy === 'logo' || busy === 'cover'} />
      </View>
    </Screen>
  );
}

function Sponsors({ list, onChange, uid }: { list: Sponsor[]; onChange: (s: Sponsor[]) => void; uid: string }) {
  const [draft, setDraft] = useState<Sponsor | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<Sponsor>) => setDraft((d) => (d ? { ...d, ...p } : d));
  return (
    <View style={{ gap: S.sm }}>
      {list.length > 0 && (
        <List>
          {list.map((sp) => (
            <Row
              key={sp.id}
              left={<Avatar name={sp.name} uri={sp.logo} size={40} />}
              title={sp.name}
              subtitle={[sp.blurb, sp.url].filter(Boolean).join(' · ')}
              onPress={() => setDraft(sp)}
            />
          ))}
        </List>
      )}
      {draft ? (
        <View style={{ backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, gap: S.md }}>
          <Pressable
            onPress={async () => {
              setBusy(true);
              try {
                const url = await pickAndUpload(uid, { aspect: [1, 1], width: 400 });
                if (url) set({ logo: url });
              } finally {
                setBusy(false);
              }
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
            <Avatar name={draft.name || 'Logo'} uri={draft.logo} size={56} />
            <Text style={{ fontFamily: F.semi, color: C.ink }}>{busy ? 'Uploading…' : draft.logo ? 'Change logo' : 'Add logo'}</Text>
          </Pressable>
          <Field label="Sponsor name" value={draft.name} onChangeText={(name) => set({ name })} />
          <Field label="What they sponsor" value={draft.blurb ?? ''} onChangeText={(blurb) => set({ blurb })} placeholder="e.g. Longest drive on the 7th" />
          <Field label="Website" value={draft.url ?? ''} onChangeText={(url) => set({ url })} autoCapitalize="none" keyboardType="url" placeholder="https://" />
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            {list.some((x) => x.id === draft.id) && (
              <View style={{ flex: 1 }}>
                <Button
                  small
                  kind="ghost"
                  title="Remove"
                  onPress={() => {
                    onChange(list.filter((x) => x.id !== draft.id));
                    setDraft(null);
                  }}
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Button
                small
                title="Done"
                disabled={!draft.name.trim() || busy}
                onPress={() => {
                  const sp = { ...draft, name: draft.name.trim(), url: draft.url?.trim() || undefined, blurb: draft.blurb?.trim() || undefined };
                  onChange(list.some((x) => x.id === sp.id) ? list.map((x) => (x.id === sp.id ? sp : x)) : [...list, sp]);
                  setDraft(null);
                }}
              />
            </View>
          </View>
        </View>
      ) : (
        <Button small kind="secondary" icon="add" title="Add a sponsor" onPress={() => setDraft({ id: newId('sp'), name: '' })} />
      )}
    </View>
  );
}

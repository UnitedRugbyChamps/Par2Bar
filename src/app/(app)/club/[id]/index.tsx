import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backend } from '@/backend';
import { clubRecords, honours, type Honour } from '@/club/honours';
import { CoverArt } from '@/social/ProfileView';
import { fmtHi, useProfiles } from '@/social/util';
import { isClubAdmin, useClub, useClubTours, useFollows, useManyScores, useMe } from '@/state/session';
import { formatById } from '@/tour/formats';
import { fmtRange, today } from '@/tour/helpers';
import { shareText } from '@/ui/confirm';
import { Avatar, Button, Display, Empty, Icon, IconButton, Label, List, Loading, Num, P, Row, Segmented } from '@/ui/kit';
import { C, F, R, S, shadow } from '@/ui/theme';

type Tab = 'tours' | 'honours' | 'members' | 'records';

export default function ClubPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const club = useClub(id);
  const tours = useClubTours(id);
  const tourIds = useMemo(() => (tours ?? []).map((t) => t.id), [tours]);
  const scores = useManyScores(tourIds);
  const profiles = useProfiles(club?.memberUids ?? []);
  const follows = useFollows(me.uid);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('tours');
  const [day] = useState(today);
  const hs = useMemo(() => (tours ?? []).map((t) => honours(t, scores[t.id], day)), [tours, scores, day]);
  const records = useMemo(() => clubRecords(tours ?? [], scores, hs), [tours, scores, hs]);

  if (club === undefined) return <Loading />;
  if (!club) return <Empty icon="shield-outline" title="Club not found" />;
  const member = club.memberUids.includes(me.uid);
  const admin = isClubAdmin(club, me.uid);
  const years = [...new Set(hs.map((h) => h.year))];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={{ height: 230 + insets.top, backgroundColor: C.ink }}>
        {club.cover ? <Image source={{ uri: club.cover }} style={{ position: 'absolute', inset: 0 }} contentFit="cover" /> : <CoverArt />}
        <LinearGradient colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.85)']} style={{ position: 'absolute', inset: 0 }} />
        <View style={{ position: 'absolute', top: insets.top + 6, left: 8, right: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          <IconButton icon="chevron-back" color={C.white} onPress={() => (router.canGoBack() ? router.back() : router.replace('/tours'))} />
          {admin && <IconButton icon="create-outline" color={C.white} onPress={() => router.push(`/club/${club.id}/edit`)} />}
        </View>
        <View style={{ position: 'absolute', left: S.lg, right: S.lg, bottom: S.lg, flexDirection: 'row', alignItems: 'flex-end', gap: S.md }}>
          <View style={{ borderWidth: 2, borderColor: C.white, borderRadius: 60 }}>
            <Avatar name={club.name} uri={club.logo} size={64} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Display size={26} color={C.white}>
              {club.name}
            </Display>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontFamily: F.medium, fontSize: 12, letterSpacing: 0.5 }}>
              {[club.location, club.founded && `Est. ${club.founded}`, `${club.memberUids.length} member${club.memberUids.length === 1 ? '' : 's'}`].filter(Boolean).join('  ·  ')}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ padding: S.lg, gap: S.md }}>
        {club.about ? <P>{club.about}</P> : null}
        {club.formats?.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <Label style={{ marginRight: 4 }}>We play</Label>
            {club.formats.map((f) => (
              <View key={f} style={{ borderWidth: 1, borderColor: C.ink, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontFamily: F.semi, fontSize: 12, color: C.ink }}>{formatById(f)?.label ?? f}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {club.sponsors?.length ? (
          <View style={{ gap: S.sm }}>
            <Label>Sponsors</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.md }}>
              {club.sponsors.map((sp) => (
                <Pressable key={sp.id} disabled={!sp.url} onPress={() => sp.url && Linking.openURL(/^https?:/.test(sp.url) ? sp.url : `https://${sp.url}`)} style={[{ width: 150, backgroundColor: C.card, borderRadius: R.lg, padding: S.md, gap: 6, alignItems: 'center' }, shadow]}>
                  <Avatar name={sp.name} uri={sp.logo} size={52} />
                  <Text numberOfLines={1} style={{ fontFamily: F.bold, fontSize: 13, color: C.ink }}>
                    {sp.name}
                  </Text>
                  {sp.blurb ? (
                    <Text numberOfLines={2} style={{ fontFamily: F.body, fontSize: 11, color: C.sub, textAlign: 'center' }}>
                      {sp.blurb}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : admin ? (
          <Pressable onPress={() => router.push(`/club/${club.id}/edit`)}>
            <Text style={{ fontFamily: F.semi, fontSize: 13, color: C.sub }}>+ Add sponsors and the formats you play</Text>
          </Pressable>
        ) : null}
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          {member ? (
            <>
              {admin && (
                <View style={{ flex: 1 }}>
                  <Button small icon="add" title="New tour" onPress={() => router.push(`/tour/new?club=${club.id}`)} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Button small kind="secondary" icon="person-add-outline" title="Invite" onPress={() => shareText(`Join ${club.name} on Tour Card with code ${club.joinCode}`)} />
              </View>
            </>
          ) : (
            <View style={{ flex: 1 }}>
              <Button small title="Join with code" onPress={() => router.push('/club/join')} />
            </View>
          )}
        </View>
        {member && (
          <Text style={{ fontFamily: F.medium, fontSize: 12, color: C.sub }}>
            Club code <Text style={{ fontFamily: F.bold, color: C.ink, letterSpacing: 2 }}>{club.joinCode}</Text>
          </Text>
        )}
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'tours', label: 'Tours' },
            { value: 'honours', label: 'Honours' },
            { value: 'members', label: 'Members' },
            { value: 'records', label: 'Records' },
          ]}
        />

        {tab === 'tours' &&
          (tours === null ? (
            <Loading />
          ) : tours.length ? (
            years.map((y) => (
              <View key={y} style={{ gap: S.sm }}>
                <Display size={14} color={C.sub} style={{ marginTop: S.sm }}>
                  {y}
                </Display>
                {hs
                  .filter((h) => h.year === y)
                  .map((h) => (
                    <TourCard key={h.tour.id} h={h} />
                  ))}
              </View>
            ))
          ) : (
            <Empty icon="trophy-outline" title="No tours yet">
              <P sub center>
                {admin ? 'Start the first one. Every tour the club runs lands here, year by year.' : "The club's tours will show up here."}
              </P>
            </Empty>
          ))}

        {tab === 'honours' &&
          (hs.some((h) => h.champions.length) ? (
            <View style={{ backgroundColor: C.ink, borderRadius: R.lg, padding: S.xl, gap: S.lg }}>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Icon name="trophy-outline" color={C.champagne} size={26} />
                <Display size={18} color={C.white}>
                  Honours board
                </Display>
              </View>
              {hs
                .filter((h) => h.champions.length)
                .map((h) => (
                  <View key={h.tour.id} style={{ flexDirection: 'row', gap: S.lg, borderTopWidth: 0.5, borderTopColor: '#2A2A28', paddingTop: S.md }}>
                    <Num size={20} color={C.champagne} style={{ width: 54 }}>
                      {h.year}
                    </Num>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ color: C.white, fontFamily: F.bold, fontSize: 16 }}>
                        {h.champions.map((c) => c.name).join(' & ')}
                        {h.live ? <Text style={{ color: C.faint, fontFamily: F.medium, fontSize: 12 }}>  leading</Text> : null}
                      </Text>
                      <Text style={{ color: C.faint, fontFamily: F.body, fontSize: 12 }}>
                        {h.tour.name}
                        {h.champions[0]?.score ? ` · ${h.champions[0].score}` : ''}
                      </Text>
                      {h.cup ? (
                        <Text style={{ color: C.faint, fontFamily: F.body, fontSize: 12 }}>
                          Cup: {h.cup.winner ? `${h.cup.winner} ` : 'Halved '}
                          {h.cup.a}–{h.cup.b}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
            </View>
          ) : (
            <Empty icon="ribbon-outline" title="No champions yet">
              <P sub center>
                Winners go up on the board once scores are in.
              </P>
            </Empty>
          ))}

        {tab === 'members' && (
          <List>
            {club.memberUids.map((u) => {
              const p = profiles[u];
              const on = follows.following.includes(u);
              return (
                <Row
                  key={u}
                  left={<Avatar name={p?.name ?? '?'} uri={p?.avatar} size={40} />}
                  title={p?.name ?? '…'}
                  subtitle={[`HCP ${fmtHi(p?.hi)}`, club.ownerUid === u ? 'Founder' : club.adminUids.includes(u) ? 'Admin' : null].filter(Boolean).join(' · ')}
                  onPress={() => router.push(`/user/${u}`)}
                  chevron={false}
                  right={u === me.uid ? <Label>You</Label> : <Button small kind={on ? 'secondary' : 'primary'} title={on ? 'Following' : 'Follow'} onPress={() => (on ? backend.unfollow(me.uid, u) : backend.follow(me.uid, u))} />}
                />
              );
            })}
          </List>
        )}

        {tab === 'records' &&
          (records.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
              {records.map((r, i) => (
                <Pressable
                  key={r.label}
                  disabled={!r.uid}
                  onPress={() => r.uid && router.push(`/user/${r.uid}`)}
                  style={[{ flexBasis: i === 0 ? '100%' : '47%', flexGrow: 1, backgroundColor: i === 0 ? C.ink : C.card, borderRadius: R.lg, padding: S.lg, gap: 6 }, shadow]}>
                  <Label color={i === 0 ? C.champagne : C.sub}>{r.label}</Label>
                  <Num size={i === 0 ? 44 : 32} color={i === 0 ? C.white : C.ink}>
                    {r.value}
                  </Num>
                  <Text style={{ fontFamily: F.bold, fontSize: 14, color: i === 0 ? C.white : C.ink }}>{r.name}</Text>
                  <Text style={{ fontFamily: F.body, fontSize: 12, color: i === 0 ? C.faint : C.sub }}>{r.detail}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Empty icon="stats-chart-outline" title="Records start with the first round" />
          ))}
      </View>
    </ScrollView>
  );
}

function TourCard({ h }: { h: Honour }) {
  const t = h.tour;
  return (
    <Pressable onPress={() => router.push(`/tour/${t.id}`)} style={({ pressed }) => [{ backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, gap: S.sm, opacity: pressed ? 0.85 : 1 }, shadow]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
        <Text style={{ flex: 1, fontFamily: F.bold, fontSize: 17, color: C.ink }}>{t.name}</Text>
        {h.live && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.ink, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.live }} />
            <Text style={{ color: C.white, fontFamily: F.bold, fontSize: 10, letterSpacing: 1 }}>LIVE</Text>
          </View>
        )}
      </View>
      <Text style={{ fontFamily: F.body, fontSize: 13, color: C.sub }}>
        {[fmtRange(t.startDate, t.endDate), t.location, `${t.players.length} players`, `${t.rounds.length} round${t.rounds.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
      </Text>
      {h.champions.length ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, borderTopWidth: 0.5, borderTopColor: C.line, paddingTop: S.sm }}>
          <Icon name={h.live ? 'trending-up' : 'trophy'} size={16} color={h.live ? C.ink : C.champagne} />
          <Text style={{ fontFamily: F.semi, fontSize: 13, color: C.ink, flex: 1 }}>
            {h.live ? 'Leading: ' : 'Champion: '}
            {h.champions.map((c) => c.name).join(' & ')}
          </Text>
          {h.cup?.winner ? <Text style={{ fontFamily: F.medium, fontSize: 12, color: C.sub }}>Cup: {h.cup.winner}</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

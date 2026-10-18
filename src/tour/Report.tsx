import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import * as E from '@/core/engine';
import { mainComp } from '@/core/notify';
import { awards, cutPosition, pct, penalties, tourReport, type Award, type Breakdown, type StatLine } from '@/core/stats';
import type { ScoreMap, Tour } from '@/core/types';
import { RoundStats } from '@/social/RoundStats';
import { shareText } from '@/ui/confirm';
import { Button, Chip, Display, Empty, Icon, Label, P } from '@/ui/kit';
import { C, F, R, S, shadow } from '@/ui/theme';

type View_ = 'awards' | 'players' | 'groups' | 'teams' | 'tour';

const avg = (n: number, d: number, digits = 1) => (d ? (n / d).toFixed(digits) : '–');

/** Columns of the stats table; `v` is the sort value (higher first unless `low`). */
const COLS: { k: string; l: string; v: (s: StatLine) => number | null; show?: (s: StatLine) => string; low?: boolean }[] = [
  { k: 'rnd', l: 'RNDS', v: (s) => s.rounds },
  { k: 'avg', l: 'AVG', v: (s) => (s.rounds ? (s.strokes / s.holes) * 18 : null), show: (s) => avg(s.strokes * 18, s.holes), low: true },
  { k: 'pts', l: 'PTS/RD', v: (s) => (s.holes ? (s.pts / s.holes) * 18 : null), show: (s) => avg(s.pts * 18, s.holes) },
  { k: 'bir', l: 'BIRD+', v: (s) => s.birdies + s.eagles },
  { k: 'par', l: 'PARS', v: (s) => s.pars },
  { k: 'bog', l: 'BOG', v: (s) => s.bogeys },
  { k: 'dbl', l: 'DBL', v: (s) => s.doubles },
  { k: 'tri', l: 'TRIP', v: (s) => s.triples },
  { k: 'quad', l: 'QUAD+', v: (s) => s.quads },
  { k: 'blob', l: 'BLOBS', v: (s) => s.blobs },
  { k: 'fw', l: 'FWY %', v: (s) => (s.fwHoles ? s.fwHit / s.fwHoles : null), show: (s) => (s.fwHoles ? `${pct(s.fwHit, s.fwHoles)}` : '–') },
  { k: 'left', l: 'LEFT', v: (s) => s.fwLeft },
  { k: 'right', l: 'RIGHT', v: (s) => s.fwRight },
  { k: 'gir', l: 'GIR %', v: (s) => (s.puttHoles ? s.gir / s.puttHoles : null), show: (s) => (s.puttHoles ? `${pct(s.gir, s.puttHoles)}` : '–') },
  { k: 'putts', l: 'PUTTS/RD', v: (s) => (s.puttHoles ? (s.putts / s.puttHoles) * 18 : null), show: (s) => avg(s.putts * 18, s.puttHoles), low: true },
  { k: '3p', l: '3-PUTTS', v: (s) => s.threePutts },
  { k: 'pen', l: 'PENS', v: (s) => penalties(s) },
  { k: 'water', l: 'WATER', v: (s) => s.water },
  { k: 'ob', l: 'OB', v: (s) => s.ob },
  { k: 'lost', l: 'LOST', v: (s) => s.lost },
  { k: 'sand', l: 'SAND', v: (s) => s.sand },
  { k: 'bstr', l: 'BIRD RUN', v: (s) => s.birdieStreak },
  { k: 'bogstr', l: 'BOG RUN', v: (s) => s.bogeyStreak },
  { k: 'dblstr', l: 'DBL RUN', v: (s) => s.doubleStreak },
];

function Table({ rows }: { rows: Breakdown[] }) {
  const [sort, setSort] = useState('avg');
  const col = COLS.find((c) => c.k === sort)!;
  const sorted = [...rows].sort((a, b) => {
    const x = col.v(a.line),
      y = col.v(b.line);
    if (x == null) return 1;
    if (y == null) return -1;
    return col.low ? x - y : y - x;
  });
  return (
    <View style={[st.table, shadow]}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 128 }}>
          <View style={[st.cellHead, { alignItems: 'flex-start', paddingLeft: S.md }]}>
            <Text style={st.th}>NAME</Text>
          </View>
          {sorted.map((r) => (
            <View key={r.id} style={[st.cell, { alignItems: 'flex-start', paddingLeft: S.md }]}>
              <Text numberOfLines={2} style={{ fontFamily: F.semi, fontSize: 12, color: C.ink }}>
                {r.name}
              </Text>
            </View>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={{ flexDirection: 'row' }}>
              {COLS.map((c) => (
                <Pressable key={c.k} onPress={() => setSort(c.k)} style={[st.cellHead, { width: 58 }]}>
                  <Text style={[st.th, sort === c.k && { color: C.champagne }]}>{c.l}</Text>
                </Pressable>
              ))}
            </View>
            {sorted.map((r) => (
              <View key={r.id} style={{ flexDirection: 'row' }}>
                {COLS.map((c) => (
                  <View key={c.k} style={[st.cell, { width: 58 }, sort === c.k && { backgroundColor: '#FBF8F1' }]}>
                    <Text style={[st.td, sort === c.k && { fontFamily: F.heavy }]}>{c.show ? c.show(r.line) : (c.v(r.line) ?? '–')}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function AwardList({ title, items, dark }: { title: string; items: Award[]; dark?: boolean }) {
  if (!items.length) return null;
  const fg = dark ? C.white : C.ink;
  return (
    <View style={[{ backgroundColor: dark ? C.ink : C.card, borderRadius: R.lg, padding: S.xl, gap: S.md }, shadow]}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Icon name={dark ? 'trophy-outline' : 'receipt-outline'} color={dark ? C.champagne : C.ink} size={22} />
        <Display size={16} color={fg}>
          {title}
        </Display>
      </View>
      {items.map((a) => (
        <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: dark ? '#2A2A28' : C.line, paddingTop: S.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Label color={dark ? C.champagne : C.sub} style={{ fontSize: 10 }}>
              {a.title}
            </Label>
            <Text style={{ fontFamily: F.bold, fontSize: 15, color: fg }}>{a.winners.join(', ')}</Text>
          </View>
          <Text style={{ fontFamily: F.heavy, fontSize: 13, color: dark ? C.white : C.ink, textAlign: 'right', maxWidth: 120 }}>{a.value}</Text>
        </View>
      ))}
    </View>
  );
}

/** Missed-the-cut list for the headline competition, once the final round is under way. */
export function cutResult(tour: Tour, scores: ScoreMap) {
  const comp = mainComp(tour);
  if (!comp?.cut) return null;
  const M = E.model(tour, scores);
  const lb = E.leaderboard(M, comp);
  const last = lb.rounds.length - 1;
  if (last < 0 || !lb.rows.some((r) => r.per[last]?.n)) return null;
  const ranked = lb.rows.filter((r) => r.pos !== '');
  const at = cutPosition(ranked.length, comp.cut);
  const final = lb.rows.every((r) => r.per[last]?.done || r.per[last]?.skip || r.pos === '');
  return { comp, at, final, missed: ranked.filter((r) => (r.pos as number) > at) };
}

export function TourReport({ tour, scores }: { tour: Tour; scores: ScoreMap }) {
  const [rid, setRid] = useState<string | null>(null);
  const [view, setView] = useState<View_>('awards');
  const rep = useMemo(() => tourReport(tour, scores, rid), [tour, scores, rid]);
  const aw = useMemo(() => awards(rep.players), [rep]);
  const cut = useMemo(() => (rid ? null : cutResult(tour, scores)), [tour, scores, rid]);
  if (!rep.tour.holes) return <Empty icon="stats-chart-outline" title="The report fills in as scores come in" />;
  const honours = aw.filter((a) => a.kind === 'honour');
  const fines = aw.filter((a) => a.kind === 'fine');
  if (cut?.missed.length) fines.unshift({ id: 'cut', title: cut.final ? 'Missed the cut' : 'Below the projected cut', kind: 'fine', winners: cut.missed.map((r) => r.name), value: `${cut.missed.length} player${cut.missed.length === 1 ? '' : 's'}` });
  const scope = rid ? (tour.rounds.find((r) => r.id === rid)?.name ?? 'Round') : tour.name;
  const share = () =>
    shareText(
      [`${scope}: tour report`, '', 'HONOURS', ...honours.map((a) => `${a.title}: ${a.winners.join(', ')} (${a.value})`), '', 'PENALTIES', ...fines.map((a) => `${a.title}: ${a.winners.join(', ')} (${a.value})`), '', 'Sent from Tour Card'].join('\n'),
    );
  const views: { v: View_; l: string }[] = [
    { v: 'awards', l: 'Awards' },
    { v: 'players', l: 'Players' },
    ...(rep.groups.length ? [{ v: 'groups' as View_, l: 'Four-balls' }] : []),
    ...(rep.teams.length ? [{ v: 'teams' as View_, l: 'Teams' }] : []),
    { v: 'tour', l: 'Whole tour' },
  ];
  return (
    <View style={{ gap: S.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Chip label="All rounds" on={!rid} onPress={() => setRid(null)} />
        {tour.rounds.map((r) => (
          <Chip key={r.id} label={r.name} on={rid === r.id} onPress={() => setRid(r.id)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {views.map((v) => (
          <Chip key={v.v} label={v.l} on={view === v.v} onPress={() => setView(v.v)} color={C.charcoal} />
        ))}
      </View>
      {view === 'awards' && (
        <>
          <AwardList title="Honours" items={honours} dark />
          <AwardList title="Penalties" items={fines} />
          {!rep.detail.fairways && !rep.detail.putts && (
            <P sub style={{ fontSize: 12 }}>
              Fairway, putting and penalty awards appear once players turn on hole stats while scoring.
            </P>
          )}
          <Button kind="secondary" icon="share-outline" title="Share the report" onPress={share} />
        </>
      )}
      {view === 'players' && <Table rows={rep.players} />}
      {view === 'groups' && <Table rows={rep.groups} />}
      {view === 'teams' && (
        <>
          <Table rows={rep.teams} />
          {rep.teams.map((t) => (
            <RoundStats key={t.id} s={t.line} title={t.name} />
          ))}
        </>
      )}
      {view === 'tour' && <RoundStats s={rep.tour} title={`${scope}, everyone`} />}
      {view !== 'awards' && <P sub style={{ fontSize: 11 }}>Tap a column to sort. Rounds played as a team ball (foursomes, scramble) aren't counted for individuals.</P>}
    </View>
  );
}

const st = StyleSheet.create({
  table: { backgroundColor: C.card, borderRadius: R.lg, overflow: 'hidden' },
  cellHead: { height: 36, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  th: { color: C.white, fontFamily: F.bold, fontSize: 9, letterSpacing: 1 },
  cell: { height: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  td: { fontFamily: F.medium, fontSize: 13, color: C.ink, fontVariant: ['tabular-nums'] },
});

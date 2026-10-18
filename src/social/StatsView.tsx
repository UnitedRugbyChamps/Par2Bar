import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { fmtRel } from '@/core/engine';
import { handicapIndex, lifetimeStats } from '@/core/handicap';
import { lineFromRecords } from '@/core/stats';
import type { RoundRecord } from '@/core/types';
import { RoundStats } from './RoundStats';
import { Card, Empty, Label, Num, P } from '@/ui/kit';
import { C, F, S } from '@/ui/theme';
import { fmtDate } from '@/tour/helpers';
import { fmtHi } from './util';

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const f1 = (v: number | null) => (v == null ? '–' : v.toFixed(1));

function RoundLine({ label, r }: { label: string; r: RoundRecord | null }) {
  if (!r) return null;
  return (
    <Pressable onPress={() => router.push(`/round/${encodeURIComponent(r.id)}`)} style={{ flex: 1 }}>
      <Card style={{ flex: 1 }}>
        <Label>{label}</Label>
        <Num size={34}>{r.gross}</Num>
        <Text style={{ fontFamily: F.semi, color: C.ink, fontSize: 13 }} numberOfLines={1}>
          {fmtRel(r.gross - sum(r.par))} · {r.course}
        </Text>
        <Text style={{ fontFamily: F.body, color: C.sub, fontSize: 12 }} numberOfLines={1}>
          {fmtDate(r.date, { day: 'numeric', month: 'short', year: 'numeric' })} · {r.tourName}
        </Text>
      </Card>
    </Pressable>
  );
}

export function StatsView({ rounds }: { rounds: RoundRecord[] }) {
  if (!rounds.length)
    return (
      <Empty icon="stats-chart-outline" title="No rounds yet">
        <P sub center>
          Finish an 18-hole round on a tour and your stats, best and worst rounds and handicap index build from it.
        </P>
      </Empty>
    );
  const s = lifetimeStats(rounds);
  const hi = handicapIndex(rounds);
  const last20 = [...rounds].sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at).slice(0, 20);
  const counting = new Set(
    [...last20]
      .sort((a, b) => a.differential - b.differential)
      .slice(0, [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7, 8][last20.length])
      .map((r) => r.id),
  );
  const maxD = Math.max(...last20.map((r) => r.differential), 1);
  const bars = [...last20].reverse();
  const mix = [
    ['Eagles+', s.eagles],
    ['Birdies', s.birdies],
    ['Pars', s.pars],
    ['Bogeys', s.bogeys],
    ['Double+', s.doubles],
  ] as const;
  const shades = [C.champagne, C.ink, '#5B5B57', '#A9A9A4', '#DADAD5'];
  return (
    <View style={{ gap: S.md }}>
      <Card dark style={{ gap: S.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Label color={C.faint}>Handicap index</Label>
            <Num size={52} color={C.white}>
              {fmtHi(hi)}
            </Num>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Label color={C.faint}>Rounds</Label>
            <Num size={22} color={C.white}>
              {s.rounds}
            </Num>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 70 }}>
          {bars.map((r) => (
            <View key={r.id} style={{ flex: 1, height: `${Math.max(8, (r.differential / maxD) * 100)}%`, backgroundColor: counting.has(r.id) ? C.champagne : '#3A3A38', borderRadius: 3 }} />
          ))}
        </View>
        <Text style={{ color: C.faint, fontFamily: F.body, fontSize: 12 }}>
          {hi == null
            ? `Score differentials from your last ${last20.length} rounds. An index needs 3 rounds.`
            : `Score differentials from your last ${last20.length} rounds. The ${counting.size} gold bars count towards your index.`}
          {rounds.some((r) => r.estimated) ? ' Rounds on tees without a rating and slope are estimated from par.' : ''}
        </Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: S.md }}>
        <RoundLine label="Best round" r={s.best} />
        <RoundLine label="Worst round" r={s.worst} />
      </View>

      <Card>
        <Label>Scoring</Label>
        <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginVertical: 6 }}>
          {mix.map(([l, n], i) => (n ? <View key={l} style={{ flex: n, backgroundColor: shades[i] }} /> : null))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: S.md }}>
          {mix.map(([l, n], i) => (
            <View key={l} style={{ width: '33.3%', gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: shades[i], borderWidth: i === 4 ? 1 : 0, borderColor: C.line }} />
                <Label>{l}</Label>
              </View>
              <Num size={20}>{n}</Num>
              <Text style={{ fontSize: 11, color: C.sub, fontFamily: F.body }}>{s.holes ? `${Math.round((n / s.holes) * 100)}% of holes` : ''}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Label>Averages</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: S.lg, marginTop: 4 }}>
          {[
            ['Score', f1(s.avgGross)],
            ['To par', s.avgToPar == null ? '–' : `${s.avgToPar >= 0 ? '+' : '−'}${Math.abs(s.avgToPar).toFixed(1)}`],
            ['Points', f1(s.avgPts)],
            ['Par 3s', s.par3 == null ? '–' : s.par3.toFixed(2)],
            ['Par 4s', s.par4 == null ? '–' : s.par4.toFixed(2)],
            ['Par 5s', s.par5 == null ? '–' : s.par5.toFixed(2)],
            ['Putts', f1(s.puttsAvg)],
            ['Courses', String(s.courses)],
            ['Best pts', s.bestPts ? String(s.bestPts.pts) : '–'],
          ].map(([l, v]) => (
            <View key={l} style={{ width: '33.3%', gap: 2 }}>
              <Num size={22}>{v}</Num>
              <Label>{l}</Label>
            </View>
          ))}
        </View>
      </Card>
      <RoundStats s={lineFromRecords(rounds)} title="Tee to green, to date" />
    </View>
  );
}

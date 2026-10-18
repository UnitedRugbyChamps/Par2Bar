import { Text, View } from 'react-native';

import { pct, penalties, type StatLine } from '@/core/stats';
import { Card, Label, Num } from '@/ui/kit';
import { C, F, S } from '@/ui/theme';

/** Tee to green numbers for one round or many. Only what was recorded shows. */
export function RoundStats({ s, title = 'Round stats' }: { s: StatLine; title?: string }) {
  const rounds = Math.max(1, s.rounds);
  const tiles: { v: string; l: string; sub?: string }[] = [];
  if (s.fwHoles) tiles.push({ v: `${pct(s.fwHit, s.fwHoles)}%`, l: 'Fairways', sub: `${s.fwHit}/${s.fwHoles} · ${s.fwLeft} left · ${s.fwRight} right` });
  if (s.puttHoles) {
    tiles.push({ v: `${pct(s.gir, s.puttHoles)}%`, l: 'Greens in reg.', sub: `${s.gir}/${s.puttHoles}` });
    tiles.push({ v: s.rounds > 1 ? (s.putts / rounds).toFixed(1) : String(s.putts), l: s.rounds > 1 ? 'Putts a round' : 'Putts', sub: `${s.onePutts} one-putts · ${s.threePutts} three-putts` });
  }
  const pens = penalties(s);
  if (pens || s.sand || s.fwHoles || s.puttHoles) {
    tiles.push({ v: String(pens), l: 'Penalties', sub: [s.water && `${s.water} water`, s.ob && `${s.ob} OB`, s.lost && `${s.lost} lost`, s.pen && `${s.pen} other`].filter(Boolean).join(' · ') || 'Clean' });
    tiles.push({ v: String(s.sand), l: 'Sand shots' });
  }
  tiles.push({ v: String(s.birdieStreak), l: 'Best birdie run' });
  tiles.push({ v: String(s.bogeyStreak), l: 'Longest bogey run' });
  tiles.push({ v: String(s.blobs), l: 'Blobs', sub: 'holes with no points' });
  return (
    <Card style={{ gap: S.md }}>
      <Label>{title}</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: S.lg }}>
        {tiles.map((t) => (
          <View key={t.l} style={{ width: '33.33%', paddingRight: S.sm, gap: 2 }}>
            <Num size={24}>{t.v}</Num>
            <Label style={{ fontSize: 9 }}>{t.l}</Label>
            {t.sub ? <Text style={{ fontFamily: F.body, fontSize: 10, color: C.faint }}>{t.sub}</Text> : null}
          </View>
        ))}
      </View>
      {!s.fwHoles && !s.puttHoles ? <Text style={{ fontFamily: F.body, fontSize: 12, color: C.sub }}>Turn on hole stats while scoring to track fairways, greens, putts, sand and penalties.</Text> : null}
    </Card>
  );
}

import { StyleSheet, Text, View } from 'react-native';

import { C, F, R } from '@/ui/theme';

/** Scorecard marks the way they're drawn by hand: circles under par, squares over. */
export function ScoreMark({ g, par, size = 26, dark }: { g: number | null | undefined; par: number; size?: number; dark?: boolean }) {
  const fg = dark ? C.white : C.ink;
  if (!g) return <Text style={{ width: size, textAlign: 'center', color: C.faint, fontFamily: F.medium }}>·</Text>;
  const d = g - par;
  const text = <Text style={{ fontFamily: F.bold, fontSize: size * 0.5, color: d <= -2 ? (dark ? C.ink : C.white) : fg, fontVariant: ['tabular-nums'] }}>{g}</Text>;
  const box = (radius: number, border: number, fill?: string) => (
    <View style={{ width: size, height: size, borderRadius: radius, borderWidth: border, borderColor: fg, backgroundColor: fill, alignItems: 'center', justifyContent: 'center' }}>{text}</View>
  );
  if (d <= -2) return box(size / 2, 0, fg); // eagle or better: filled circle
  if (d === -1) return box(size / 2, 1.3); // birdie: circle
  if (d === 0) return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>{text}</View>;
  if (d === 1) return box(2, 1.3); // bogey: square
  return (
    <View style={{ width: size, height: size, borderWidth: 1.3, borderColor: fg, borderRadius: 2, padding: 1.5 }}>
      <View style={{ flex: 1, borderWidth: 1, borderColor: fg, borderRadius: 1, alignItems: 'center', justifyContent: 'center' }}>{text}</View>
    </View>
  ); // double bogey or worse: double square
}

const sum = (a: (number | null | undefined)[]) => a.reduce<number>((x, y) => x + (y ?? 0), 0);

/** Two stacked nines that fit a phone without sideways scrolling. */
export function ScoreCard({ par, si, strokes, pts, dark }: { par: number[]; si?: number[]; strokes: (number | null)[]; pts?: (number | null)[]; dark?: boolean }) {
  const fg = dark ? C.white : C.ink;
  const line = dark ? '#2A2A28' : C.line;
  const nine = (from: number) => {
    const idx = Array.from({ length: 9 }, (_, i) => from + i);
    const played = idx.filter((i) => strokes[i]);
    return (
      <View style={{ gap: 0 }}>
        <View style={[st.row, { backgroundColor: dark ? C.white : C.ink, borderRadius: 8 }]}>
          <Text style={[st.lab, { color: dark ? C.ink : C.white }]}>HOLE</Text>
          {idx.map((i) => (
            <Text key={i} style={[st.cell, st.head, { color: dark ? C.ink : C.white }]}>
              {i + 1}
            </Text>
          ))}
          <Text style={[st.sum, st.head, { color: dark ? C.ink : C.white }]}>{from ? 'IN' : 'OUT'}</Text>
        </View>
        {si && (
          <View style={[st.row, { borderBottomColor: line }]}>
            <Text style={[st.lab, { color: C.faint }]}>SI</Text>
            {idx.map((i) => (
              <Text key={i} style={[st.cell, { color: C.faint, fontSize: 11 }]}>
                {si[i]}
              </Text>
            ))}
            <Text style={st.sum} />
          </View>
        )}
        <View style={[st.row, { borderBottomColor: line }]}>
          <Text style={[st.lab, { color: C.sub }]}>PAR</Text>
          {idx.map((i) => (
            <Text key={i} style={[st.cell, { color: C.sub }]}>
              {par[i]}
            </Text>
          ))}
          <Text style={[st.sum, { color: C.sub }]}>{sum(par.slice(from, from + 9))}</Text>
        </View>
        <View style={[st.row, { borderBottomColor: line, paddingVertical: 6 }]}>
          <Text style={[st.lab, { color: fg }]}>SCORE</Text>
          {idx.map((i) => (
            <View key={i} style={st.cellBox}>
              <ScoreMark g={strokes[i]} par={par[i]} size={24} dark={dark} />
            </View>
          ))}
          <Text style={[st.sum, { color: fg, fontFamily: F.heavy, fontSize: 15 }]}>{played.length ? sum(strokes.slice(from, from + 9)) : ''}</Text>
        </View>
        {pts && (
          <View style={[st.row, { borderBottomWidth: 0 }]}>
            <Text style={[st.lab, { color: C.sub }]}>PTS</Text>
            {idx.map((i) => (
              <Text key={i} style={[st.cell, { color: C.sub }]}>
                {strokes[i] ? pts[i] : ''}
              </Text>
            ))}
            <Text style={[st.sum, { color: C.sub }]}>{played.length ? sum(pts.slice(from, from + 9)) : ''}</Text>
          </View>
        )}
      </View>
    );
  };
  return (
    <View style={{ gap: 14 }}>
      {nine(0)}
      {nine(9)}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
        {[
          ['Eagle+', -2],
          ['Birdie', -1],
          ['Bogey', 1],
          ['Double+', 2],
        ].map(([l, d]) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <ScoreMark g={4 + (d as number)} par={4} size={16} dark={dark} />
            <Text style={{ fontSize: 11, color: C.sub, fontFamily: F.medium }}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth },
  lab: { width: 46, paddingLeft: 8, fontSize: 9.5, fontFamily: F.bold, letterSpacing: 1 },
  head: { fontFamily: F.bold, fontSize: 12 },
  cell: { flex: 1, textAlign: 'center', fontSize: 13, fontFamily: F.medium, fontVariant: ['tabular-nums'] },
  cellBox: { flex: 1, alignItems: 'center' },
  sum: { width: 38, textAlign: 'center', fontSize: 13, fontFamily: F.bold, fontVariant: ['tabular-nums'] },
});

export const cardRadius = R.lg;

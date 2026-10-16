import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { C, R, S } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export const Icon = (p: { name: IconName; size?: number; color?: string }) => <Ionicons name={p.name} size={p.size ?? 20} color={p.color ?? C.ink} />;

export function Screen({ children, scroll = true, pad = true }: { children: ReactNode; scroll?: boolean; pad?: boolean }) {
  const style = [{ backgroundColor: C.bg, flex: 1 } as const];
  const inner = { padding: pad ? S.lg : 0, gap: S.md, paddingBottom: 48 };
  if (!scroll) return <View style={[style, inner]}>{children}</View>;
  return (
    <ScrollView style={style} contentContainerStyle={inner} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [st.card, style, pressed && { opacity: 0.7 }]}>
        {children}
      </Pressable>
    );
  return <View style={[st.card, style]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={st.title}>{children}</Text>;
}
export function H({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={st.hRow}>
      <Text style={st.h}>{children}</Text>
      {right}
    </View>
  );
}
export function P({ children, sub, center, style }: { children: ReactNode; sub?: boolean; center?: boolean; style?: StyleProp<any> }) {
  return <Text style={[st.p, sub && { color: C.sub }, center && { textAlign: 'center' }, style]}>{children}</Text>;
}

export function Row({
  title,
  subtitle,
  right,
  left,
  onPress,
  chevron = !!onPress,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  left?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [st.row, pressed && { backgroundColor: C.bg }]}>
      {left}
      <View style={{ flex: 1 }}>
        <Text style={st.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={st.rowSub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {typeof right === 'string' || typeof right === 'number' ? <Text style={st.rowRight}>{right}</Text> : right}
      {chevron && <Icon name="chevron-forward" size={18} color={C.faint} />}
    </Pressable>
  );
}

export function List({ children }: { children: ReactNode }) {
  return <View style={st.list}>{children}</View>;
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  busy,
  disabled,
  small,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: IconName;
  busy?: boolean;
  disabled?: boolean;
  small?: boolean;
}) {
  const bg = kind === 'primary' ? C.brand : kind === 'danger' ? C.danger : kind === 'secondary' ? C.brandSoft : 'transparent';
  const fg = kind === 'primary' || kind === 'danger' ? '#fff' : C.brand;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [st.btn, small && st.btnSmall, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 }]}>
      {busy ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text style={[st.btnText, small && { fontSize: 14 }, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, ...p }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={st.label}>{label}</Text>
      <TextInput placeholderTextColor={C.faint} {...p} style={[st.input, p.multiline && { minHeight: 80 }, p.style]} />
      {hint ? <Text style={st.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return <Row title={label} subtitle={sub} right={<Switch value={value} onValueChange={onChange} trackColor={{ true: C.brand }} />} />;
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.seg}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[st.segItem, value === o.value && st.segOn]}>
          <Text style={[st.segText, value === o.value && { color: '#fff' }]}>{o.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function Chip({ label, on, onPress, color }: { label: string; on?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={[st.chip, on && { backgroundColor: color ?? C.brand, borderColor: color ?? C.brand }]}>
      <Text style={[st.chipText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Avatar({ name, color, size = 34 }: { name: string; color?: string; size?: number }) {
  const ini = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? C.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: color ? '#fff' : C.brand, fontWeight: '700', fontSize: size * 0.38 }}>{ini}</Text>
    </View>
  );
}

export function Empty({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', padding: S.xl, gap: S.sm }}>
      <Icon name={icon} size={40} color={C.faint} />
      <Text style={[st.h, { textAlign: 'center' }]}>{title}</Text>
      {children}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
      <ActivityIndicator color={C.brand} />
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return children ? <Text style={{ color: C.danger }}>{children}</Text> : null;
}

export const st = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, gap: S.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  title: { fontSize: 26, fontWeight: '800', color: C.ink },
  hRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.sm },
  h: { fontSize: 17, fontWeight: '700', color: C.ink },
  p: { fontSize: 15, color: C.ink, lineHeight: 21 },
  list: { backgroundColor: C.card, borderRadius: R.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, backgroundColor: C.card },
  rowTitle: { fontSize: 16, fontWeight: '600', color: C.ink },
  rowSub: { fontSize: 13, color: C.sub, marginTop: 2 },
  rowRight: { fontSize: 16, fontWeight: '700', color: C.ink, fontVariant: ['tabular-nums'] },
  btn: { flexDirection: 'row', gap: S.sm, alignItems: 'center', justifyContent: 'center', borderRadius: R.md, paddingVertical: 14, paddingHorizontal: S.lg },
  btnSmall: { paddingVertical: 8, paddingHorizontal: S.md },
  btnText: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: C.sub, textTransform: 'uppercase', letterSpacing: 0.5 },
  hint: { fontSize: 12, color: C.sub },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: 12, fontSize: 16, color: C.ink },
  seg: { gap: 6, paddingVertical: 2 },
  segItem: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  segOn: { backgroundColor: C.brand, borderColor: C.brand },
  segText: { fontWeight: '600', color: C.ink },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  chipText: { fontSize: 14, fontWeight: '600', color: C.ink },
});

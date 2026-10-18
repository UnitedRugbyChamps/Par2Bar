import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { C, F, R, S, shadow } from './theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export const Icon = (p: { name: IconName; size?: number; color?: string }) => <Ionicons name={p.name} size={p.size ?? 20} color={p.color ?? C.ink} />;

export function Screen({ children, scroll = true, pad = true, bg = C.bg }: { children: ReactNode; scroll?: boolean; pad?: boolean; bg?: string }) {
  const inner = { padding: pad ? S.lg : 0, gap: S.md, paddingBottom: 56 };
  if (!scroll) return <View style={[{ backgroundColor: bg, flex: 1 }, inner]}>{children}</View>;
  return (
    <ScrollView style={{ backgroundColor: bg, flex: 1 }} contentContainerStyle={inner} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style, onPress, dark }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; dark?: boolean }) {
  const base = [st.card, dark && { backgroundColor: C.ink }, style];
  if (onPress)
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...base, pressed && { transform: [{ scale: 0.985 }], opacity: 0.92 }]}>
        {children}
      </Pressable>
    );
  return <View style={base}>{children}</View>;
}

/** Thin, wide-tracked capitals: the display voice of the app. */
export function Display({ children, size = 28, color = C.ink, style }: { children: ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: F.display, fontSize: size, letterSpacing: size * 0.12, color, textTransform: 'uppercase', lineHeight: size * 1.15 }, style]}>{children}</Text>;
}

export function Title({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[st.title, style]}>{children}</Text>;
}
export function Label({ children, color = C.sub, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[st.label, { color }, style]}>{children}</Text>;
}
export function H({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={st.hRow}>
      <Text style={st.h}>{children}</Text>
      {right}
    </View>
  );
}
export function P({ children, sub, center, style, numberOfLines }: { children: ReactNode; sub?: boolean; center?: boolean; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  return (
    <Text numberOfLines={numberOfLines} style={[st.p, sub && { color: C.sub }, center && { textAlign: 'center' }, style]}>
      {children}
    </Text>
  );
}
export function Num({ children, size = 28, color = C.ink, style }: { children: ReactNode; size?: number; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: F.heavy, fontSize: size, color, fontVariant: ['tabular-nums'], letterSpacing: -0.5 }, style]}>{children}</Text>;
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
    <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [st.row, pressed && { backgroundColor: C.soft }]}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
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
      {chevron && <Icon name="chevron-forward" size={16} color={C.faint} />}
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
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'light';
  icon?: IconName;
  busy?: boolean;
  disabled?: boolean;
  small?: boolean;
}) {
  const bg = { primary: C.ink, danger: C.danger, secondary: 'transparent', ghost: 'transparent', light: C.white }[kind];
  const fg = { primary: C.white, danger: C.white, secondary: C.ink, ghost: C.ink, light: C.ink }[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        st.btn,
        small && st.btnSmall,
        { backgroundColor: bg, opacity: disabled ? 0.35 : pressed ? 0.75 : 1 },
        kind === 'secondary' && { borderWidth: 1.5, borderColor: C.ink },
      ]}>
      {busy ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={small ? 15 : 18} color={fg} /> : null}
      {title ? <Text style={[st.btnText, small && { fontSize: 13 }, { color: fg }]}>{title}</Text> : null}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, color = C.ink, bg = 'transparent', size = 22 }: { icon: IconName; onPress: () => void; color?: string; bg?: string; size?: number }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [{ width: size + 18, height: size + 18, borderRadius: R.pill, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 }]}>
      <Icon name={icon} size={size} color={color} />
    </Pressable>
  );
}

/** Back arrow for every pushed screen; with no history (a fresh link or reload) it goes home. */
export function BackButton({ color = C.ink }: { color?: string }) {
  return <IconButton icon="chevron-back" color={color} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}

export function Field({ label, hint, ...p }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={st.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={C.faint} {...p} style={[st.input, p.multiline && { minHeight: 90, textAlignVertical: 'top' }, p.style]} />
      {hint ? <Text style={st.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return <Row title={label} subtitle={sub} right={<Switch value={value} onValueChange={onChange} trackColor={{ true: C.ink, false: C.line }} thumbColor={C.white} {...webSwitch} />} />;
}

// react-native-web colours the thumb with its own props
const webSwitch = (Platform.OS === 'web' ? { activeThumbColor: C.white, activeTrackColor: C.ink } : {}) as object;

/** Underlined tabs, like a printed programme's section heads. */
export function Segmented<T extends string>({ value, options, onChange, dark }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; dark?: boolean }) {
  const fg = dark ? C.white : C.ink;
  return (
    <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: dark ? '#333' : C.line }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.xl, paddingHorizontal: 2 }}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <Pressable key={o.value} onPress={() => onChange(o.value)} style={{ paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: on ? fg : 'transparent' }}>
              <Text style={{ fontFamily: on ? F.bold : F.medium, fontSize: 14, color: on ? fg : C.faint, letterSpacing: 0.2 }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function Chip({ label, on, onPress, color }: { label: string; on?: boolean; onPress?: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.chip, on && { backgroundColor: color ?? C.ink, borderColor: color ?? C.ink }, pressed && { opacity: 0.7 }]}>
      <Text style={[st.chipText, on && { color: C.white }]}>{label}</Text>
    </Pressable>
  );
}

export function Avatar({ name, uri, color, size = 36, ring }: { name: string; uri?: string; color?: string; size?: number; ring?: 'new' | 'seen' }) {
  const ini = (name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const inner = uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.soft }} contentFit="cover" />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? C.ink, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: C.white, fontFamily: F.bold, fontSize: size * 0.36, letterSpacing: 0.5 }}>{ini}</Text>
    </View>
  );
  if (!ring) return inner;
  return (
    <View style={{ padding: 2.5, borderRadius: size, borderWidth: 2, borderColor: ring === 'new' ? C.ink : C.line }}>
      {inner}
    </View>
  );
}

export function Stat({ value, label, dark, small }: { value: ReactNode; label: string; dark?: boolean; small?: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 2, minWidth: 56 }}>
      <Num size={small ? 18 : 22} color={dark ? C.white : C.ink}>
        {value}
      </Num>
      <Label color={dark ? C.faint : C.sub} style={{ fontSize: 10 }}>
        {label}
      </Label>
    </View>
  );
}

export function Empty({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: S.xxl, paddingHorizontal: S.xl, gap: S.md }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={28} />
      </View>
      <Text style={[st.h, { textAlign: 'center' }]}>{title}</Text>
      {children}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
      <ActivityIndicator color={C.ink} />
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return children ? <Text style={{ color: C.danger, fontFamily: F.medium }}>{children}</Text> : null;
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: C.line }} />;
}

export const st = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, gap: S.sm, ...shadow },
  title: { fontSize: 30, fontFamily: F.heavy, color: C.ink, letterSpacing: -0.8 },
  hRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.md },
  h: { fontSize: 18, fontFamily: F.bold, color: C.ink, letterSpacing: -0.2 },
  p: { fontSize: 15, color: C.ink, lineHeight: 22, fontFamily: F.body },
  label: { fontSize: 11, fontFamily: F.semi, letterSpacing: 1.4, textTransform: 'uppercase' },
  list: { backgroundColor: C.card, borderRadius: R.lg, overflow: 'hidden', ...shadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, backgroundColor: C.card },
  rowTitle: { fontSize: 15, fontFamily: F.semi, color: C.ink },
  rowSub: { fontSize: 13, color: C.sub, marginTop: 2, fontFamily: F.body },
  rowRight: { fontSize: 16, fontFamily: F.heavy, color: C.ink, fontVariant: ['tabular-nums'] },
  btn: { flexDirection: 'row', gap: S.sm, alignItems: 'center', justifyContent: 'center', borderRadius: R.pill, paddingVertical: 15, paddingHorizontal: S.xl },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 14 },
  btnText: { fontSize: 15, fontFamily: F.bold, letterSpacing: 0.2 },
  fieldLabel: { fontSize: 11, fontFamily: F.semi, color: C.sub, textTransform: 'uppercase', letterSpacing: 1.4 },
  hint: { fontSize: 12, color: C.sub, fontFamily: F.body },
  input: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: R.md, paddingHorizontal: S.lg, paddingVertical: 14, fontSize: 16, color: C.ink, fontFamily: F.body },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.pill, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  chipText: { fontSize: 13, fontFamily: F.semi, color: C.ink },
});

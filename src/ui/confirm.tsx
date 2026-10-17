import { useSyncExternalStore } from 'react';
import { Alert, Modal, Platform, Pressable, Share, Text, View } from 'react-native';

import { C, R, S } from './theme';

/* Confirmation dialogs. Native phones use the system alert; on the web
 * (where browser dialogs can be blocked) an in-app sheet is shown instead. */
type Ask = { title: string; msg: string; ok: () => void } | null;
let current: Ask = null;
const subs = new Set<() => void>();
const set = (a: Ask) => {
  current = a;
  subs.forEach((s) => s());
};

export function confirm(title: string, msg: string, ok: () => void) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', style: 'destructive', onPress: ok },
    ]);
    return;
  }
  set({ title, msg, ok });
}

export function ConfirmHost() {
  const ask = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => current,
  );
  if (!ask) return null;
  const btn = (label: string, primary: boolean, onPress: () => void) => (
    <Pressable onPress={onPress} style={{ flex: 1, paddingVertical: 12, borderRadius: R.md, alignItems: 'center', backgroundColor: primary ? C.brand : C.brandSoft }}>
      <Text style={{ fontWeight: '700', fontSize: 16, color: primary ? '#fff' : C.brand }}>{label}</Text>
    </Pressable>
  );
  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => set(null)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: S.xl }}>
        <View style={{ backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, gap: S.md, width: '100%', maxWidth: 360 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>{ask.title}</Text>
          <Text style={{ fontSize: 15, color: C.sub }}>{ask.msg}</Text>
          <View style={{ flexDirection: 'row', gap: S.sm }}>
            {btn('Cancel', false, () => set(null))}
            {btn('OK', true, () => {
              set(null);
              ask.ok();
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Shares text, falling back to the clipboard where sharing isn't available. */
export async function shareText(message: string) {
  try {
    await Share.share({ message });
  } catch {
    try {
      await navigator.clipboard?.writeText(message);
    } catch {}
  }
}

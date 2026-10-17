import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Display } from './kit';
import { C, S } from './theme';

/** Header for the main tabs: a wide-tracked wordmark-style title and actions. */
export function TopBar({ title, right }: { title: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + S.sm, paddingHorizontal: S.lg, paddingBottom: S.sm, backgroundColor: C.bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Display size={22} style={{ letterSpacing: 5 }}>
        {title}
      </Display>
      <View style={{ flexDirection: 'row', gap: 4 }}>{right}</View>
    </View>
  );
}

import { Text, View } from 'react-native';

import { Icon, Label, List, Row } from '@/ui/kit';
import { C, F } from '@/ui/theme';
import { FORMATS, type FormatGroup } from './formats';

const GROUPS: FormatGroup[] = ['Individual', 'Pairs', 'Teams'];

/** Every golf format we know, grouped; ones the app can't score yet are shown but can't be picked. */
export function FormatPicker({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  return (
    <View style={{ gap: 12 }}>
      {GROUPS.map((g) => (
        <View key={g} style={{ gap: 6 }}>
          <Label>{g}</Label>
          <List>
            {FORMATS.filter((f) => f.group === g).map((f) => {
              const on = selected.includes(f.id);
              return (
                <Row
                  key={f.id}
                  title={f.label}
                  subtitle={f.about}
                  chevron={false}
                  onPress={f.apply ? () => onToggle(f.id) : undefined}
                  right={
                    f.apply ? (
                      <Icon name={on ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={on ? C.ink : C.faint} />
                    ) : (
                      <Text style={{ fontFamily: F.semi, fontSize: 10, color: C.faint, letterSpacing: 1 }}>SOON</Text>
                    )
                  }
                />
              );
            })}
          </List>
        </View>
      ))}
    </View>
  );
}

import { Alert, Platform } from 'react-native';

export function confirm(title: string, msg: string, ok: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${msg}`)) ok();
    return;
  }
  Alert.alert(title, msg, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'OK', style: 'destructive', onPress: ok },
  ]);
}

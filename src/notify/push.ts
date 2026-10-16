import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { recipients, teeTimesDue, zonedTime } from '@/core/notify';
import type { Tour, TourEvent, UserProfile } from '@/core/types';

const native = Platform.OS !== 'web';

if (native) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  });
}

let me: UserProfile | null = null;
/** The signed-in user, kept here so the offline backend can decide what to show. */
export const setNotifyUser = (u: UserProfile | null) => (me = u);

/** Asks for permission and returns this phone's Expo push token, or null when
 *  push isn't available (simulator, web, permission refused, no EAS project yet). */
export async function registerForPush(): Promise<string | null> {
  if (!native || !Device.isDevice) return null;
  if (Platform.OS === 'android') {
    // eslint-disable-next-line import/namespace
    await Notifications.setNotificationChannelAsync('tour', { name: 'Tour updates', importance: Notifications.AndroidImportance.HIGH });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;
  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  if (!projectId) return null;
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

/** Offline mode: show the events this user would have been pushed, on this phone. */
export function presentLocal(tour: Tour, events: TourEvent[]) {
  if (!native || !me) return;
  const u = me;
  events
    .filter((e) => recipients(tour, { ...e, by: undefined }, [u]).length)
    .slice(0, 3)
    .forEach((e) =>
      Notifications.scheduleNotificationAsync({ content: { title: e.title, body: e.body, data: { tourId: tour.id } }, trigger: null }).catch(() => {}),
    );
}

/** Offline mode: reminders 30 minutes before this user's own tee times. */
export async function scheduleTeeTimes(tours: Tour[], user: UserProfile) {
  if (!native || !user.notify.teeTimes) return;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(all.filter((n) => n.identifier.startsWith('tee-')).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  const now = Date.now();
  for (const t of tours) {
    const pid = t.players.find((p) => p.uid === user.uid)?.id;
    if (!pid) continue;
    for (const ev of teeTimesDue(t, now, now + 30 * 86400000)) {
      if (!ev.about.includes(pid) || !ev.rid) continue;
      const r = t.rounds.find((x) => x.id === ev.rid)!;
      const g = r.groups.find((x) => x.ids.includes(pid))!;
      const at = zonedTime(r.date, g.teeTime, t.timezone) - 30 * 60000;
      await Notifications.scheduleNotificationAsync({
        identifier: `tee-${t.id}-${r.id}`,
        content: { title: ev.title, body: ev.body, data: { tourId: t.id } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at) },
      }).catch(() => {});
    }
  }
}

export function onNotificationTap(cb: (tourId: string) => void) {
  if (!native) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const id = r.notification.request.content.data?.tourId;
    if (typeof id === 'string') cb(id);
  });
  return () => sub.remove();
}

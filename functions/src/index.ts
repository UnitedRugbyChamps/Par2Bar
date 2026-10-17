/* Cloud Functions: turn score changes into tour feed items and push
 * notifications, and send tee time reminders. */
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { logger } from 'firebase-functions';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { model } from '../../src/core/engine.ts';
import { finishedRecords, handicapIndex } from '../../src/core/handicap.ts';
import { diffEvents, recipients, teeTimesDue, type NewEvent } from '../../src/core/notify.ts';
import { defaultPrefs, type RoundRecord, type Score, type ScoreMap, type Tour, type UserProfile } from '../../src/core/types.ts';

initializeApp();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });
const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

async function loadUsers(uids: string[]): Promise<UserProfile[]> {
  if (!uids.length) return [];
  const [profiles, tokens] = await Promise.all([
    db.getAll(...uids.map((u) => db.doc(`users/${u}`))),
    db.getAll(...uids.map((u) => db.doc(`pushTokens/${u}`))),
  ]);
  return profiles
    .filter((s) => s.exists)
    .map((s, i) => {
      const d = s.data() as Partial<UserProfile>;
      return { uid: s.id, name: d.name ?? '', email: '', hi: d.hi ?? null, notify: { ...defaultPrefs, ...d.notify }, pushTokens: (tokens[i]?.data()?.tokens as string[]) ?? [] };
    });
}

/** Writes the events to the tour feed and pushes each to the members who want it. */
async function publish(tour: Tour, events: NewEvent[]) {
  if (!events.length) return;
  const at = Date.now();
  const batch = db.batch();
  events.forEach((e, i) => batch.set(db.collection(`tours/${tour.id}/events`).doc(), { ...e, tourId: tour.id, at: at + i }));
  await batch.commit();

  const users = await loadUsers(tour.memberUids);
  const messages: (ExpoPushMessage & { uid: string })[] = [];
  for (const e of events) {
    for (const u of recipients(tour, e, users)) {
      for (const to of u.pushTokens ?? []) {
        if (!Expo.isExpoPushToken(to)) continue;
        messages.push({ to, uid: u.uid, title: e.title, body: e.body, sound: 'default', channelId: 'tour', data: { tourId: tour.id } });
      }
    }
  }
  for (const chunk of expo.chunkPushNotifications(messages.map(({ uid: _uid, ...m }) => m))) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      // forget tokens for phones that uninstalled the app
      await Promise.all(
        tickets.map((t, i) => {
          if (t.status !== 'error' || t.details?.error !== 'DeviceNotRegistered') return null;
          const m = messages.find((x) => x.to === chunk[i].to);
          return m ? db.doc(`pushTokens/${m.uid}`).update({ tokens: FieldValue.arrayRemove(m.to) }) : null;
        }),
      );
    } catch (err) {
      logger.error('push failed', err);
    }
  }
}

export const onScoreWritten = onDocumentWritten({ document: 'tours/{tourId}/scores/{scoreId}', region: 'europe-west1' }, async (event) => {
  const after = event.data?.after.data() as Score | undefined;
  if (!after) return;
  const before = event.data?.before.data() as Score | undefined;
  const tourId = event.params.tourId;
  const [tourSnap, scoreSnap] = await Promise.all([db.doc(`tours/${tourId}`).get(), db.collection(`tours/${tourId}/scores`).get()]);
  if (!tourSnap.exists) return;
  const tour = { ...(tourSnap.data() as Tour), id: tourId };
  const now: ScoreMap = {};
  scoreSnap.docs.forEach((d) => {
    const s = d.data() as Score;
    now[`${tourId}~${s.rid}~${s.unitId}`] = s;
  });
  const key = `${tourId}~${after.rid}~${after.unitId}`;
  const prev = { ...now };
  if (before) prev[key] = before;
  else delete prev[key];
  now[key] = after;
  await publish(tour, diffEvents(tour, prev, now, { ...after, tourId }, after.updatedBy));
  await recordRounds(tour, now, before, after);
});

/** Finished cards become round records and profile posts, and update the player's handicap index. */
async function recordRounds(tour: Tour, scores: ScoreMap, before: Score | undefined, after: Score) {
  const M = model(tour, scores);
  for (const rec of finishedRecords(tour, before, after, M.chOf)) {
    await db.doc(`rounds/${rec.id}`).set(rec);
    const post = db.doc(`posts/round-${rec.id}`);
    const old = await post.get();
    await post.set({ uid: rec.uid, kind: 'round', images: [], caption: old.data()?.caption ?? '', at: old.data()?.at ?? Date.now(), likes: old.data()?.likes ?? [], round: rec });
    const user = await db.doc(`users/${rec.uid}`).get();
    if (user.exists && user.data()?.hiAuto !== false) {
      const all = await db.collection('rounds').where('uid', '==', rec.uid).get();
      const hi = handicapIndex(all.docs.map((d) => d.data() as RoundRecord));
      if (hi != null) await user.ref.update({ hi });
    }
  }
}

export const teeTimeReminders = onSchedule({ schedule: 'every 5 minutes', region: 'europe-west1' }, async () => {
  const to = Date.now();
  const from = to - 5 * 60000;
  const today = new Date(to - 86400000).toISOString().slice(0, 10);
  const snap = await db.collection('tours').where('endDate', '>=', today).get();
  for (const d of snap.docs) {
    const tour = { ...(d.data() as Tour), id: d.id };
    const due = teeTimesDue(tour, from, to);
    // only push reminders; they don't belong in the feed
    if (!due.length) continue;
    const users = await loadUsers(tour.memberUids);
    const messages: ExpoPushMessage[] = [];
    for (const e of due)
      for (const u of recipients(tour, e, users))
        for (const t of u.pushTokens ?? []) if (Expo.isExpoPushToken(t)) messages.push({ to: t, title: e.title, body: e.body, sound: 'default', channelId: 'tour', data: { tourId: tour.id } });
    for (const chunk of expo.chunkPushNotifications(messages)) await expo.sendPushNotificationsAsync(chunk).catch((err) => logger.error('push failed', err));
  }
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { diffEvents } from '@/core/notify';
import { defaultPrefs, scoreKey, type Course, type Score, type ScoreMap, type Tour, type TourEvent, type UserProfile } from '@/core/types';
import { BackendError, newId, newJoinCode, type Backend, type Unsub } from './types';

/** Offline backend: everything is stored on this device. Several accounts can
 *  sign in and out on one phone, which is enough to try every screen before
 *  the Firebase project exists. */
interface Store {
  users: Record<string, UserProfile & { pw: string; salt: string }>;
  session: string | null;
  tours: Record<string, Tour>;
  scores: Record<string, ScoreMap>;
  events: Record<string, TourEvent[]>;
  courses: Record<string, Course>;
}

const KEY = 'tourcard.offline.v1';
const empty = (): Store => ({ users: {}, session: null, tours: {}, scores: {}, events: {}, courses: {} });

type EventSink = (tour: Tour, events: TourEvent[]) => void;

export function createOfflineBackend(onEvents?: EventSink): Backend {
  let db: Store = empty();
  const listeners = new Set<() => void>();
  const ready = AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (raw) db = { ...empty(), ...JSON.parse(raw) };
    })
    .catch(() => {});

  const emit = () => listeners.forEach((l) => l());
  const save = async () => {
    emit();
    await AsyncStorage.setItem(KEY, JSON.stringify(db));
  };
  /** Runs `fn` now (once loaded) and on every change; returns an unsubscribe. */
  function watch(fn: () => void): Unsub {
    let live = true;
    const l = () => live && fn();
    ready.then(() => {
      if (!live) return;
      listeners.add(l);
      fn();
    });
    return () => {
      live = false;
      listeners.delete(l);
    };
  }
  const hash = (pw: string, salt: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + pw);
  const publicUser = (u: Store['users'][string]): UserProfile => {
    const { pw: _pw, salt: _salt, ...rest } = u;
    return rest;
  };
  const byEmail = (email: string) => Object.values(db.users).find((u) => u.email === email.trim().toLowerCase());

  return {
    kind: 'offline',

    onAuth(cb) {
      return watch(() => cb(db.session && db.users[db.session] ? publicUser(db.users[db.session]) : null));
    },
    async signUp(name, email, password) {
      await ready;
      email = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new BackendError('Enter a valid email address.');
      if (password.length < 6) throw new BackendError('Use at least 6 characters for the password.');
      if (byEmail(email)) throw new BackendError('An account with that email already exists.');
      const uid = newId('u');
      const salt = newId();
      db.users[uid] = { uid, name: name.trim(), email, hi: null, notify: { ...defaultPrefs }, pw: await hash(password, salt), salt };
      db.session = uid;
      await save();
    },
    async signIn(email, password) {
      await ready;
      const u = byEmail(email);
      if (!u || u.pw !== (await hash(password, u.salt))) throw new BackendError('Wrong email or password.');
      db.session = u.uid;
      await save();
    },
    async signOut() {
      db.session = null;
      await save();
    },
    async resetPassword() {
      throw new BackendError('Password reset by email works once the app is connected to its server.');
    },
    async updateProfile(uid, patch) {
      db.users[uid] = { ...db.users[uid], ...patch };
      await save();
    },
    async getUsers(uids) {
      await ready;
      return uids.map((u) => db.users[u]).filter(Boolean).map(publicUser);
    },
    async registerPushToken(uid, token) {
      const u = db.users[uid];
      if (!u || u.pushTokens?.includes(token)) return;
      u.pushTokens = [...(u.pushTokens || []), token];
      await save();
    },

    watchMyTours(uid, cb) {
      return watch(() => cb(Object.values(db.tours).filter((t) => t.memberUids.includes(uid)).sort((a, b) => b.startDate.localeCompare(a.startDate))));
    },
    watchTour(id, cb) {
      return watch(() => cb(db.tours[id] ?? null));
    },
    async createTour(t) {
      await ready;
      const id = newId('t');
      db.tours[id] = { ...t, id, joinCode: newJoinCode(), createdAt: Date.now() };
      await save();
      return id;
    },
    async updateTour(id, patch) {
      db.tours[id] = { ...db.tours[id], ...patch, id };
      await save();
    },
    async deleteTour(id) {
      delete db.tours[id];
      delete db.scores[id];
      delete db.events[id];
      await save();
    },
    async joinTour(code, uid) {
      await ready;
      const t = Object.values(db.tours).find((x) => x.joinCode === code.trim().toUpperCase());
      if (!t) throw new BackendError('No tour has that code.');
      if (!t.memberUids.includes(uid)) t.memberUids = [...t.memberUids, uid];
      await save();
      return t.id;
    },

    watchScores(tourId, cb) {
      return watch(() => cb(db.scores[tourId] || {}));
    },
    async saveScore(s, opts) {
      await ready;
      const tour = db.tours[s.tourId];
      const before = db.scores[s.tourId] || {};
      const score: Score = { ...s, updatedAt: Date.now() };
      const after = { ...before, [scoreKey(s.tourId, s.rid, s.unitId)]: score };
      db.scores[s.tourId] = after;
      if (tour && !opts?.silent) {
        const evs: TourEvent[] = diffEvents(tour, before, after, score, s.updatedBy).map((e) => ({ ...e, id: newId('e'), tourId: tour.id, at: Date.now() }));
        // keep the feed short: one live "score" line per unit, plus everything else
        const keep = (db.events[tour.id] || []).filter((e) => !(e.kind === 'score' && evs.some((n) => n.kind === 'score' && n.about.join() === e.about.join())));
        db.events[tour.id] = [...evs, ...keep].slice(0, 300);
        if (evs.length) onEvents?.(tour, evs);
      }
      await save();
    },
    watchEvents(tourId, cb) {
      return watch(() => cb(db.events[tourId] || []));
    },

    async searchCourses(q) {
      await ready;
      const s = q.trim().toLowerCase();
      return Object.values(db.courses)
        .filter((c) => !s || [c.name, c.club, c.city, c.country].some((x) => x?.toLowerCase().includes(s)))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    async getCourse(id) {
      await ready;
      return db.courses[id] ?? null;
    },
    async saveCourse(c) {
      await ready;
      const id = c.id || newId('c');
      db.courses[id] = { ...c, id };
      await save();
      return id;
    },
  };
}

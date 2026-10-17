import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { model } from '@/core/engine';
import { finishedRecords, handicapIndex } from '@/core/handicap';
import { diffEvents } from '@/core/notify';
import {
  defaultPrefs,
  scoreKey,
  type Club,
  type Course,
  type Post,
  type RoundRecord,
  type Score,
  type ScoreMap,
  type Story,
  type Tour,
  type TourEvent,
  type UserProfile,
} from '@/core/types';
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
  clubs: Record<string, Club>;
  follows: { from: string; to: string }[];
  posts: Record<string, Post>;
  stories: Record<string, Story>;
  rounds: Record<string, RoundRecord>;
}

const KEY = 'tourcard.offline.v1';
const empty = (): Store => ({ users: {}, session: null, tours: {}, scores: {}, events: {}, courses: {}, clubs: {}, follows: [], posts: {}, stories: {}, rounds: {} });
const DAY = 86400000;

type EventSink = (tour: Tour, events: TourEvent[]) => void;

export interface OfflineBackend extends Backend {
  /** Test mode only: adds profiles without passwords, for sample data. */
  seedProfiles(p: UserProfile[]): Promise<void>;
}

export function createOfflineBackend(onEvents?: EventSink): OfflineBackend {
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
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(db));
    } catch {
      throw new BackendError('This device is out of space for test data. Delete some photos or tours and try again.');
    }
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
  const byEmail = (email: string) => Object.values(db.users).find((u) => u.email && u.email === email.trim().toLowerCase());
  const matches = (q: string, ...fields: (string | undefined)[]) => {
    const s = q.trim().toLowerCase();
    return !s || fields.some((f) => f?.toLowerCase().includes(s));
  };

  /** Stores finished rounds, posts them to the player's profile and updates their index. */
  function recordRounds(tour: Tour, scores: ScoreMap, before: Score | undefined, after: Score, silent: boolean) {
    const M = model(tour, scores);
    for (const rec of finishedRecords(tour, before, after, M.chOf)) {
      db.rounds[rec.id] = rec;
      const postId = `round-${rec.id}`;
      const at = silent && rec.date ? Date.parse(rec.date + 'T16:00:00Z') : Date.now();
      const old = db.posts[postId];
      db.posts[postId] = { id: postId, uid: rec.uid, kind: 'round', images: [], caption: old?.caption ?? '', at: old?.at ?? at, likes: old?.likes ?? [], round: { ...rec, at } };
      const u = db.users[rec.uid];
      if (u && u.hiAuto !== false) {
        const hi = handicapIndex(Object.values(db.rounds).filter((r) => r.uid === rec.uid));
        if (hi != null) u.hi = hi;
      }
    }
  }

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
      db.users[uid] = { uid, name: name.trim(), email, hi: null, hiAuto: true, notify: { ...defaultPrefs }, createdAt: Date.now(), pw: await hash(password, salt), salt };
      db.session = uid;
      await save();
    },
    async signIn(email, password) {
      await ready;
      const u = byEmail(email);
      if (!u || !u.pw || u.pw !== (await hash(password, u.salt))) throw new BackendError('Wrong email or password.');
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
      if (patch.hiAuto) {
        const hi = handicapIndex(Object.values(db.rounds).filter((r) => r.uid === uid));
        if (hi != null) db.users[uid].hi = hi;
      }
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
    async seedProfiles(ps) {
      await ready;
      ps.forEach((p) => {
        if (!db.users[p.uid]) db.users[p.uid] = { ...p, pw: '', salt: '' };
      });
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
      const key = scoreKey(s.tourId, s.rid, s.unitId);
      const score: Score = { ...s, updatedAt: Date.now() };
      const after = { ...before, [key]: score };
      db.scores[s.tourId] = after;
      if (tour) {
        recordRounds(tour, after, before[key], score, !!opts?.silent);
        if (!opts?.silent) {
          const evs: TourEvent[] = diffEvents(tour, before, after, score, s.updatedBy).map((e) => ({ ...e, id: newId('e'), tourId: tour.id, at: Date.now() }));
          // keep the feed short: one live "score" line per unit, plus everything else
          const keep = (db.events[tour.id] || []).filter((e) => !(e.kind === 'score' && evs.some((n) => n.kind === 'score' && n.about.join() === e.about.join())));
          db.events[tour.id] = [...evs, ...keep].slice(0, 300);
          if (evs.length) onEvents?.(tour, evs);
        }
      }
      await save();
    },
    watchEvents(tourId, cb) {
      return watch(() => cb(db.events[tourId] || []));
    },

    watchUser(uid, cb) {
      return watch(() => cb(db.users[uid] ? publicUser(db.users[uid]) : null));
    },
    async searchUsers(q) {
      await ready;
      return Object.values(db.users)
        .filter((u) => matches(q, u.name, u.homeClub))
        .map(publicUser)
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    watchFollows(uid, cb) {
      return watch(() =>
        cb({ followers: db.follows.filter((f) => f.to === uid).map((f) => f.from), following: db.follows.filter((f) => f.from === uid).map((f) => f.to) }),
      );
    },
    async follow(me, uid) {
      if (me === uid || db.follows.some((f) => f.from === me && f.to === uid)) return;
      db.follows.push({ from: me, to: uid });
      await save();
    },
    async unfollow(me, uid) {
      db.follows = db.follows.filter((f) => !(f.from === me && f.to === uid));
      await save();
    },
    watchPosts(uids, cb) {
      const set = new Set(uids);
      return watch(() => cb(Object.values(db.posts).filter((p) => set.has(p.uid)).sort((a, b) => b.at - a.at)));
    },
    async createPost(p) {
      const id = newId('post');
      db.posts[id] = { ...p, id };
      await save();
      return id;
    },
    async deletePost(id) {
      delete db.posts[id];
      await save();
    },
    async toggleLike(postId, uid) {
      const p = db.posts[postId];
      if (!p) return;
      p.likes = p.likes.includes(uid) ? p.likes.filter((x) => x !== uid) : [...p.likes, uid];
      await save();
    },
    watchStories(uids, cb) {
      const set = new Set(uids);
      return watch(() => {
        const since = Date.now() - DAY;
        cb(Object.values(db.stories).filter((s) => set.has(s.uid) && s.at > since).sort((a, b) => a.at - b.at));
      });
    },
    async addStory(s) {
      const since = Date.now() - DAY;
      for (const [k, v] of Object.entries(db.stories)) if (v.at < since) delete db.stories[k];
      const id = newId('story');
      db.stories[id] = { ...s, id };
      await save();
    },
    watchRounds(uid, cb) {
      return watch(() => cb(Object.values(db.rounds).filter((r) => r.uid === uid).sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at)));
    },
    watchRound(id, cb) {
      return watch(() => cb(db.rounds[id] ?? null));
    },
    async uploadImage(_uid, dataUri) {
      // test mode keeps the (already resized) image inline
      return dataUri;
    },

    watchMyClubs(uid, cb) {
      return watch(() => cb(Object.values(db.clubs).filter((c) => c.memberUids.includes(uid)).sort((a, b) => a.name.localeCompare(b.name))));
    },
    watchClub(id, cb) {
      return watch(() => cb(db.clubs[id] ?? null));
    },
    watchClubTours(clubId, cb) {
      return watch(() => cb(Object.values(db.tours).filter((t) => t.clubId === clubId).sort((a, b) => b.startDate.localeCompare(a.startDate))));
    },
    async createClub(c) {
      await ready;
      const id = newId('club');
      db.clubs[id] = { ...c, id, joinCode: newJoinCode(), createdAt: Date.now() };
      await save();
      return id;
    },
    async updateClub(id, patch) {
      db.clubs[id] = { ...db.clubs[id], ...patch, id };
      await save();
    },
    async joinClub(code, uid) {
      await ready;
      const c = Object.values(db.clubs).find((x) => x.joinCode === code.trim().toUpperCase());
      if (!c) throw new BackendError('No club has that code.');
      if (!c.memberUids.includes(uid)) c.memberUids = [...c.memberUids, uid];
      await save();
      return c.id;
    },
    async searchClubs(q) {
      await ready;
      return Object.values(db.clubs).filter((c) => matches(q, c.name, c.location));
    },

    async searchCourses(q) {
      await ready;
      return Object.values(db.courses)
        .filter((c) => matches(q, c.name, c.club, c.city, c.country))
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

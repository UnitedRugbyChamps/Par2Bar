import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, type FirebaseOptions } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Query,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref as storageRef, uploadString } from 'firebase/storage';
import { Platform } from 'react-native';

import { defaultPrefs, type Club, type Course, type Post, type RoundRecord, type Score, type ScoreMap, type Story, type Tour, type TourEvent, type UserProfile } from '@/core/types';
import { BackendError, newId, newJoinCode, type Backend, type Unsub } from './types';

/* Firestore layout (rules in firestore.rules):
 *   users/{uid}                     profile, handicap index, notification settings
 *   pushTokens/{uid}                {tokens: string[]}, read only by Cloud Functions
 *   tours/{tourId}                  the tour, its players, rounds, games and cup
 *   tours/{tourId}/scores/{rid~unit} one card
 *   tours/{tourId}/events/{id}      feed items, written by Cloud Functions
 *   joinCodes/{code}                {tourId}
 *   courses/{id}                    courses and their tees
 *   follows/{from_to}               {from, to, at}
 *   posts/{id}, stories/{id}        profile posts and 24-hour stories
 *   rounds/{tourId~rid~playerId}    finished rounds, written by Cloud Functions
 *   clubs/{id}, clubCodes/{code}    clubs and their join codes
 * Images go to Cloud Storage under users/{uid}/.
 */
export function firebaseConfigFromEnv(): FirebaseOptions | null {
  const e = process.env;
  if (!e.EXPO_PUBLIC_FIREBASE_API_KEY) return null;
  return {
    apiKey: e.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: e.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: e.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: e.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: e.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: e.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
}

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'Wrong email or password.',
  'auth/email-already-in-use': 'An account with that email already exists.',
  'auth/weak-password': 'Use at least 6 characters for the password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
};
async function friendly<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e: any) {
    throw new BackendError(AUTH_ERRORS[e?.code] ?? e?.message ?? 'Something went wrong.');
  }
}

export function createFirebaseBackend(config: FirebaseOptions): Backend {
  const app = initializeApp(config);
  // React Native needs AsyncStorage persistence so people stay signed in.
  const getRNPersistence = (FirebaseAuth as any).getReactNativePersistence;
  const auth =
    Platform.OS === 'web' || !getRNPersistence
      ? FirebaseAuth.getAuth(app)
      : FirebaseAuth.initializeAuth(app, { persistence: getRNPersistence(AsyncStorage) });
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  const storage = getStorage(app);

  /** Firestore 'in' queries take 30 values: run one listener per chunk and merge. */
  function watchIn<T extends { id: string }>(make: (ids: string[]) => Query, ids: string[], sort: (a: T, b: T) => number, cb: (rows: T[]) => void): Unsub {
    if (!ids.length) {
      cb([]);
      return () => {};
    }
    const parts: T[][] = [];
    const unsubs: Unsub[] = [];
    for (let i = 0; i < ids.length; i += 30) {
      const n = i / 30;
      unsubs.push(
        onSnapshot(make(ids.slice(i, i + 30)), (s) => {
          parts[n] = s.docs.map((d) => ({ ...(d.data() as T), id: d.id }));
          cb(parts.flat().sort(sort));
        }),
      );
    }
    return () => unsubs.forEach((u) => u());
  }

  const userDoc = (uid: string) => doc(db, 'users', uid);
  const tourDoc = (id: string) => doc(db, 'tours', id);

  return {
    kind: 'firebase',

    onAuth(cb) {
      let unsubProfile: (() => void) | null = null;
      const unsub = FirebaseAuth.onAuthStateChanged(auth, (u) => {
        unsubProfile?.();
        unsubProfile = null;
        if (!u) return cb(null);
        unsubProfile = onSnapshot(userDoc(u.uid), (s) => {
          const data = s.data() as Partial<UserProfile> | undefined;
          cb({ ...data, uid: u.uid, email: u.email ?? '', name: data?.name ?? u.displayName ?? '', hi: data?.hi ?? null, notify: { ...defaultPrefs, ...data?.notify } });
        });
      });
      return () => {
        unsub();
        unsubProfile?.();
      };
    },
    async signUp(name, email, password) {
      const cred = await friendly(FirebaseAuth.createUserWithEmailAndPassword(auth, email.trim(), password));
      await FirebaseAuth.updateProfile(cred.user, { displayName: name.trim() });
      await setDoc(userDoc(cred.user.uid), { name: name.trim(), nameLower: name.trim().toLowerCase(), email: email.trim().toLowerCase(), hi: null, hiAuto: true, notify: defaultPrefs, createdAt: Date.now() });
    },
    async signIn(email, password) {
      await friendly(FirebaseAuth.signInWithEmailAndPassword(auth, email.trim(), password));
    },
    async signOut() {
      await FirebaseAuth.signOut(auth);
    },
    async resetPassword(email) {
      await friendly(FirebaseAuth.sendPasswordResetEmail(auth, email.trim()));
    },
    async updateProfile(uid, patch) {
      await setDoc(userDoc(uid), JSON.parse(JSON.stringify(patch.name ? { ...patch, nameLower: patch.name.toLowerCase() } : patch)), { merge: true });
    },
    async getUsers(uids) {
      const snaps = await Promise.all(uids.map((u) => getDoc(userDoc(u))));
      return snaps.filter((s) => s.exists()).map((s) => ({ uid: s.id, ...(s.data() as Omit<UserProfile, 'uid'>) }));
    },
    async registerPushToken(uid, token) {
      await setDoc(doc(db, 'pushTokens', uid), { tokens: arrayUnion(token) }, { merge: true });
    },

    watchMyTours(uid, cb) {
      return onSnapshot(query(collection(db, 'tours'), where('memberUids', 'array-contains', uid)), (s) =>
        cb(s.docs.map((d) => ({ ...(d.data() as Tour), id: d.id })).sort((a, b) => b.startDate.localeCompare(a.startDate))),
      );
    },
    watchTour(id, cb) {
      return onSnapshot(tourDoc(id), (s) => cb(s.exists() ? { ...(s.data() as Tour), id: s.id } : null));
    },
    async createTour(t) {
      const joinCode = newJoinCode();
      const ref = await addDoc(collection(db, 'tours'), { ...t, joinCode, createdAt: Date.now() });
      await setDoc(doc(db, 'joinCodes', joinCode), { tourId: ref.id });
      return ref.id;
    },
    async updateTour(id, patch) {
      const { id: _id, ...rest } = patch;
      await updateDoc(tourDoc(id), JSON.parse(JSON.stringify(rest)));
    },
    async deleteTour(id) {
      const t = await getDoc(tourDoc(id));
      const b = writeBatch(db);
      b.delete(tourDoc(id));
      if (t.exists()) b.delete(doc(db, 'joinCodes', (t.data() as Tour).joinCode));
      await b.commit();
    },
    async joinTour(code, uid) {
      const c = await getDoc(doc(db, 'joinCodes', code.trim().toUpperCase()));
      if (!c.exists()) throw new BackendError('No tour has that code.');
      const tourId = (c.data() as { tourId: string }).tourId;
      await updateDoc(tourDoc(tourId), { memberUids: arrayUnion(uid) });
      return tourId;
    },

    watchScores(tourId, cb) {
      return onSnapshot(collection(db, 'tours', tourId, 'scores'), (s) => {
        const map: ScoreMap = {};
        s.docs.forEach((d) => {
          const v = d.data() as Score;
          map[`${tourId}~${v.rid}~${v.unitId}`] = v;
        });
        cb(map);
      });
    },
    async saveScore(s) {
      await setDoc(doc(db, 'tours', s.tourId, 'scores', `${s.rid}~${s.unitId}`), { ...s, updatedAt: Date.now() });
    },
    watchEvents(tourId, cb) {
      return onSnapshot(query(collection(db, 'tours', tourId, 'events'), orderBy('at', 'desc'), limit(200)), (s) =>
        cb(s.docs.map((d) => ({ ...(d.data() as TourEvent), id: d.id }))),
      );
    },

    watchUser(uid, cb) {
      return onSnapshot(userDoc(uid), (s) => {
        const d = s.data() as Omit<UserProfile, 'uid'> | undefined;
        cb(d ? { ...d, uid: s.id, notify: { ...defaultPrefs, ...d.notify } } : null);
      });
    },
    async searchUsers(q) {
      const s = q.trim().toLowerCase();
      const base = collection(db, 'users');
      const snap = await getDocs(s ? query(base, where('nameLower', '>=', s), where('nameLower', '<=', s + '\uf8ff'), limit(30)) : query(base, orderBy('createdAt', 'desc'), limit(30)));
      return snap.docs.map((d) => ({ ...(d.data() as UserProfile), uid: d.id }));
    },
    watchFollows(uid, cb) {
      let followers: string[] = [],
        following: string[] = [];
      const a = onSnapshot(query(collection(db, 'follows'), where('to', '==', uid)), (s) => {
        followers = s.docs.map((d) => d.data().from as string);
        cb({ followers, following });
      });
      const b = onSnapshot(query(collection(db, 'follows'), where('from', '==', uid)), (s) => {
        following = s.docs.map((d) => d.data().to as string);
        cb({ followers, following });
      });
      return () => {
        a();
        b();
      };
    },
    async follow(me, uid) {
      if (me !== uid) await setDoc(doc(db, 'follows', `${me}_${uid}`), { from: me, to: uid, at: Date.now() });
    },
    async unfollow(me, uid) {
      await deleteDoc(doc(db, 'follows', `${me}_${uid}`));
    },
    watchPosts(uids, cb) {
      return watchIn<Post>((ids) => query(collection(db, 'posts'), where('uid', 'in', ids), orderBy('at', 'desc'), limit(60)), uids, (a, b) => b.at - a.at, cb);
    },
    async createPost(p) {
      return (await addDoc(collection(db, 'posts'), JSON.parse(JSON.stringify(p)))).id;
    },
    async deletePost(id) {
      await deleteDoc(doc(db, 'posts', id));
    },
    async toggleLike(postId, uid) {
      const ref = doc(db, 'posts', postId);
      const s = await getDoc(ref);
      const likes = ((s.data()?.likes as string[]) ?? []);
      await updateDoc(ref, { likes: likes.includes(uid) ? arrayRemove(uid) : arrayUnion(uid) });
    },
    watchStories(uids, cb) {
      const since = Date.now() - 86400000;
      return watchIn<Story>((ids) => query(collection(db, 'stories'), where('uid', 'in', ids), where('at', '>', since)), uids, (a, b) => a.at - b.at, cb);
    },
    async addStory(s) {
      await addDoc(collection(db, 'stories'), JSON.parse(JSON.stringify(s)));
    },
    watchRound(id, cb) {
      return onSnapshot(doc(db, 'rounds', id), (s) => cb(s.exists() ? ({ ...s.data(), id: s.id } as RoundRecord) : null));
    },
    watchRounds(uid, cb) {
      return onSnapshot(query(collection(db, 'rounds'), where('uid', '==', uid)), (s) =>
        cb(s.docs.map((d) => ({ ...(d.data() as RoundRecord), id: d.id })).sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at)),
      );
    },
    async uploadImage(uid, dataUri) {
      const r = storageRef(storage, `users/${uid}/${newId('img')}.jpg`);
      await uploadString(r, dataUri, 'data_url');
      return getDownloadURL(r);
    },

    watchMyClubs(uid, cb) {
      return onSnapshot(query(collection(db, 'clubs'), where('memberUids', 'array-contains', uid)), (s) =>
        cb(s.docs.map((d) => ({ ...(d.data() as Club), id: d.id })).sort((a, b) => a.name.localeCompare(b.name))),
      );
    },
    watchClub(id, cb) {
      return onSnapshot(doc(db, 'clubs', id), (s) => cb(s.exists() ? { ...(s.data() as Club), id: s.id } : null));
    },
    watchClubTours(clubId, cb) {
      return onSnapshot(query(collection(db, 'tours'), where('clubId', '==', clubId)), (s) =>
        cb(s.docs.map((d) => ({ ...(d.data() as Tour), id: d.id })).sort((a, b) => b.startDate.localeCompare(a.startDate))),
      );
    },
    async createClub(c) {
      const joinCode = newJoinCode();
      const ref = await addDoc(collection(db, 'clubs'), { ...JSON.parse(JSON.stringify(c)), nameLower: c.name.toLowerCase(), joinCode, createdAt: Date.now() });
      await setDoc(doc(db, 'clubCodes', joinCode), { clubId: ref.id });
      return ref.id;
    },
    async updateClub(id, patch) {
      const { id: _id, ...rest } = patch;
      await updateDoc(doc(db, 'clubs', id), JSON.parse(JSON.stringify(rest.name ? { ...rest, nameLower: rest.name.toLowerCase() } : rest)));
    },
    async joinClub(code, uid) {
      const c = await getDoc(doc(db, 'clubCodes', code.trim().toUpperCase()));
      if (!c.exists()) throw new BackendError('No club has that code.');
      const clubId = (c.data() as { clubId: string }).clubId;
      await updateDoc(doc(db, 'clubs', clubId), { memberUids: arrayUnion(uid) });
      return clubId;
    },
    async searchClubs(q) {
      const s = q.trim().toLowerCase();
      const snap = await getDocs(query(collection(db, 'clubs'), where('nameLower', '>=', s), where('nameLower', '<=', s + '\uf8ff'), limit(30)));
      return snap.docs.map((d) => ({ ...(d.data() as Club), id: d.id }));
    },

    async searchCourses(q) {
      // Firestore has no text search: match on a lower-case name prefix.
      const s = q.trim().toLowerCase();
      const base = collection(db, 'courses');
      const snap = await getDocs(s ? query(base, where('nameLower', '>=', s), where('nameLower', '<=', s + ''), limit(30)) : query(base, orderBy('nameLower'), limit(30)));
      return snap.docs.map((d) => ({ ...(d.data() as Course), id: d.id }));
    },
    async getCourse(id) {
      const s = await getDoc(doc(db, 'courses', id));
      return s.exists() ? { ...(s.data() as Course), id: s.id } : null;
    },
    async saveCourse(c) {
      const data = JSON.parse(JSON.stringify({ ...c, nameLower: c.name.toLowerCase() }));
      delete data.id;
      if (c.id) {
        await setDoc(doc(db, 'courses', c.id), data, { merge: true });
        return c.id;
      }
      return (await addDoc(collection(db, 'courses'), data)).id;
    },
  };
}


import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, type FirebaseOptions } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Platform } from 'react-native';

import { defaultPrefs, type Course, type Score, type ScoreMap, type Tour, type TourEvent, type UserProfile } from '@/core/types';
import { BackendError, newJoinCode, type Backend } from './types';

/* Firestore layout (rules in firestore.rules):
 *   users/{uid}                     profile, handicap index, notification settings
 *   pushTokens/{uid}                {tokens: string[]}, read only by Cloud Functions
 *   tours/{tourId}                  the tour, its players, rounds, games and cup
 *   tours/{tourId}/scores/{rid~unit} one card
 *   tours/{tourId}/events/{id}      feed items, written by Cloud Functions
 *   joinCodes/{code}                {tourId}
 *   courses/{id}                    courses and their tees
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
  const db = getFirestore(app);

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
          cb({ uid: u.uid, email: u.email ?? '', name: data?.name ?? u.displayName ?? '', hi: data?.hi ?? null, homeClub: data?.homeClub, notify: { ...defaultPrefs, ...data?.notify } });
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
      await setDoc(userDoc(cred.user.uid), { name: name.trim(), email: email.trim().toLowerCase(), hi: null, notify: defaultPrefs });
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
      await setDoc(userDoc(uid), patch, { merge: true });
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


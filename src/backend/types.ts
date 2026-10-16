import type { Course, Score, ScoreMap, Tour, TourEvent, UserProfile } from '@/core/types';

export type Unsub = () => void;
export type NewTour = Omit<Tour, 'id' | 'joinCode'>;

/** Everything the app needs from a server. Two implementations: an offline
 *  one that keeps data on the phone (works today, no accounts needed), and
 *  Firebase, switched on by adding the Firebase keys to the environment. */
export interface Backend {
  kind: 'offline' | 'firebase';

  onAuth(cb: (u: UserProfile | null) => void): Unsub;
  signUp(name: string, email: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  updateProfile(uid: string, patch: Partial<Omit<UserProfile, 'uid' | 'email'>>): Promise<void>;
  getUsers(uids: string[]): Promise<UserProfile[]>;
  registerPushToken(uid: string, token: string): Promise<void>;

  watchMyTours(uid: string, cb: (t: Tour[]) => void): Unsub;
  watchTour(id: string, cb: (t: Tour | null) => void): Unsub;
  createTour(t: NewTour): Promise<string>;
  updateTour(id: string, patch: Partial<Tour>): Promise<void>;
  deleteTour(id: string): Promise<void>;
  /** Adds the user to the tour with this join code and returns its id. */
  joinTour(code: string, uid: string): Promise<string>;

  watchScores(tourId: string, cb: (s: ScoreMap) => void): Unsub;
  /** `silent` skips the feed and notifications (used when importing cards). */
  saveScore(s: Score, opts?: { silent?: boolean }): Promise<void>;
  watchEvents(tourId: string, cb: (e: TourEvent[]) => void): Unsub;

  searchCourses(q: string): Promise<Course[]>;
  getCourse(id: string): Promise<Course | null>;
  saveCourse(c: Omit<Course, 'id'> & { id?: string }): Promise<string>;
}

export class BackendError extends Error {}

export const newJoinCode = () => {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => a[Math.floor(Math.random() * a.length)]).join('');
};

export const newId = (prefix = '') => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

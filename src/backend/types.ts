import type { Club, Course, Follows, Post, RoundRecord, Score, ScoreMap, Story, Tour, TourEvent, UserProfile } from '@/core/types';

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

  /* social */
  watchUser(uid: string, cb: (u: UserProfile | null) => void): Unsub;
  searchUsers(q: string): Promise<UserProfile[]>;
  watchFollows(uid: string, cb: (f: Follows) => void): Unsub;
  follow(me: string, uid: string): Promise<void>;
  unfollow(me: string, uid: string): Promise<void>;
  /** Posts by these users, newest first */
  watchPosts(uids: string[], cb: (p: Post[]) => void): Unsub;
  createPost(p: Omit<Post, 'id'>): Promise<string>;
  deletePost(id: string): Promise<void>;
  toggleLike(postId: string, uid: string): Promise<void>;
  /** Stories from the last 24 hours by these users */
  watchStories(uids: string[], cb: (s: Story[]) => void): Unsub;
  addStory(s: Omit<Story, 'id'>): Promise<void>;
  watchRounds(uid: string, cb: (r: RoundRecord[]) => void): Unsub;
  watchRound(id: string, cb: (r: RoundRecord | null) => void): Unsub;
  /** Stores an image (a data: URI from the picker) and returns a URL to show it. */
  uploadImage(uid: string, dataUri: string): Promise<string>;

  /* clubs */
  watchMyClubs(uid: string, cb: (c: Club[]) => void): Unsub;
  watchClub(id: string, cb: (c: Club | null) => void): Unsub;
  watchClubTours(clubId: string, cb: (t: Tour[]) => void): Unsub;
  createClub(c: Omit<Club, 'id' | 'joinCode'>): Promise<string>;
  updateClub(id: string, patch: Partial<Club>): Promise<void>;
  joinClub(code: string, uid: string): Promise<string>;
  searchClubs(q: string): Promise<Club[]>;

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

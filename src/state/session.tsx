import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { backend } from '@/backend';
import type { Club, Course, Follows, Post, RoundRecord, ScoreMap, Story, Tour, TourEvent, UserProfile } from '@/core/types';
import { registerForPush, scheduleTeeTimes, setNotifyUser } from '@/notify/push';

interface Session {
  user: UserProfile | null;
  loading: boolean;
}
const Ctx = createContext<Session>({ user: null, loading: true });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Session>({ user: null, loading: true });
  useEffect(
    () =>
      backend.onAuth((user) => {
        setNotifyUser(user);
        setS({ user, loading: false });
      }),
    [],
  );
  const uid = s.user?.uid;
  useEffect(() => {
    if (!uid) return;
    registerForPush().then((t) => {
      if (t) backend.registerPushToken(uid, t);
    });
  }, [uid]);
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}

export const useSession = () => useContext(Ctx);

/** The signed-in user. Only use under the signed-in layout. */
export function useMe(): UserProfile {
  const { user } = useSession();
  if (!user) throw new Error('Not signed in');
  return user;
}

export function useMyTours() {
  const me = useMe();
  const [tours, setTours] = useState<Tour[] | null>(null);
  useEffect(() => backend.watchMyTours(me.uid, setTours), [me.uid]);
  useEffect(() => {
    if (tours && backend.kind === 'offline') scheduleTeeTimes(tours, me).catch(() => {});
  }, [tours, me]);
  return tours;
}

const EMPTY: ScoreMap = {};

export function useTour(id: string | undefined) {
  const [tour, setTour] = useState<Tour | null | undefined>(undefined);
  const [scores, setScores] = useState<ScoreMap | null>(null);
  useEffect(() => {
    if (!id) return;
    const a = backend.watchTour(id, setTour);
    const b = backend.watchScores(id, setScores);
    return () => {
      a();
      b();
    };
  }, [id]);
  return { tour, scores: scores ?? EMPTY, scoresReady: scores != null };
}

export function useEvents(id: string | undefined) {
  const [events, setEvents] = useState<TourEvent[]>([]);
  useEffect(() => (id ? backend.watchEvents(id, setEvents) : undefined), [id]);
  return events;
}

export function useCourse(id: string | undefined) {
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  useEffect(() => {
    if (id) backend.getCourse(id).then(setCourse);
  }, [id]);
  return course;
}

/** Whether the user can change the tour's setup. */
export const isAdmin = (t: Tour, uid: string) => t.ownerUid === uid || t.adminUids.includes(uid);

export function useUser(uid: string | undefined) {
  const [u, setU] = useState<UserProfile | null | undefined>(undefined);
  useEffect(() => (uid ? backend.watchUser(uid, setU) : undefined), [uid]);
  return u;
}

export function useFollows(uid: string | undefined) {
  const [f, setF] = useState<Follows>({ followers: [], following: [] });
  useEffect(() => (uid ? backend.watchFollows(uid, setF) : undefined), [uid]);
  return f;
}

/** Posts by these users. Pass a stable, sorted list. */
export function usePosts(uids: string[]) {
  const key = uids.join(',');
  const [posts, setPosts] = useState<Post[] | null>(null);
  useEffect(() => backend.watchPosts(key ? key.split(',') : [], setPosts), [key]);
  return posts;
}

export function usePost(id: string | undefined) {
  const [p, setP] = useState<Post | null | undefined>(undefined);
  useEffect(() => (id ? backend.watchPost(id, setP) : undefined), [id]);
  return p;
}

export function useStories(uids: string[]) {
  const key = uids.join(',');
  const [stories, setStories] = useState<Story[]>([]);
  useEffect(() => backend.watchStories(key ? key.split(',') : [], setStories), [key]);
  return stories;
}

export function useRounds(uid: string | undefined) {
  const [r, setR] = useState<RoundRecord[] | null>(null);
  useEffect(() => (uid ? backend.watchRounds(uid, setR) : undefined), [uid]);
  return r;
}

export function useRound(id: string | undefined) {
  const [r, setR] = useState<RoundRecord | null | undefined>(undefined);
  useEffect(() => (id ? backend.watchRound(id, setR) : undefined), [id]);
  return r;
}

export function useMyClubs() {
  const me = useMe();
  const [c, setC] = useState<Club[] | null>(null);
  useEffect(() => backend.watchMyClubs(me.uid, setC), [me.uid]);
  return c;
}

export function useClub(id: string | undefined) {
  const [c, setC] = useState<Club | null | undefined>(undefined);
  useEffect(() => (id ? backend.watchClub(id, setC) : undefined), [id]);
  return c;
}

export function useClubTours(id: string | undefined) {
  const [t, setT] = useState<Tour[] | null>(null);
  useEffect(() => (id ? backend.watchClubTours(id, setT) : undefined), [id]);
  return t;
}

/** Scores for several tours at once, keyed by tour id. */
export function useManyScores(tourIds: string[]) {
  const key = tourIds.join(',');
  const [map, setMap] = useState<Record<string, ScoreMap>>({});
  useEffect(() => {
    if (!key) return;
    const uns = key.split(',').map((id) => backend.watchScores(id, (s) => setMap((m) => ({ ...m, [id]: s }))));
    return () => uns.forEach((u) => u());
  }, [key]);
  return map;
}

export const isClubAdmin = (c: Club, uid: string) => c.ownerUid === uid || c.adminUids.includes(uid);

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { backend } from '@/backend';
import type { Course, ScoreMap, Tour, TourEvent, UserProfile } from '@/core/types';
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

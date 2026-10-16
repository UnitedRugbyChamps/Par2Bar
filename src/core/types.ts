/** Shared domain types. Nothing in src/core imports React Native, so the
 *  Cloud Functions and the node tests can use the same code. */

export type Basis = 'net' | 'gross';

export interface Tee {
  name: string;
  rating: number | null; // course rating, e.g. 71.4
  slope: number | null; // slope rating, 55–155, 113 is neutral
  par: number[]; // 18 values
  si: number[]; // stroke index per hole, 1–18
  yards?: (number | null)[];
}

export interface Course {
  id: string;
  name: string;
  club?: string;
  city?: string;
  country?: string;
  tees: Tee[];
  source?: 'user' | 'golfcourseapi';
  externalId?: string;
  createdBy?: string;
}

/** The course and tee a round is played off, copied into the round so
 *  later edits to the course never change a finished round. */
export interface RoundCourse {
  courseId?: string;
  name: string;
  tee: string;
  rating: number | null;
  slope: number | null;
  par: number[];
  si: number[];
}

export interface Player {
  id: string;
  name: string;
  uid?: string; // linked account, if the player has one
  hi: number | null; // WHS handicap index
  team?: string; // team id
}

export interface Team {
  id: string;
  name: string;
  color: string;
}

export interface Group {
  id: string;
  teeTime: string; // "08:10"
  startHole: number; // 1 or 10 (shotgun starts use any)
  ids: string[];
}

export interface Round {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  course: RoundCourse;
  /** Playing-handicap overrides per player or team unit id. */
  hcp?: Record<string, number>;
  groups: Group[];
  /** Scramble / ambrose teams for this round: each is a list of player ids. */
  scramble?: string[][];
}

export type CompType =
  | 'stableford'
  | 'stroke'
  | 'skins'
  | 'scramble'
  | 'match'
  | 'nassau'
  | 'lowhigh';

export interface Pairing {
  rid: string;
  a: string[];
  b: string[];
}

export interface Comp {
  id: string;
  name: string;
  type: CompType;
  basis: Basis;
  allowance: number; // percent of playing handicap
  /** stableford only: 'points' (most wins) or 'vs36' (36 a round minus points, lowest wins). */
  display?: 'points' | 'vs36';
  carry?: boolean; // skins carry over on ties
  rounds: string[]; // empty = every round
  main?: boolean; // the headline competition on the tour page
  /** head-to-head games (match, nassau, low/high ball) */
  pairings?: Pairing[];
}

export type CupFormat = 'fourball' | 'foursomes' | 'singles';

export interface CupSession {
  id: string;
  rid: string;
  format: CupFormat;
  matches: { a: string[]; b: string[] }[];
}

export interface Cup {
  name: string;
  teamA: string; // team id
  teamB: string;
  /** 'full' = every player gets full playing handicap; 'diff' = off the lowest. */
  hcpMode: 'full' | 'diff';
  sessions: CupSession[];
}

export interface Tour {
  id: string;
  name: string;
  location?: string;
  /** IANA zone the tee times are in, e.g. Africa/Johannesburg */
  timezone?: string;
  startDate: string;
  endDate: string;
  ownerUid: string;
  adminUids: string[];
  memberUids: string[];
  joinCode: string;
  players: Player[];
  teams: Team[];
  rounds: Round[];
  comps: Comp[];
  cup?: Cup | null;
  createdAt?: number;
}

export interface Score {
  tourId: string;
  rid: string;
  unitId: string; // player id, or a team unit id for foursomes/scramble
  strokes: (number | null)[];
  putts: (number | null)[];
  updatedBy?: string;
  updatedAt?: number;
}

export type ScoreMap = Record<string, Score>;
export const scoreKey = (tourId: string, rid: string, unitId: string) => `${tourId}~${rid}~${unitId}`;

export interface NotifyPrefs {
  /** someone in a group I'm playing in posts a score */
  myGroup: boolean;
  /** a new leader in the tour's headline competition */
  leader: boolean;
  /** cup and head-to-head matches change hands or finish */
  matches: boolean;
  /** birdies, eagles and holes in one from anyone */
  highlights: boolean;
  /** reminders before my tee time, and tee time changes */
  teeTimes: boolean;
  /** every score from these players, by player id */
  follow: string[];
}

export const defaultPrefs: NotifyPrefs = {
  myGroup: false,
  leader: true,
  matches: true,
  highlights: true,
  teeTimes: true,
  follow: [],
};

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  hi: number | null;
  homeClub?: string;
  notify: NotifyPrefs;
  pushTokens?: string[];
}

export type EventKind = 'leader' | 'match' | 'highlight' | 'score' | 'teetime' | 'roundDone';

/** A tour feed item. The same items drive the push notifications. */
export interface TourEvent {
  id: string;
  tourId: string;
  kind: EventKind;
  title: string;
  body: string;
  at: number;
  /** player ids the event is about (for follow / my-group matching) */
  about: string[];
  rid?: string;
  by?: string; // uid that caused it
}

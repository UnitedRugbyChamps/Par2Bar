import type { Course, Tee } from '@/core/types';

/** Worldwide course search through GolfCourseAPI (golfcourseapi.com, ~30,000
 *  courses with tee ratings, slopes, pars and stroke indexes). Switched on by
 *  setting EXPO_PUBLIC_GOLFCOURSE_API_KEY. Any other provider can replace this
 *  file as long as it returns `Course` objects. */
const KEY = process.env.EXPO_PUBLIC_GOLFCOURSE_API_KEY;
export const worldwideSearchEnabled = !!KEY;

interface ApiHole {
  par?: number;
  yardage?: number;
  handicap?: number;
}
interface ApiTee {
  tee_name?: string;
  course_rating?: number;
  slope_rating?: number;
  holes?: ApiHole[];
}
interface ApiCourse {
  id: number;
  club_name?: string;
  course_name?: string;
  location?: { city?: string; state?: string; country?: string };
  tees?: { male?: ApiTee[]; female?: ApiTee[] };
}

function toTee(t: ApiTee, label: string): Tee | null {
  const holes = t.holes || [];
  if (holes.length !== 18) return null; // 9-hole layouts are not supported yet
  const si = holes.map((h, i) => h.handicap ?? i + 1);
  return {
    name: `${t.tee_name ?? 'Tee'}${label}`,
    rating: t.course_rating ?? null,
    slope: t.slope_rating ?? null,
    par: holes.map((h) => h.par ?? 4),
    si: new Set(si).size === 18 ? si : holes.map((_, i) => i + 1),
    yards: holes.map((h) => h.yardage ?? null),
  };
}

export function fromApi(c: ApiCourse): Course {
  const tees = [
    ...(c.tees?.male || []).map((t) => toTee(t, '')),
    ...(c.tees?.female || []).map((t) => toTee(t, ' (women)')),
  ].filter((t): t is Tee => !!t);
  const name = c.course_name && c.club_name && c.course_name !== c.club_name ? `${c.club_name} – ${c.course_name}` : (c.club_name ?? c.course_name ?? 'Course');
  return {
    id: `gca-${c.id}`,
    name,
    club: c.club_name,
    city: [c.location?.city, c.location?.state].filter(Boolean).join(', '),
    country: c.location?.country,
    tees,
    source: 'golfcourseapi',
    externalId: String(c.id),
  };
}

export async function searchWorldwide(q: string): Promise<Course[]> {
  if (!KEY || q.trim().length < 3) return [];
  const res = await fetch(`https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(q.trim())}`, {
    headers: { Authorization: `Key ${KEY}` },
  });
  if (!res.ok) throw new Error(`Course search failed (${res.status})`);
  const body = (await res.json()) as { courses?: ApiCourse[] };
  return (body.courses || []).map(fromApi).filter((c) => c.tees.length);
}

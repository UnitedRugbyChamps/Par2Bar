import { useEffect, useState } from 'react';

import { backend } from '@/backend';
import type { UserProfile } from '@/core/types';

export function ago(at: number, now: number) {
  const m = Math.round((now - at) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.round(m / 60)}h`;
  if (m < 10080) return `${Math.round(m / 1440)}d`;
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: m > 525600 ? 'numeric' : undefined });
}

/** Profiles for a set of user ids, fetched once per set. */
export function useProfiles(uids: string[]) {
  const key = [...new Set(uids)].sort().join(',');
  const [map, setMap] = useState<Record<string, UserProfile>>({});
  useEffect(() => {
    if (!key) return;
    backend.getUsers(key.split(',')).then((us) => setMap(Object.fromEntries(us.map((u) => [u.uid, u]))));
  }, [key]);
  return map;
}

export const fmtHi = (hi: number | null | undefined) => (hi == null ? '–' : hi < 0 ? `+${(-hi).toFixed(1)}` : hi.toFixed(1));

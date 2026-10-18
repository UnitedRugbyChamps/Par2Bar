import { newId } from '@/backend';
import type { Comp, Cup, Tour } from '@/core/types';
import { newComp } from './helpers';

export type FormatGroup = 'Individual' | 'Pairs' | 'Teams';

export interface Format {
  id: string;
  label: string;
  group: FormatGroup;
  about: string;
  /** Changes to make to a tour to play this format; missing = not scored yet. */
  apply?: (t: Pick<Tour, 'comps' | 'cup' | 'teams' | 'rounds'>) => Partial<Tour>;
}

const addComp = (comp: Comp) => (t: Pick<Tour, 'comps'>) => ({ comps: [...t.comps, { ...comp, main: comp.main && !t.comps.some((c) => c.main) }] });
const comp = (type: Comp['type'], p: Partial<Comp> = {}) => ({ ...newComp(type), ...p });

function ryderCup(t: Pick<Tour, 'cup' | 'teams' | 'rounds'>): Partial<Tour> {
  const rs = t.rounds;
  const cup: Cup = {
    name: 'Ryder Cup',
    teamA: t.teams[0]?.id ?? 'ta',
    teamB: t.teams[1]?.id ?? 'tb',
    hcpMode: 'full',
    // fourballs and foursomes on the early rounds, singles on the last
    sessions: rs.map((r, i) => ({ id: newId('s'), rid: r.id, format: i === rs.length - 1 && rs.length > 1 ? 'singles' : i % 2 ? 'foursomes' : 'fourball', matches: [] })),
  };
  return { cup: t.cup ?? cup };
}

export const FORMATS: Format[] = [
  { id: 'stableford', label: 'Stableford', group: 'Individual', about: 'Points per hole against your handicap. Most points wins.', apply: addComp(comp('stableford', { main: true })) },
  { id: 'medal', label: 'Stroke play (net medal)', group: 'Individual', about: 'Every shot counts, less your handicap. Lowest wins.', apply: addComp(comp('stroke', { name: 'Net medal', main: true })) },
  { id: 'gross', label: 'Gross stroke play', group: 'Individual', about: 'Every shot counts, no handicaps.', apply: addComp(comp('stroke', { name: 'Gross', basis: 'gross' })) },
  { id: 'bogey', label: 'Par / bogey', group: 'Individual', about: 'Each hole against par with your shots: win, halve or lose.', apply: addComp(comp('bogey')) },
  { id: 'eclectic', label: 'Eclectic', group: 'Individual', about: 'Your best score on each hole across the rounds.', apply: addComp(comp('eclectic')) },
  { id: 'skins', label: 'Skins', group: 'Individual', about: 'Win a hole outright to take its skin; ties carry over.', apply: addComp(comp('skins')) },
  { id: 'match', label: 'Match play (singles)', group: 'Individual', about: 'Head to head, hole by hole.', apply: addComp(comp('match', { name: 'Singles match play' })) },
  { id: 'nassau', label: 'Nassau', group: 'Individual', about: 'Three matches in one: front nine, back nine and overall.', apply: addComp(comp('nassau')) },

  { id: 'betterball', label: 'Four-ball better ball', group: 'Pairs', about: 'Pairs, each playing their own ball; the better score on each hole counts in a match.', apply: addComp(comp('match', { name: 'Better ball', allowance: 90 })) },
  { id: 'lowhigh', label: 'Low ball / high ball', group: 'Pairs', about: 'Two points a hole for the best low ball and the best high ball.', apply: addComp(comp('lowhigh')) },
  { id: 'foursomes', label: 'Foursomes (alternate shot)', group: 'Pairs', about: 'Partners share one ball, taking turns. Played as cup sessions.', apply: ryderCup },
  { id: 'greensomes', label: 'Greensomes', group: 'Pairs', about: 'Both drive, pick the better, then alternate shots.' },
  { id: 'chapman', label: 'Chapman / Pinehurst', group: 'Pairs', about: 'Both drive, swap balls for the second, pick one, then alternate.' },
  { id: 'shamble', label: 'Shamble', group: 'Pairs', about: 'Pick the best drive, then everyone plays their own ball in.' },

  { id: 'ryder', label: 'Ryder Cup', group: 'Teams', about: 'Two teams: fourballs, foursomes and singles for points.', apply: ryderCup },
  { id: 'scramble', label: 'Texas scramble', group: 'Teams', about: 'Everyone plays from the best shot each time; one team score.', apply: addComp(comp('scramble', { name: 'Texas scramble' })) },
  { id: 'ambrose', label: 'Ambrose', group: 'Teams', about: 'A scramble with a team handicap taken off the end.', apply: addComp(comp('scramble', { name: 'Ambrose' })) },
  { id: 'wolf', label: 'Wolf', group: 'Teams', about: 'A rotating "wolf" picks a partner or goes alone on each hole.' },
  { id: 'bbb', label: 'Bingo Bango Bongo', group: 'Teams', about: 'Points for first on the green, closest to the pin and first in.' },
  { id: 'yellowball', label: 'Yellow ball', group: 'Teams', about: 'A team score plus one rotating player whose ball must survive.' },
];

export const formatById = (id: string) => FORMATS.find((f) => f.id === id);

/** Applies formats in order to a new or existing tour. */
export function applyFormats<T extends Pick<Tour, 'comps' | 'cup' | 'teams' | 'rounds'>>(t: T, ids: string[]): T {
  return ids.reduce((acc, id) => {
    const f = formatById(id);
    return f?.apply ? { ...acc, ...f.apply(acc) } : acc;
  }, t);
}

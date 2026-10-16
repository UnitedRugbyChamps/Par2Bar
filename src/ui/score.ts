import { C } from './theme';

/** Scorecard colours: eagle gold, birdie red, par plain, bogey light blue, double+ dark blue. */
export function scoreColor(g: number | null | undefined, par: number) {
  if (!g) return { bg: C.bg, fg: C.faint };
  const d = g - par;
  if (d <= -2) return { bg: C.eagle, fg: C.ink };
  if (d === -1) return { bg: C.birdie, fg: '#fff' };
  if (d === 0) return { bg: C.card, fg: C.ink };
  if (d === 1) return { bg: C.bogey, fg: '#fff' };
  return { bg: C.double, fg: '#fff' };
}

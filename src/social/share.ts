import { fmtRel } from '@/core/engine';
import type { Post, UserProfile } from '@/core/types';
import { shareText } from '@/ui/confirm';

const SHARE_URL = process.env.EXPO_PUBLIC_SHARE_URL?.replace(/\/$/, '');

/** Link to a post's web page, which carries the preview card for WhatsApp and the like. */
export const postLink = (id: string) => (SHARE_URL ? `${SHARE_URL}/p/${encodeURIComponent(id)}` : null);

export function sharePost(post: Post, author?: UserProfile) {
  const name = author?.name ?? 'A golfer';
  const r = post.round;
  const lines = r
    ? [`${name} shot ${r.gross} (${fmtRel(r.gross - r.par.reduce((a, b) => a + b, 0))}) at ${r.course}`, `${r.tourName} · ${r.roundName} · ${r.pts} points`]
    : [`${name} on Tour Card`];
  if (post.caption) lines.push(`"${post.caption}"`);
  const link = postLink(post.id);
  if (link) lines.push(link);
  return shareText(lines.join('\n'));
}

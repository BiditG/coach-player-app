'use server';

import { revalidatePath } from 'next/cache';
import { requireProfessional, requireUser } from '@/lib/auth';
import {
  awardPostMedal,
  createPostComment,
  insertPost,
  togglePostBookmark,
  togglePostReaction,
  type CreatePostInput,
  type FeedWriteResult,
} from '@/lib/feed-supabase';
import { isMedalKey, type PostKind } from '@/lib/feed';
import { toCount, type PlayerRole } from '@/lib/cricket-stats';

export type { FeedWriteResult };

function refreshFeed(): void {
  revalidatePath('/feed');
}

function sanitiseBattingStats(raw: Record<string, number | string>) {
  return {
    runs: toCount(raw.runs),
    balls: toCount(raw.balls),
    fours: toCount(raw.fours),
    sixes: toCount(raw.sixes),
    dotBalls: toCount(raw.dotBalls),
  };
}

function sanitiseBowlingStats(raw: Record<string, number | string>) {
  const overs = typeof raw.overs === 'string' ? raw.overs.trim() : raw.overs;
  return {
    runsConceded: toCount(raw.runsConceded),
    wickets: toCount(raw.wickets),
    overs: overs === undefined || overs === '' ? '0' : overs,
    maidenOvers: toCount(raw.maidenOvers),
    dotBalls: toCount(raw.dotBalls),
    wides: toCount(raw.wides),
    noBalls: toCount(raw.noBalls),
  };
}

/**
 * Publish a post.
 *
 * Only *raw* stat inputs cross this boundary. Strike rate and economy are
 * derived on read, so a card can never show a rate that disagrees with the
 * runs, balls and overs stored beside it.
 */
export async function createPost(input: CreatePostInput): Promise<FeedWriteResult> {
  // Publishing requires a session even when the write itself falls back to the
  // local cache.
  await requireUser();

  const kind: PostKind = input.kind;

  let stats: Record<string, number | string> | null = null;

  if (input.kind === 'STAT_CARD' && input.stats) {
    const role: PlayerRole = input.role ?? 'BATSMAN';
    stats = role === 'BOWLER' ? sanitiseBowlingStats(input.stats) : sanitiseBattingStats(input.stats);
  }

  if (kind === 'STAT_CARD' && !stats) {
    return { ok: false, source: 'local', error: 'Add the stat line before publishing.' };
  }

  const result = await insertPost({
    kind,
    role: kind === 'STAT_CARD' ? (input.role ?? 'BATSMAN') : null,
    caption: input.caption.trim().slice(0, 2200),
    imageUrl: input.imageUrl,
    stats,
    matchTitle: input.matchTitle.trim().slice(0, 120),
    matchResult: input.matchResult.trim().slice(0, 120),
  });

  if (result.ok && result.source === 'supabase') refreshFeed();
  return result;
}

export async function toggleFire(postId: string): Promise<FeedWriteResult> {
  await requireUser();
  if (!postId) return { ok: false, source: 'local', error: 'Missing post.' };

  const result = await togglePostReaction(postId);
  if (result.ok && result.source === 'supabase') refreshFeed();
  return result;
}

export async function toggleSave(postId: string): Promise<FeedWriteResult> {
  await requireUser();
  if (!postId) return { ok: false, source: 'local', error: 'Missing post.' };

  const result = await togglePostBookmark(postId);
  if (result.ok && result.source === 'supabase') refreshFeed();
  return result;
}

export async function addComment(
  postId: string,
  body: string,
): Promise<{ result: FeedWriteResult; authorName: string }> {
  const profile = await requireUser();
  const authorName = profile.full_name ?? 'You';

  if (!postId) {
    return { result: { ok: false, source: 'local', error: 'Missing post.' }, authorName };
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return { result: { ok: false, source: 'local', error: 'Comment cannot be empty.' }, authorName };
  }

  const result = await createPostComment(postId, trimmed);
  if (result.ok && result.source === 'supabase') refreshFeed();

  return { result, authorName };
}

export async function awardMedal(postId: string, medal: string): Promise<FeedWriteResult> {
  await requireProfessional();
  if (!postId) return { ok: false, source: 'local', error: 'Missing post.' };
  if (!isMedalKey(medal)) return { ok: false, source: 'local', error: 'Unknown medal.' };

  const result = await awardPostMedal(postId, medal);
  if (result.ok && result.source === 'supabase') refreshFeed();
  return result;
}

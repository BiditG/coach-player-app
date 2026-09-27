/**
 * Feed data model.
 *
 * Two rules hold everywhere in this file:
 *
 *  1. A stat card stores *raw player inputs* only. Every rate on the card is
 *     derived from those inputs at map time, so a stored rate can never drift
 *     out of sync with the numbers that produced it.
 *  2. Posts are read from Supabase. The localStorage cache below is a fallback
 *     for when the feed schema has not been migrated yet or the signed-in
 *     identity is a local demo account - it is never the primary source.
 */

import {
  deriveStats,
  formatRoleTag,
  formatStatHeadline,
  toStatTiles,
  type BattingInput,
  type BowlingInput,
  type DerivedStats,
  type PlayerRole,
} from '@/lib/cricket-stats';

export type PostKind = 'STAT_CARD' | 'IMAGE';

export interface FeedAuthor {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
}

export interface FeedComment {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  author: FeedAuthor;
  kind: PostKind;
  role: PlayerRole | null;
  caption: string;
  imageUrl: string | null;
  matchTitle: string;
  matchResult: string;
  /** Raw inputs. The single source of truth for every derived number. */
  inputs: BattingInput | BowlingInput | null;
  /** Computed from `inputs` on every read. */
  stats: DerivedStats | null;
  fireCount: number;
  hasFired: boolean;
  commentCount: number;
  bookmarked: boolean;
  comments: FeedComment[];
  medals: string[];
  createdAt: string;
}

export const MEDAL_KEYS = ['PRECISION', 'PROGRESS', 'CONSISTENCY', 'CRAFT'] as const;
export type MedalKey = (typeof MEDAL_KEYS)[number];

export const MEDAL_LABELS: Record<MedalKey, string> = {
  PRECISION: 'Precision',
  PROGRESS: 'Great Progress',
  CONSISTENCY: 'Consistency',
  CRAFT: 'Technical Craft',
};

export function isMedalKey(value: string): value is MedalKey {
  return (MEDAL_KEYS as readonly string[]).includes(value);
}

export function medalLabel(value: string): string {
  return isMedalKey(value) ? MEDAL_LABELS[value] : value;
}

/* -------------------------------------------------------------------------- */
/* Derived display helpers - the card component stays a dumb renderer.        */
/* -------------------------------------------------------------------------- */

export function statHeadline(post: FeedPost): string | null {
  return post.stats ? formatStatHeadline(post.stats) : null;
}

export function statTag(post: FeedPost): string | null {
  return post.stats ? formatRoleTag(post.stats) : null;
}

export function statTiles(post: FeedPost) {
  return post.stats ? toStatTiles(post.stats) : [];
}

export function relativeTime(isoDate: string, now = Date.now()): string {
  const then = new Date(isoDate).getTime();
  if (!Number.isFinite(then)) return '';

  const seconds = Math.max(0, Math.round((now - then) / 1000));
  if (seconds < 60) return 'Just now';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function handleFromName(name: string, email?: string | null): string {
  const base = (name || email?.split('@')[0] || 'player')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18);

  return `@${base || 'player'}`;
}

/* -------------------------------------------------------------------------- */
/* Supabase row -> FeedPost                                                    */
/* -------------------------------------------------------------------------- */

export interface PostRow {
  id: string;
  user_id: string;
  kind: PostKind;
  player_role: PlayerRole | null;
  caption: string | null;
  image_url: string | null;
  stats: BattingInput | BowlingInput | null;
  match_title: string | null;
  match_result: string | null;
  created_at: string;
  author?: { id: string; full_name: string | null; email: string | null; avatar_url: string | null } | null;
  fire_count?: number | null;
  comment_count?: number | null;
  has_fired?: boolean | null;
  bookmarked?: boolean | null;
  medal_keys?: string[] | null;
  comments?: FeedComment[] | null;
}

function isBattingInputs(value: unknown): value is BattingInput {
  return typeof value === 'object' && value !== null && 'runs' in value && 'balls' in value;
}

function isBowlingInputs(value: unknown): value is BowlingInput {
  return typeof value === 'object' && value !== null && 'wickets' in value && 'overs' in value;
}

/** Rebuild a post row into the shape the UI consumes, re-deriving its rates. */
export function mapPostRow(row: PostRow): FeedPost {
  const authorName = row.author?.full_name || row.author?.email?.split('@')[0] || 'Player';

  const inputs =
    row.stats && (isBattingInputs(row.stats) || isBowlingInputs(row.stats)) ? row.stats : null;

  // The role column is authoritative, but fall back to the shape of the stats
  // payload so a card is never rendered without derived numbers.
  let role: PlayerRole | null = row.player_role;
  if (!role && inputs) {
    role = isBowlingInputs(inputs) ? 'BOWLER' : 'BATSMAN';
  }

  return {
    id: row.id,
    author: {
      id: row.author?.id ?? row.user_id,
      name: authorName,
      handle: handleFromName(authorName, row.author?.email),
      avatarUrl: row.author?.avatar_url ?? null,
    },
    kind: row.kind,
    role,
    caption: row.caption ?? '',
    imageUrl: row.image_url ?? null,
    matchTitle: row.match_title ?? '',
    matchResult: row.match_result ?? '',
    inputs,
    stats: inputs && role ? deriveStats(role, inputs) : null,
    fireCount: row.fire_count ?? 0,
    hasFired: row.has_fired ?? false,
    commentCount: row.comment_count ?? 0,
    bookmarked: row.bookmarked ?? false,
    comments: row.comments ?? [],
    medals: (row.medal_keys ?? []).map(medalLabel),
    createdAt: row.created_at,
  };
}

/* -------------------------------------------------------------------------- */
/* Local cache - fallback only                                                  */
/* -------------------------------------------------------------------------- */

export const LOCAL_FEED_KEY = 'sprintnp_feed_v1';
export const LOCAL_FEED_CHANGED_EVENT = 'sprintnp:feed-changed';

export const EMPTY_LOCAL_POSTS: FeedPost[] = [];

function readLocalPosts(): FeedPost[] {
  if (typeof window === 'undefined') return EMPTY_LOCAL_POSTS;

  try {
    const raw = window.localStorage.getItem(LOCAL_FEED_KEY);
    if (!raw) return EMPTY_LOCAL_POSTS;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FeedPost[]) : EMPTY_LOCAL_POSTS;
  } catch {
    return EMPTY_LOCAL_POSTS;
  }
}

function writeLocalPosts(posts: FeedPost[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(LOCAL_FEED_KEY, JSON.stringify(posts));
    window.dispatchEvent(new Event(LOCAL_FEED_CHANGED_EVENT));
  } catch {
    // Quota or private-mode failures should never break the feed.
  }
}

export function getLocalPosts(): FeedPost[] {
  return readLocalPosts();
}

/** Optimistic local write. Only used when the Supabase write was unavailable. */
export function upsertLocalPost(post: FeedPost): FeedPost[] {
  const existing = readLocalPosts().filter((candidate) => candidate.id !== post.id);
  const next = [post, ...existing];
  writeLocalPosts(next);
  return next;
}

export function removeLocalPost(postId: string): FeedPost[] {
  const next = readLocalPosts().filter((candidate) => candidate.id !== postId);
  writeLocalPosts(next);
  return next;
}

/** Re-derive a locally cached post after a fire, comment or bookmark. */
export function mutateLocalPost(
  postId: string,
  mutate: (post: FeedPost) => FeedPost,
): FeedPost[] {
  const next = readLocalPosts().map((post) => (post.id === postId ? mutate(post) : post));
  writeLocalPosts(next);
  return next;
}

/**
 * Subscribe to local-cache changes. When `emitImmediately` is set the current
 * cache is delivered first, so a subscriber can seed itself without a separate
 * setState inside the effect body.
 */
export function subscribeToLocalFeed(
  onChange: () => void,
  emitImmediately = false,
): () => void {
  if (typeof window === 'undefined') return () => {};

  if (emitImmediately) onChange();

  window.addEventListener(LOCAL_FEED_CHANGED_EVENT, onChange);
  window.addEventListener('storage', onChange);

  return () => {
    window.removeEventListener(LOCAL_FEED_CHANGED_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

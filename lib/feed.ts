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

/** Raw player inputs for either role. */
export type StatInputs = BattingInput | BowlingInput;

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
  inputs: StatInputs | null;
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

/** The key the retired localStorage post store used. Read once, then migrated. */
const LEGACY_FEED_KEY = 'sprintnp_posts_v2';

export const EMPTY_LOCAL_POSTS: FeedPost[] = [];

/** Best-effort integer from an unknown form value. */
function legacyCount(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Parse the retired store's formatted `score` back into raw inputs.
 *
 * Batting was stored as "78 (52)" and bowling as "4/18 (4.0)".
 */
function legacyInputs(
  card: Record<string, unknown> | null,
  isBowling: boolean,
): { role: PlayerRole | null; inputs: StatInputs | null } {
  if (!card) return { role: null, inputs: null };

  const score = typeof card.score === 'string' ? card.score : '';
  const dotBalls = legacyCount(card.dotBalls);

  if (isBowling) {
    const bowling = score.match(/^(\d+)\/(\d+)\s*\((\d+(?:\.\d+)?)\)/);

    return {
      role: 'BOWLER',
      inputs: {
        wickets: bowling ? Number(bowling[1]) : 0,
        runsConceded: bowling ? Number(bowling[2]) : 0,
        overs: bowling ? bowling[3] : '0',
        maidenOvers: 0,
        dotBalls,
        wides: 0,
        noBalls: 0,
      },
    };
  }

  const batting = score.match(/^(\d+)\s*\((\d+)\)/);

  return {
    role: 'BATSMAN',
    inputs: {
      runs: batting ? Number(batting[1]) : 0,
      balls: batting ? Number(batting[2]) : 0,
      fours: legacyCount(card.fours),
      sixes: legacyCount(card.sixes),
      dotBalls,
    },
  };
}

function legacyComments(value: unknown, createdAt: string) {
  if (!Array.isArray(value)) return [];

  return (value as Record<string, unknown>[])
    .filter((comment) => comment && typeof comment.text === 'string')
    .map((comment) => ({
      id: String(comment.id ?? `legacy-${createdAt}`),
      authorName: typeof comment.author === 'string' ? comment.author : 'Player',
      body: String(comment.text),
      createdAt,
    }));
}

/**
 * Rebuild a post saved by the retired store into the current shape.
 *
 * The old store persisted *pre-computed* rates and a formatted `score` string.
 * The current model derives every rate from raw inputs, so the score is parsed
 * back into inputs here and the numbers are re-derived rather than trusted.
 */
function migrateLegacyPost(raw: unknown): FeedPost | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const old = raw as Record<string, unknown>;
  const id = typeof old.id === 'string' ? old.id : '';
  if (!id) return null;

  const card = (old.statCard ?? null) as Record<string, unknown> | null;
  const { role, inputs } = legacyInputs(card, card?.tag === 'Bowling');

  const name = typeof old.authorName === 'string' ? old.authorName : 'Player';
  const createdAt = typeof old.createdAt === 'string' ? old.createdAt : new Date().toISOString();
  const comments = legacyComments(old.comments, createdAt);

  return {
    id,
    author: {
      id: `legacy-${id}`,
      name,
      handle: typeof old.authorHandle === 'string' ? old.authorHandle : handleFromName(name),
      avatarUrl: typeof old.authorAvatar === 'string' ? old.authorAvatar : null,
    },
    kind: old.hasStatCard === false && old.imageUrl ? 'IMAGE' : 'STAT_CARD',
    role,
    caption: typeof old.caption === 'string' ? old.caption : '',
    imageUrl: typeof old.imageUrl === 'string' ? old.imageUrl : null,
    matchTitle: typeof card?.matchTitle === 'string' ? card.matchTitle : '',
    matchResult: typeof card?.matchResult === 'string' ? card.matchResult : '',
    inputs,
    stats: inputs && role ? deriveStats(role, inputs) : null,
    fireCount: typeof old.fireCount === 'number' ? old.fireCount : 0,
    hasFired: old.hasFired === true,
    commentCount: typeof old.commentsCount === 'number' ? old.commentsCount : comments.length,
    bookmarked: old.bookmarked === true,
    comments,
    medals: Array.isArray(old.medals) ? (old.medals as string[]).map(medalLabel) : [],
    createdAt,
  };
}

/**
 * One-time rescue of posts written by the retired store.
 *
 * The old and new stores used different localStorage keys, so without this
 * every post the player had already made would silently vanish the moment the
 * new feed shipped. Runs at most once; the legacy key is left in place rather
 * than deleted so nothing is destroyed if the mapping is ever wrong.
 */
function rescueLegacyPosts(current: FeedPost[]): FeedPost[] {
  if (current.length > 0 || typeof window === 'undefined') return current;

  try {
    const raw = window.localStorage.getItem(LEGACY_FEED_KEY);
    if (!raw) return current;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return current;

    const migrated = parsed
      .map(migrateLegacyPost)
      .filter((post): post is FeedPost => post !== null);

    if (migrated.length > 0) {
      writeLocalPosts(migrated);
    }

    return migrated;
  } catch {
    return current;
  }
}

function readLocalPosts(): FeedPost[] {
  if (typeof window === 'undefined') return EMPTY_LOCAL_POSTS;

  try {
    const raw = window.localStorage.getItem(LOCAL_FEED_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as FeedPost[];
    }
  } catch {
    // Fall through to the legacy rescue below.
  }

  return rescueLegacyPosts(EMPTY_LOCAL_POSTS);
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

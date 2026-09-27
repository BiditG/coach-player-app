import 'server-only';
import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { mapPostRow, type FeedPost, type PostRow } from '@/lib/feed';

const POST_SELECT = `
  id, user_id, kind, player_role, caption, image_url, stats, match_title, match_result, created_at,
  author:profiles!posts_user_id_fkey ( id, full_name, email, avatar_url ),
  post_reactions ( user_id ),
  post_bookmarks ( user_id ),
  post_medals ( medal ),
  post_comments ( id, body, created_at, author:profiles!post_comments_user_id_fkey ( full_name ) )
`;

interface PostJoinRow extends PostRow {
  post_reactions?: { user_id: string }[];
  post_bookmarks?: { user_id: string }[];
  post_medals?: { medal: string }[];
  post_comments?: { id: string; body: string; created_at: string; author?: { full_name: string | null } | null }[];
}

interface FeedQueryOptions {
  /** Only posts from profiles the viewer follows. */
  followingOnly?: boolean;
  /** Only stat-card posts. */
  statCardsOnly?: boolean;
  limit?: number;
}

/** Supabase surfaces missing relations as an error; treat that as "not migrated". */
function isMissingFeedSchema(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
  return (
    text.includes('does not exist') ||
    text.includes('pgrst') ||
    text.includes('42p01') ||
    text.includes('42703')
  );
}

async function viewerId(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function runFeedQuery(
  supabase: SupabaseClient,
  viewer: string | null,
  options: FeedQueryOptions,
): Promise<{ posts: FeedPost[]; available: boolean }> {
  let query = supabase
    .from('posts')
    .select(POST_SELECT)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 50);

  if (options.statCardsOnly) {
    query = query.eq('kind', 'STAT_CARD');
  }

  if (options.followingOnly && viewer) {
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', viewer);

    const ids = (following ?? []).map((row) => row.following_id as string);
    // An empty follow list must return an empty feed, not the whole network.
    if (ids.length === 0) return { posts: [], available: true };
    query = query.in('user_id', ids);
  }

  const { data, error } = await query;

  if (error) {
    return { posts: [], available: !isMissingFeedSchema(error) };
  }

  const rows = (data ?? []) as unknown as PostJoinRow[];

  const posts = rows.map((row) => {
    return mapPostRow({
      ...row,
      fire_count: row.post_reactions?.length ?? 0,
      has_fired: viewer ? (row.post_reactions ?? []).some((r) => r.user_id === viewer) : false,
      bookmarked: viewer ? (row.post_bookmarks ?? []).some((b) => b.user_id === viewer) : false,
      medal_keys: (row.post_medals ?? []).map((m) => m.medal),
      comments: (row.post_comments ?? []).map((comment) => ({
        id: comment.id,
        authorName: comment.author?.full_name ?? 'Player',
        body: comment.body,
        createdAt: comment.created_at,
      })),
    });
  });

  return { posts, available: true };
}

/**
 * Read the feed from Supabase.
 *
 * `available: false` means the feed tables are not deployed (migration 0009 has
 * not been run), so the caller should fall back to the local cache rather than
 * showing an empty screen.
 */
export const getFeedPosts = cache(async (options: FeedQueryOptions = {}): Promise<{
  posts: FeedPost[];
  available: boolean;
}> => {
  if (!hasSupabaseEnv()) return { posts: [], available: false };

  try {
    const supabase = await createClient();
    const viewer = await viewerId(supabase);
    return await runFeedQuery(supabase, viewer, options);
  } catch {
    return { posts: [], available: false };
  }
});

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

export type FeedWriteResult =
  | { ok: true; source: 'supabase'; id?: string }
  | { ok: true; source: 'local' }
  | { ok: false; source: 'supabase' | 'local'; error: string };

export interface CreatePostInput {
  kind: 'STAT_CARD' | 'IMAGE';
  role: 'BATSMAN' | 'BOWLER' | null;
  caption: string;
  imageUrl: string | null;
  /** Raw inputs only - rates are derived on read. */
  stats: Record<string, number | string> | null;
  matchTitle: string;
  matchResult: string;
}

export async function insertPost(input: CreatePostInput): Promise<FeedWriteResult> {
  if (!hasSupabaseEnv()) return { ok: true, source: 'local' };

  try {
    const supabase = await createClient();
    const viewer = await viewerId(supabase);

    // A preview identity has no `profiles` row, so the foreign key would reject
    // the write. Fall back rather than surfacing a database error.
    if (!viewer) return { ok: true, source: 'local' };

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: viewer,
        kind: input.kind,
        player_role: input.role,
        caption: input.caption,
        image_url: input.imageUrl,
        stats: input.stats,
        match_title: input.matchTitle,
        match_result: input.matchResult,
      })
      .select('id')
      .single();

    if (error) {
      if (isMissingFeedSchema(error)) return { ok: true, source: 'local' };
      return { ok: false, source: 'supabase', error: error.message };
    }

    return { ok: true, source: 'supabase', id: (data as { id: string }).id };
  } catch (error) {
    return { ok: false, source: 'supabase', error: (error as Error).message };
  }
}

async function withClient<T>(
  handler: (supabase: SupabaseClient, viewer: string) => Promise<FeedWriteResult>,
): Promise<FeedWriteResult> {
  if (!hasSupabaseEnv()) return { ok: true, source: 'local' };

  try {
    const supabase = await createClient();
    const viewer = await viewerId(supabase);
    if (!viewer) return { ok: true, source: 'local' };
    return await handler(supabase, viewer);
  } catch (error) {
    return { ok: false, source: 'supabase', error: (error as Error).message };
  }
}

export function togglePostReaction(postId: string): Promise<FeedWriteResult> {
  return withClient(async (supabase, viewer) => {
    const { data: existing } = await supabase
      .from('post_reactions')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', viewer)
      .maybeSingle();

    const result = existing
      ? await supabase.from('post_reactions').delete().eq('post_id', postId).eq('user_id', viewer)
      : await supabase
          .from('post_reactions')
          .insert({ post_id: postId, user_id: viewer, reaction: 'FIRE' });

    if (result.error) {
      if (isMissingFeedSchema(result.error)) return { ok: true, source: 'local' };
      return { ok: false, source: 'supabase', error: result.error.message };
    }

    return { ok: true, source: 'supabase' };
  });
}

export function togglePostBookmark(postId: string): Promise<FeedWriteResult> {
  return withClient(async (supabase, viewer) => {
    const { data: existing } = await supabase
      .from('post_bookmarks')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', viewer)
      .maybeSingle();

    const result = existing
      ? await supabase.from('post_bookmarks').delete().eq('post_id', postId).eq('user_id', viewer)
      : await supabase.from('post_bookmarks').insert({ post_id: postId, user_id: viewer });

    if (result.error) {
      if (isMissingFeedSchema(result.error)) return { ok: true, source: 'local' };
      return { ok: false, source: 'supabase', error: result.error.message };
    }

    return { ok: true, source: 'supabase' };
  });
}

export function createPostComment(postId: string, body: string): Promise<FeedWriteResult> {
  const trimmed = body.trim();
  if (!trimmed) return Promise.resolve({ ok: false, source: 'local', error: 'Comment cannot be empty.' });

  return withClient(async (supabase, viewer) => {
    const { error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: viewer, body: trimmed });

    if (error) {
      if (isMissingFeedSchema(error)) return { ok: true, source: 'local' };
      return { ok: false, source: 'supabase', error: error.message };
    }

    return { ok: true, source: 'supabase' };
  });
}

export function awardPostMedal(
  postId: string,
  medal: string,
  note?: string,
): Promise<FeedWriteResult> {
  return withClient(async (supabase, viewer) => {
    const { error } = await supabase
      .from('post_medals')
      .insert({ post_id: postId, professional_id: viewer, medal, note: note || null });

    if (error) {
      if (isMissingFeedSchema(error)) return { ok: true, source: 'local' };
      return { ok: false, source: 'supabase', error: error.message };
    }

    return { ok: true, source: 'supabase' };
  });
}

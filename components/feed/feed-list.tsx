'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, Plus, Users } from 'lucide-react';
import { getLocalPosts, subscribeToLocalFeed, type FeedPost } from '@/lib/feed';
import { PostCard } from './post-card';

export type FeedView = 'latest' | 'following' | 'stat-cards';

interface FeedListProps {
  posts: FeedPost[];
  view: FeedView;
  /** False when the Supabase feed tables are not available yet. */
  isRemote: boolean;
  isCoach: boolean;
  author: { id: string; name: string };
}

const VIEWS: { id: FeedView; label: string }[] = [
  { id: 'latest', label: 'Latest' },
  { id: 'following', label: 'Following' },
  { id: 'stat-cards', label: 'Stat cards' },
];

/** The shell owns the composer; the feed asks it to open via a window event. */
const OPEN_COMPOSER_EVENT = 'sprintnp:open-composer';

/**
 * The feed.
 *
 * One centred column, nothing beside it. The previous three-card sidebar was
 * decoration that competed with the content - and its dark panel leaked a
 * full-bleed gradient over the page because the absolutely positioned
 * background had no positioned ancestor to be clipped by.
 *
 * Posts arrive from Supabase on the server. When the feed schema is not
 * deployed the local cache is merged in, so the app stays usable while the
 * migration is pending.
 */
export function FeedList({ posts, view, isRemote, isCoach, author }: FeedListProps) {
  const [localPosts, setLocalPosts] = useState<FeedPost[]>([]);

  useEffect(() => {
    if (isRemote) return;

    // Seed from the cache during the subscribe callback's first tick so the
    // read happens inside the effect, not as a cascading setState.
    return subscribeToLocalFeed(() => setLocalPosts(getLocalPosts()), true);
  }, [isRemote]);

  // Local cards first: they are the newest thing the viewer just did.
  const merged = isRemote ? posts : [...localPosts, ...posts];
  const visible =
    view === 'stat-cards' ? merged.filter((post) => post.kind === 'STAT_CARD') : merged;

  return (
    <div className="mx-auto w-full max-w-[600px]">
      <header className="flex items-center justify-between gap-4">
        <h1 className="type-title text-ink">Feed</h1>

        <div className="segmented shrink-0" role="tablist" aria-label="Feed filters">
          {VIEWS.map((option) => (
            <Link
              key={option.id}
              role="tab"
              aria-selected={view === option.id}
              href={option.id === 'latest' ? '/feed' : `/feed?view=${option.id}`}
              scroll={false}
              className="segmented-item"
            >
              {option.label}
            </Link>
          ))}
        </div>
      </header>

      <ComposerPrompt author={author} />

      {visible.length === 0 ? (
        <EmptyState view={view} />
      ) : (
        <div className="mt-5 space-y-4">
          {visible.map((post) => (
            <PostCard key={post.id} post={post} isCoach={isCoach} isLocal={!isRemote} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The one always-present way to post. Grouping/mapping: the control sits at
 * the top of the feed and reads as writing *into* the feed, so posting never
 * depends on finding a button in the header.
 */
function ComposerPrompt({ author }: { author: { id: string; name: string } }) {
  const open = () => window.dispatchEvent(new Event(OPEN_COMPOSER_EVENT));

  return (
    <button
      type="button"
      onClick={open}
      className="press mt-5 flex w-full items-center gap-3 rounded-[var(--radius-card)] bg-white p-3 text-left elevation-1 transition-shadow duration-300 hover:elevation-2"
    >
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-900 text-[13px] font-semibold text-white"
      >
        {author.name.charAt(0).toUpperCase()}
      </span>

      <span className="flex-1 truncate text-[15px] text-ink-tertiary">
        Post your stat card or a clip…
      </span>

      <span className="press grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white">
        <Plus size={17} strokeWidth={2.2} className="text-accent-orange" />
      </span>
    </button>
  );
}

function EmptyState({ view }: { view: FeedView }) {
  const isFollowing = view === 'following';

  return (
    <div className="mt-5 rounded-[var(--radius-card)] bg-white px-6 py-16 text-center elevation-1">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-black/[0.04]">
        {isFollowing ? (
          <Users className="size-5 text-ink-tertiary" strokeWidth={1.8} />
        ) : (
          <Flame className="size-5 text-ink-tertiary" strokeWidth={1.8} />
        )}
      </span>

      <h2 className="type-headline mt-4 text-ink">
        {isFollowing ? 'No one followed yet' : 'Nothing here yet'}
      </h2>

      <p className="type-caption mx-auto mt-1.5 max-w-xs text-ink-secondary">
        {isFollowing
          ? 'Follow a few players and their stat cards will collect here.'
          : 'Post your first stat card and it will show up here.'}
      </p>
    </div>
  );
}

export { OPEN_COMPOSER_EVENT };

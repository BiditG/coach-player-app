'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, Flame, Sparkles, TrendingUp, Users } from 'lucide-react';
import { getLocalPosts, subscribeToLocalFeed, type FeedPost } from '@/lib/feed';
import { PostCard } from './post-card';

export type FeedView = 'latest' | 'following' | 'stat-cards';

interface FeedListProps {
  posts: FeedPost[];
  view: FeedView;
  /** False when the Supabase feed tables are not available yet. */
  isRemote: boolean;
  isCoach: boolean;
}

const VIEWS: { id: FeedView; label: string }[] = [
  { id: 'latest', label: 'Latest' },
  { id: 'following', label: 'Following' },
  { id: 'stat-cards', label: 'Stat Cards' },
];

/**
 * The feed.
 *
 * Posts arrive from Supabase on the server. When the feed schema is not
 * deployed the local cache is merged in, so the app stays usable while the
 * migration is pending.
 */
export function FeedList({ posts, view, isRemote, isCoach }: FeedListProps) {
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
    <div className="grid w-full gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0">
        <header className="border-b border-hairline pb-4">
          <p className="type-eyebrow text-ink-tertiary">SprintNP</p>
          <h1 className="type-display mt-2 text-balance text-ink">Play your best innings.</h1>
          <p className="type-body mt-2.5 max-w-md text-ink-secondary">
            Post a stat card, share a clip, and get seen by coaches who know what
            the numbers mean.
          </p>

          <nav className="mt-5 -mb-4 flex gap-1" aria-label="Feed filters">
            {VIEWS.map((option) => (
              <Link
                key={option.id}
                href={option.id === 'latest' ? '/feed' : `/feed?view=${option.id}`}
                scroll={false}
                aria-current={view === option.id ? 'page' : undefined}
                className={`press rounded-full px-3.5 py-1.5 text-[13px] font-medium ${
                  view === option.id
                    ? 'bg-ink text-white'
                    : 'text-ink-secondary hover:bg-black/[0.04] hover:text-ink'
                }`}
              >
                {option.label}
              </Link>
            ))}
          </nav>
        </header>

        {visible.length === 0 ? (
          <EmptyState view={view} />
        ) : (
          <div className="mt-6 space-y-6">
            {visible.map((post) => (
              <PostCard key={post.id} post={post} isCoach={isCoach} isLocal={!isRemote} />
            ))}
          </div>
        )}
      </section>

      <aside className="hidden space-y-4 xl:block">
        <ActivityPanel isRemote={isRemote} />

        <div className="rounded-[var(--radius-card)] bg-white p-5 elevation-1">
          <h3 className="type-eyebrow text-ink-tertiary">Coach medals</h3>
          <p className="type-caption mt-1.5 text-ink-secondary">
            Awarded by verified professionals on a stat card.
          </p>
          <div className="mt-4 space-y-2">
            {[
              { name: 'Precision', tone: 'text-amber-700 bg-amber-50' },
              { name: 'Great Progress', tone: 'text-emerald-700 bg-emerald-50' },
              { name: 'Consistency', tone: 'text-blue-700 bg-blue-50' },
              { name: 'Technical Craft', tone: 'text-orange-700 bg-orange-50' },
            ].map((medal) => (
              <div
                key={medal.name}
                className="flex items-center gap-2.5 rounded-xl bg-black/[0.03] px-3 py-2.5"
              >
                <span className={`grid size-8 place-items-center rounded-full ${medal.tone}`}>
                  <Award className="size-4" strokeWidth={1.9} />
                </span>
                <span className="text-[13px] font-medium text-ink">{medal.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[var(--radius-card)] p-6 text-white elevation-2">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(120% 100% at 0% 0%, #34343a 0%, #131316 60%, #08080a 100%)',
            }}
          />
          <div className="relative">
            <TrendingUp className="size-5 text-orange-400" strokeWidth={1.8} />
            <h4 className="type-title mt-8 text-white">Numbers travel further.</h4>
            <p className="type-caption mt-2 text-white/60">
              Every stat card is a coach&rsquo;s first impression. Fill the numbers in
              properly and the right people will find you.
            </p>
            <Link
              href="/profile"
              className="press mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur-md hover:bg-white/20"
            >
              <Sparkles className="size-3.5" strokeWidth={2} />
              Complete your profile
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

function EmptyState({ view }: { view: FeedView }) {
  return (
    <div className="mt-6 rounded-[var(--radius-card)] bg-white px-6 py-16 text-center elevation-1">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-black/[0.04]">
        {view === 'following' ? (
          <Users className="size-5 text-ink-tertiary" strokeWidth={1.8} />
        ) : (
          <Flame className="size-5 text-ink-tertiary" strokeWidth={1.8} />
        )}
      </span>
      <h2 className="type-headline mt-4 text-ink">
        {view === 'following' ? 'No one followed yet' : 'Nothing here yet'}
      </h2>
      <p className="type-caption mx-auto mt-1.5 max-w-xs text-ink-secondary">
        {view === 'following'
          ? 'Follow a few players and their stat cards will collect here.'
          : 'Post your first stat card and it will show up here.'}
      </p>
    </div>
  );
}

function ActivityPanel({ isRemote }: { isRemote: boolean }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-white p-5 elevation-1">
      <h3 className="type-eyebrow text-ink-tertiary">This week</h3>
      <dl className="mt-4 space-y-3.5">
        {[
          { label: 'Stat cards posted', value: isRemote ? 'Live' : '—' },
          { label: 'Data source', value: isRemote ? 'Supabase' : 'This device' },
          { label: 'Rates', value: 'Derived' },
        ].map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4">
            <dt className="text-caption text-ink-secondary">{row.label}</dt>
            <dd className="tabular text-[13px] font-semibold text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

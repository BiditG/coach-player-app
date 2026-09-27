import { requireUser } from '@/lib/auth';
import { getFeedPosts } from '@/lib/feed-supabase';
import { FeedList, type FeedView } from '@/components/feed/feed-list';

const VIEWS: FeedView[] = ['latest', 'following', 'stat-cards'];

function parseView(value: string | string[] | undefined): FeedView {
  const raw = Array.isArray(value) ? value[0] : value;
  return VIEWS.includes(raw as FeedView) ? (raw as FeedView) : 'latest';
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const [profile, params] = await Promise.all([requireUser(), searchParams]);
  const view = parseView(params.view);

  // Server-driven filtering keeps the feed a real query, not a client filter.
  const { posts, available } = await getFeedPosts({
    followingOnly: view === 'following',
    statCardsOnly: view === 'stat-cards',
  });

  return (
    <FeedList
      posts={posts}
      view={view}
      isRemote={available}
      isCoach={profile.role === 'PROFESSIONAL' || profile.role === 'ADMIN'}
      author={{ id: profile.id, name: profile.full_name || profile.email || 'Player' }}
    />
  );
}

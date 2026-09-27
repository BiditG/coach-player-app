export interface StatCardData {
  score: string;
  balls?: string;
  strikeRate: string;
  fours: string;
  sixes: string;
  dotBalls: string;
  matchTitle: string;
  matchResult: string;
  tag: string;
}

export interface Post {
  id: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  timeAgo: string;
  location?: string;
  caption: string;
  imageUrl?: string;
  hasStatCard: boolean;
  statCard?: StatCardData;
  fireCount: number;
  hasFired: boolean;
  commentsCount: number;
  bookmarked: boolean;
  comments: { id: string; author: string; text: string; timeAgo: string }[];
  medals?: string[];
  createdAt: string;
}

const STORAGE_KEY = 'sprintnp_posts_v2';

export const SEED_POSTS: Post[] = [
  {
    id: 'post-arjun-78',
    authorName: 'Arjun Mehta',
    authorHandle: '@arjunmehta',
    timeAgo: '2h ago',
    location: 'Local Match • Mumbai',
    caption: 'Good game today! Nice to get some time in the middle again. 🏏',
    imageUrl: '/images/cricket-feed-poster.png',
    hasStatCard: true,
    statCard: {
      score: '78 (52)',
      strikeRate: '150.0',
      fours: '8',
      sixes: '3',
      dotBalls: '12',
      matchTitle: 'Rivals CC vs Heritage XI',
      matchResult: 'Won by 32 runs',
      tag: 'Match',
    },
    fireCount: 124,
    hasFired: false,
    commentsCount: 2,
    bookmarked: false,
    comments: [
      { id: 'c1', author: 'Karan Desai', text: 'Clean striking! That pull shot in the 8th over was effortless.', timeAgo: '1h ago' },
      { id: 'c2', author: 'Coach Vikram', text: 'Stance looking solid. Maintain that back-foot alignment.', timeAgo: '45m ago' },
    ],
    medals: ['Technical excellence'],
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'post-karan-418',
    authorName: 'Karan Desai',
    authorHandle: '@karandesai',
    timeAgo: '5h ago',
    location: 'League Match • Bangalore',
    caption: 'Tight spell in the death overs. 4 overs, 2 wickets for 18 runs. Focused on seam movement today. ⚡',
    imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop',
    hasStatCard: true,
    statCard: {
      score: '4/18 (4.0)',
      strikeRate: 'Econ 4.50',
      fours: '0',
      sixes: '1',
      dotBalls: '16',
      matchTitle: 'Bangalore Strikers vs Knights CC',
      matchResult: 'Won by 4 wickets',
      tag: 'Bowling',
    },
    fireCount: 89,
    hasFired: true,
    commentsCount: 1,
    bookmarked: true,
    comments: [
      { id: 'c3', author: 'Rohan Iyer', text: 'Great control on the outswingers mate!', timeAgo: '3h ago' },
    ],
    medals: ['Precision'],
    createdAt: new Date(Date.now() - 18000000).toISOString(),
  },
];

export function getSavedPosts(): Post[] {
  if (typeof window === 'undefined') return SEED_POSTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_POSTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return SEED_POSTS;
  } catch {
    return SEED_POSTS;
  }
}

export function savePost(post: Post): Post[] {
  const current = getSavedPosts();
  const updated = [post, ...current];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('sprintnp:posts-changed'));
    } catch (err) {
      console.error('Failed to save post to localStorage', err);
    }
  }
  return updated;
}

// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * The retired localStorage store used `sprintnp_posts_v2`; the current one uses
 * `sprintnp_feed_v1`. When the feed was rewritten the key changed with no
 * migration, so every post a player had already made silently vanished. These
 * tests pin the rescue that fixes that.
 */

type Listener = () => void;

function installLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const listeners: Listener[] = [];

  const fake = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };

  const fakeWindow = {
    localStorage: fake,
    addEventListener: (_type: string, fn: Listener) => listeners.push(fn),
    removeEventListener: (_type: string, fn: Listener) => {
      const index = listeners.indexOf(fn);
      if (index >= 0) listeners.splice(index, 1);
    },
    dispatchEvent: () => true,
  };

  (globalThis as unknown as { window: unknown }).window = fakeWindow;

  return { store, fake, listeners };
}

function clearWindow() {
  delete (globalThis as unknown as { window?: unknown }).window;
}

/** A post in the exact shape the retired store persisted. */
function legacyBattingPost() {
  return {
    id: 'post-arjun-78',
    authorName: 'Arjun Mehta',
    authorHandle: '@arjunmehta',
    timeAgo: '2h ago',
    location: 'Local Match • Mumbai',
    caption: 'Good game today! 🏏',
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
    commentsCount: 1,
    bookmarked: false,
    comments: [{ id: 'c1', author: 'Karan Desai', text: 'Clean striking!', timeAgo: '1h ago' }],
    medals: ['Technical excellence'],
    createdAt: new Date().toISOString(),
  };
}

function legacyBowlingPost() {
  return {
    id: 'post-karan-418',
    authorName: 'Karan Desai',
    authorHandle: '@karandesai',
    caption: 'Tight spell in the death overs. ⚡',
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
    commentsCount: 0,
    bookmarked: true,
    comments: [],
    createdAt: new Date().toISOString(),
  };
}

async function loadFeedModule() {
  // Imported after the window stub exists so the module's localStorage access
  // happens against the fake.
  return import('../../lib/feed');
}

describe('legacy localStorage rescue', () => {
  beforeEach(() => {
    clearWindow();
  });

  afterEach(() => {
    clearWindow();
  });

  it('returns nothing when neither key exists', async () => {
    installLocalStorage();
    const { getLocalPosts } = await loadFeedModule();

    expect(getLocalPosts()).toEqual([]);
  });

  it('rescues posts stranded under the retired storage key', async () => {
    installLocalStorage({ sprintnp_posts_v2: JSON.stringify([legacyBattingPost()]) });
    const { getLocalPosts } = await loadFeedModule();

    const posts = getLocalPosts();

    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe('post-arjun-78');
    expect(posts[0].author.name).toBe('Arjun Mehta');
    expect(posts[0].caption).toBe('Good game today! 🏏');
    expect(posts[0].fireCount).toBe(124);
    expect(posts[0].bookmarked).toBe(false);
    expect(posts[0].matchTitle).toBe('Rivals CC vs Heritage XI');
  });

  it('parses the formatted score back into raw inputs and re-derives the rates', async () => {
    installLocalStorage({ sprintnp_posts_v2: JSON.stringify([legacyBattingPost()]) });
    const { getLocalPosts } = await loadFeedModule();

    const post = getLocalPosts()[0];

    expect(post.role).toBe('BATSMAN');
    expect(post.inputs).toEqual({
      runs: 78,
      balls: 52,
      fours: 8,
      sixes: 3,
      dotBalls: 12,
    });

    // 78 runs off 52 balls -> 150.0, not the 150.0 the old store happened to
    // have persisted. The point is it is recomputed, never trusted.
    expect(post.stats?.role).toBe('BATSMAN');
    if (post.stats?.role === 'BATSMAN') {
      expect(post.stats.strikeRate).toBe(150);
      expect(post.stats.boundaryRuns).toBe(8 * 4 + 3 * 6);
    }
  });

  it('reads a bowling score as wickets, runs and overs', async () => {
    installLocalStorage({ sprintnp_posts_v2: JSON.stringify([legacyBowlingPost()]) });
    const { getLocalPosts } = await loadFeedModule();

    const post = getLocalPosts()[0];

    expect(post.role).toBe('BOWLER');
    expect(post.inputs).toEqual({
      wickets: 4,
      runsConceded: 18,
      overs: '4.0',
      maidenOvers: 0,
      dotBalls: 16,
      wides: 0,
      noBalls: 0,
    });

    if (post.stats?.role === 'BOWLER') {
      // 4.0 overs is 24 balls, so economy is 18 / 4 = 4.5, not 4.00.
      expect(post.stats.balls).toBe(24);
      expect(post.stats.economy).toBe(4.5);
      expect(post.stats.oversDisplay).toBe('4.0');
    }
  });

  it('persists the rescued posts under the current key so it only runs once', async () => {
    const { store } = installLocalStorage({
      sprintnp_posts_v2: JSON.stringify([legacyBattingPost()]),
    });
    const { getLocalPosts, LOCAL_FEED_KEY } = await loadFeedModule();

    getLocalPosts();

    const written = store.get(LOCAL_FEED_KEY);
    expect(written).toBeDefined();
    expect(JSON.parse(written as string)).toHaveLength(1);
  });

  it('leaves the retired key intact so nothing is destroyed', async () => {
    const { store } = installLocalStorage({
      sprintnp_posts_v2: JSON.stringify([legacyBattingPost()]),
    });
    const { getLocalPosts } = await loadFeedModule();

    getLocalPosts();

    expect(store.get('sprintnp_posts_v2')).toBeDefined();
  });

  it('prefers the current key and never overwrites it with legacy data', async () => {
    installLocalStorage({
      sprintnp_posts_v2: JSON.stringify([legacyBattingPost()]),
      sprintnp_feed_v1: JSON.stringify([{ ...legacyBattingPost(), id: 'newer-post' }]),
    });
    const { getLocalPosts } = await loadFeedModule();

    const posts = getLocalPosts();

    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe('newer-post');
  });

  it('skips unusable legacy entries instead of throwing', async () => {
    installLocalStorage({
      sprintnp_posts_v2: JSON.stringify([null, 42, { noId: true }, legacyBattingPost()]),
    });
    const { getLocalPosts } = await loadFeedModule();

    const posts = getLocalPosts();

    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe('post-arjun-78');
  });

  it('survives corrupt JSON in either key', async () => {
    installLocalStorage({ sprintnp_posts_v2: '{not json', sprintnp_feed_v1: 'also not json' });
    const { getLocalPosts } = await loadFeedModule();

    expect(getLocalPosts()).toEqual([]);
  });
});

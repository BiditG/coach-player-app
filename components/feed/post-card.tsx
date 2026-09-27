'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { Award, Bookmark, Flame, MessageCircle, MoreHorizontal, Share2 } from 'lucide-react';
import { MEDAL_KEYS, MEDAL_LABELS, relativeTime, type FeedPost } from '@/lib/feed';
import { addComment, awardMedal, toggleFire, toggleSave } from '@/app/(dashboard)/feed/actions';
import { mutateLocalPost } from '@/lib/feed';
import { cn } from '@/lib/utils';
import { StatCard } from './stat-card';
import { ShareModal } from '@/components/share-modal';

interface PostCardProps {
  post: FeedPost;
  isCoach: boolean;
  /** True when the feed is being served from the local fallback cache. */
  isLocal: boolean;
}

export function PostCard({ post, isCoach, isLocal }: PostCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showComments, setShowComments] = useState(false);
  const [showMedalMenu, setShowMedalMenu] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [optimistic, applyOptimistic] = useOptimistic(post, (state, patch: Partial<FeedPost>) => ({
    ...state,
    ...patch,
  }));

  const handleFire = () => {
    setError(null);
    const hasFired = !optimistic.hasFired;

    startTransition(async () => {
      // Respond on press, reconcile after.
      applyOptimistic({ hasFired, fireCount: Math.max(0, optimistic.fireCount + (hasFired ? 1 : -1)) });

      const result = await toggleFire(optimistic.id);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.source === 'local') {
        mutateLocalPost(optimistic.id, (cached) => ({
          ...cached,
          hasFired,
          fireCount: Math.max(0, cached.fireCount + (hasFired ? 1 : -1)),
        }));
      }
    });
  };

  const handleSave = () => {
    setError(null);
    const bookmarked = !optimistic.bookmarked;

    startTransition(async () => {
      applyOptimistic({ bookmarked });

      const result = await toggleSave(optimistic.id);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.source === 'local') {
        mutateLocalPost(optimistic.id, (cached) => ({ ...cached, bookmarked }));
      }
    });
  };

  const handleComment = (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;

    setError(null);
    setDraft('');

    startTransition(async () => {
      const { result, authorName } = await addComment(optimistic.id, body);

      if (!result.ok) {
        setError(result.error);
        setDraft(body);
        return;
      }

      if (result.source === 'local') {
        const createdAt = new Date().toISOString();
        mutateLocalPost(optimistic.id, (cached) => ({
          ...cached,
          commentCount: cached.commentCount + 1,
          comments: [
            ...cached.comments,
            { id: `local-${Date.now()}`, authorName, body, createdAt },
          ],
        }));
      }
    });
  };

  const handleMedal = (medal: string) => {
    setShowMedalMenu(false);
    setError(null);

    startTransition(async () => {
      const result = await awardMedal(optimistic.id, medal);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.source === 'local') {
        mutateLocalPost(optimistic.id, (cached) => ({
          ...cached,
          medals: cached.medals.includes(MEDAL_LABELS[medal as keyof typeof MEDAL_LABELS])
            ? cached.medals
            : [...cached.medals, MEDAL_LABELS[medal as keyof typeof MEDAL_LABELS]],
        }));
      }
    });
  };

  return (
    <article className="enter-rise overflow-hidden rounded-[var(--radius-card)] bg-white elevation-1 transition-shadow duration-300 hover:elevation-2">
      <header className="flex items-start gap-3 px-5 pt-5">
        <div
          aria-hidden
          className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-900 text-[13px] font-semibold text-white"
        >
          {optimistic.author.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={optimistic.author.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            optimistic.author.name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="type-headline truncate text-ink">{optimistic.author.name}</h3>
          <p className="mt-0.5 truncate text-caption text-ink-tertiary">
            {optimistic.author.handle} · {relativeTime(optimistic.createdAt)}
          </p>
        </div>

        {optimistic.medals.length > 0 && (
          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {optimistic.medals.map((medal) => (
              <span
                key={medal}
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800"
              >
                <Award className="size-3" strokeWidth={2} />
                {medal}
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          aria-label="More options"
          className="press -mr-1.5 grid size-9 shrink-0 place-items-center rounded-full text-ink-tertiary hover:bg-black/[0.04] hover:text-ink"
        >
          <MoreHorizontal className="size-[18px]" strokeWidth={1.8} />
        </button>
      </header>

      <div className="px-5 pt-4">
        {optimistic.kind === 'STAT_CARD' ? (
          <StatCard post={optimistic} />
        ) : (
          <div className="aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-card)] bg-neutral-200 sm:aspect-[16/11]">
            {optimistic.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={optimistic.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
            )}
          </div>
        )}
      </div>

      <div className="px-5 pb-5 pt-4">
        {optimistic.caption && (
          <p className="type-body text-ink">
            <span className="font-semibold">{optimistic.author.name}</span>{' '}
            <span className="text-ink-secondary">{optimistic.caption}</span>
          </p>
        )}

        {error && (
          <p role="status" className="mt-3 text-caption text-ink-tertiary">
            {error}
          </p>
        )}

        {/* Action bar. Feedback is on the press; the transition only covers
            reconciling with the server. */}
        <div className="mt-4 flex items-center gap-1 border-t border-hairline-soft pt-3">
          <button
            type="button"
            onClick={handleFire}
            disabled={isPending}
            aria-pressed={optimistic.hasFired}
            className={cn(
              'press inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium',
              optimistic.hasFired
                ? 'bg-orange-500/10 text-orange-600'
                : 'text-ink-secondary hover:bg-black/[0.04] hover:text-ink',
            )}
          >
            <Flame
              className={cn('size-[17px]', optimistic.hasFired && 'fill-orange-500 text-orange-500')}
              strokeWidth={1.8}
            />
            <span className="tabular">{optimistic.fireCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowComments((open) => !open)}
            aria-expanded={showComments}
            className="press inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink-secondary hover:bg-black/[0.04] hover:text-ink"
          >
            <MessageCircle className="size-[17px]" strokeWidth={1.8} />
            <span className="tabular">{optimistic.commentCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowShare(true)}
            className="press inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink-secondary hover:bg-black/[0.04] hover:text-ink"
          >
            <Share2 className="size-[17px]" strokeWidth={1.8} />
            <span className="hidden sm:inline">Share</span>
          </button>

          {isCoach && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMedalMenu((open) => !open)}
                aria-expanded={showMedalMenu}
                className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-amber-50 px-3 text-[13px] font-semibold text-amber-800 hover:bg-amber-100"
              >
                <Award className="size-[16px]" strokeWidth={2} />
                <span className="hidden sm:inline">Medal</span>
              </button>

              {showMedalMenu && (
                <div
                  role="menu"
                  className="enter-material absolute bottom-full left-0 z-30 mb-2 w-56 overflow-hidden rounded-2xl bg-white/85 p-1.5 backdrop-blur-xl elevation-3"
                >
                  <p className="type-eyebrow px-2.5 py-1.5 text-ink-tertiary">Award a medal</p>
                  {MEDAL_KEYS.map((medal) => (
                    <button
                      key={medal}
                      type="button"
                      role="menuitem"
                      onClick={() => handleMedal(medal)}
                      className="press w-full rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-black/[0.05]"
                    >
                      {MEDAL_LABELS[medal]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            aria-pressed={optimistic.bookmarked}
            aria-label={optimistic.bookmarked ? 'Remove bookmark' : 'Bookmark post'}
            className={cn(
              'press press-sm ml-auto grid size-9 place-items-center rounded-full',
              optimistic.bookmarked
                ? 'bg-black/[0.06] text-ink'
                : 'text-ink-tertiary hover:bg-black/[0.04] hover:text-ink',
            )}
          >
            <Bookmark
              className={cn('size-[17px]', optimistic.bookmarked && 'fill-ink')}
              strokeWidth={1.8}
            />
          </button>
        </div>

        {showComments && (
          <div className="enter-rise mt-4 space-y-3 border-t border-hairline-soft pt-4">
            {optimistic.comments.length > 0 ? (
              <ul className="fade-bottom max-h-56 space-y-3 overflow-y-auto pr-1">
                {optimistic.comments.map((comment) => (
                  <li key={comment.id}>
                    <p className="text-caption font-semibold text-ink">
                      {comment.authorName}
                      <span className="ml-2 font-normal text-ink-tertiary">
                        {relativeTime(comment.createdAt)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-caption leading-relaxed text-ink-secondary">
                      {comment.body}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-caption text-ink-tertiary">No comments yet.</p>
            )}

            <form onSubmit={handleComment} className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Add a comment…"
                aria-label="Add a comment"
                className="h-10 min-w-0 flex-1 rounded-full bg-black/[0.04] px-4 text-[13px] text-ink outline-none transition placeholder:text-ink-tertiary focus:bg-black/[0.06]"
              />
              <button
                type="submit"
                disabled={!draft.trim() || isPending}
                aria-label="Post comment"
                className="press grid size-10 place-items-center rounded-full bg-ink text-white disabled:opacity-40"
              >
                <MessageCircle className="size-4" strokeWidth={2} />
              </button>
            </form>
          </div>
        )}
      </div>

      {isLocal && (
        <p className="border-t border-hairline-soft px-5 py-2.5 text-[11px] text-ink-tertiary">
          Saved on this device — sync to Supabase once migration 0009 is applied.
        </p>
      )}

      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        postTitle={`${optimistic.author.name}'s cricket highlight on SprintNP`}
      />
    </article>
  );
}

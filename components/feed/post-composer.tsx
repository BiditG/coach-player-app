'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { Image as ImageIcon, LineChart, X } from 'lucide-react';
import {
  deriveBowlingStats,
  deriveBattingStats,
  formatOvers,
  parseOversToBalls,
  PLAYER_ROLES,
  type BattingInput,
  type BowlingInput,
  type PlayerRole,
} from '@/lib/cricket-stats';
import { createPost } from '@/app/(dashboard)/feed/actions';
import { handleFromName, upsertLocalPost, type FeedPost } from '@/lib/feed';
import { deriveStats } from '@/lib/cricket-stats';
import { cn } from '@/lib/utils';

export type PostKind = 'STAT_CARD' | 'IMAGE';

interface PostComposerProps {
  isOpen: boolean;
  onClose: () => void;
  author: { id: string; name: string };
}

const FIELD_CLASS =
  'h-11 w-full rounded-[var(--radius-control)] bg-black/[0.04] px-3.5 text-[15px] tabular text-ink outline-none transition placeholder:text-ink-tertiary focus:bg-white focus:ring-1 focus:ring-black/15';

const LABEL_CLASS = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-tertiary';

export function PostComposer({ isOpen, onClose, author }: PostComposerProps) {
  const [kind, setKind] = useState<PostKind>('STAT_CARD');
  const [role, setRole] = useState<PlayerRole>('BATSMAN');
  const [caption, setCaption] = useState('');
  const [matchTitle, setMatchTitle] = useState('');
  const [matchResult, setMatchResult] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batting inputs, kept as strings so a partially typed value is never coerced
  // to NaN mid-keystroke.
  const [runs, setRuns] = useState('');
  const [balls, setBalls] = useState('');
  const [fours, setFours] = useState('');
  const [sixes, setSixes] = useState('');
  const [dotBalls, setDotBalls] = useState('');

  // Bowling inputs.
  const [runsConceded, setRunsConceded] = useState('');
  const [wickets, setWickets] = useState('');
  const [overs, setOvers] = useState('');
  const [maidenOvers, setMaidenOvers] = useState('');
  const [bowlerDots, setBowlerDots] = useState('');
  const [wides, setWides] = useState('');
  const [noBalls, setNoBalls] = useState('');

  /**
   * The rate is derived, never typed. Reading it straight off the inputs means
   * the preview and the published card run identical code.
   */
  const batting = useMemo(
    () => deriveBattingStats({ runs: Number(runs) || 0, balls: Number(balls) || 0, fours: Number(fours) || 0, sixes: Number(sixes) || 0, dotBalls: Number(dotBalls) || 0 }),
    [runs, balls, fours, sixes, dotBalls],
  );

  const bowling = useMemo(
    () =>
      deriveBowlingStats({
        runsConceded: Number(runsConceded) || 0,
        wickets: Number(wickets) || 0,
        overs,
        maidenOvers: Number(maidenOvers) || 0,
        dotBalls: Number(bowlerDots) || 0,
        wides: Number(wides) || 0,
        noBalls: Number(noBalls) || 0,
      }),
    [runsConceded, wickets, overs, maidenOvers, bowlerDots, wides, noBalls],
  );

  const oversBalls = parseOversToBalls(overs);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setCaption('');
    setMatchTitle('');
    setMatchResult('');
    setImageUrl(null);
    setRuns('');
    setBalls('');
    setFours('');
    setSixes('');
    setDotBalls('');
    setRunsConceded('');
    setWickets('');
    setOvers('');
    setMaidenOvers('');
    setBowlerDots('');
    setWides('');
    setNoBalls('');
  };

  /**
   * Read the visible form into raw inputs. The shape is chosen by the role
   * toggle, which is what makes the field set dynamic.
   */
  function collectInputs(): BattingInput | BowlingInput | null {
    if (kind !== 'STAT_CARD') return null;

    if (role === 'BOWLER') {
      return {
        runsConceded: Number(runsConceded) || 0,
        wickets: Number(wickets) || 0,
        overs,
        maidenOvers: Number(maidenOvers) || 0,
        dotBalls: Number(bowlerDots) || 0,
        wides: Number(wides) || 0,
        noBalls: Number(noBalls) || 0,
      };
    }

    return {
      runs: Number(runs) || 0,
      balls: Number(balls) || 0,
      fours: Number(fours) || 0,
      sixes: Number(sixes) || 0,
      dotBalls: Number(dotBalls) || 0,
    };
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const inputs = collectInputs();

    startTransition(async () => {
      const result = await createPost({
        kind,
        role: kind === 'STAT_CARD' ? role : null,
        caption,
        imageUrl,
        stats: inputs as Record<string, number | string> | null,
        matchTitle,
        matchResult,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.source === 'local' && inputs) {
        // Mirror the write locally so the feed still shows the new card.
        const localPost: FeedPost = {
          id: `local-${Date.now()}`,
          author: {
            id: author.id,
            name: author.name,
            handle: handleFromName(author.name),
            avatarUrl: null,
          },
          kind,
          role: kind === 'STAT_CARD' ? role : null,
          caption: caption.trim(),
          imageUrl,
          matchTitle: matchTitle.trim(),
          matchResult: matchResult.trim(),
          inputs,
          stats: kind === 'STAT_CARD' ? deriveStats(role, inputs) : null,
          fireCount: 0,
          hasFired: false,
          commentCount: 0,
          bookmarked: false,
          comments: [],
          medals: [],
          createdAt: new Date().toISOString(),
        };
        upsertLocalPost(localPost);
      }

      reset();
      onClose();
    });
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create post"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 p-0 backdrop-blur-sm sm:items-center sm:p-6"
    >
      {/* Dim the background, push it back. The sheet is the only thing in
          focus. Enter and exit share this path so dismissal is symmetric. */}
      <div className="enter-material max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[1.5rem] bg-white/90 p-6 backdrop-blur-2xl elevation-3 sm:rounded-[1.5rem]">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="type-title text-ink">New post</h2>
            <p className="mt-1 text-caption text-ink-tertiary">
              Share a stat card or a photo from the ground.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-ink-tertiary hover:bg-black/[0.05] hover:text-ink"
          >
            <X className="size-[18px]" strokeWidth={1.8} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* Post type */}
          <div className="segmented grid-cols-2" role="tablist" aria-label="Post type">
            <button
              type="button"
              role="tab"
              aria-selected={kind === 'STAT_CARD'}
              onClick={() => setKind('STAT_CARD')}
              className="segmented-item"
            >
              <LineChart className="size-4" strokeWidth={2} />
              Stat card
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={kind === 'IMAGE'}
              onClick={() => setKind('IMAGE')}
              className="segmented-item"
            >
              <ImageIcon className="size-4" strokeWidth={2} />
              Photo
            </button>
          </div>

          {kind === 'STAT_CARD' && (
            <div className="space-y-4">
              {/* Role selection. The whole form below re-renders from this. */}
              <div>
                <p className={LABEL_CLASS}>Role</p>
                <div className="segmented grid-cols-2" role="radiogroup" aria-label="Player role">
                  {PLAYER_ROLES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={role === option}
                      onClick={() => setRole(option)}
                      data-selected={role === option}
                      className="segmented-item"
                    >
                      {option === 'BATSMAN' ? 'Batsman' : 'Bowler'}
                    </button>
                  ))}
                </div>
              </div>

              {role === 'BATSMAN' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLASS} htmlFor="runs">
                        Runs
                      </label>
                      <input
                        id="runs"
                        inputMode="numeric"
                        value={runs}
                        onChange={(e) => setRuns(e.target.value)}
                        placeholder="78"
                        className={FIELD_CLASS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS} htmlFor="balls">
                        Balls faced
                      </label>
                      <input
                        id="balls"
                        inputMode="numeric"
                        value={balls}
                        onChange={(e) => setBalls(e.target.value)}
                        placeholder="52"
                        className={FIELD_CLASS}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={LABEL_CLASS} htmlFor="fours">
                        4s
                      </label>
                      <input
                        id="fours"
                        inputMode="numeric"
                        value={fours}
                        onChange={(e) => setFours(e.target.value)}
                        placeholder="8"
                        className={FIELD_CLASS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS} htmlFor="sixes">
                        6s
                      </label>
                      <input
                        id="sixes"
                        inputMode="numeric"
                        value={sixes}
                        onChange={(e) => setSixes(e.target.value)}
                        placeholder="3"
                        className={FIELD_CLASS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS} htmlFor="dot-balls">
                        Dots
                      </label>
                      <input
                        id="dot-balls"
                        inputMode="numeric"
                        value={dotBalls}
                        onChange={(e) => setDotBalls(e.target.value)}
                        placeholder="12"
                        className={FIELD_CLASS}
                      />
                    </div>
                  </div>

                  {/* Derived, read-only. Editing it is not possible by
                      construction, so it cannot disagree with the inputs. */}
                  <div className="flex items-center justify-between rounded-[var(--radius-control)] bg-black/[0.04] px-4 py-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-tertiary">
                      Strike rate
                    </span>
                    <span className="tabular text-[17px] font-semibold text-ink">
                      {batting.balls > 0 ? batting.strikeRate.toFixed(1) : '--'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LABEL_CLASS} htmlFor="runs-conceded">
                        Runs conceded
                      </label>
                      <input
                        id="runs-conceded"
                        inputMode="numeric"
                        value={runsConceded}
                        onChange={(e) => setRunsConceded(e.target.value)}
                        placeholder="18"
                        className={FIELD_CLASS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS} htmlFor="wickets">
                        Wickets
                      </label>
                      <input
                        id="wickets"
                        inputMode="numeric"
                        value={wickets}
                        onChange={(e) => setWickets(e.target.value)}
                        placeholder="4"
                        className={FIELD_CLASS}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={LABEL_CLASS} htmlFor="overs">
                      Overs bowled
                    </label>
                    <input
                      id="overs"
                      value={overs}
                      onChange={(e) => setOvers(e.target.value)}
                      placeholder="4.3"
                      className={cn(FIELD_CLASS, 'w-full')}
                    />
                    {/* Cricket notation explained where the input is, not in a
                        tooltip. 4.3 is four overs and three balls. */}
                    <p className="mt-1.5 text-[11px] text-ink-tertiary">
                      {oversBalls > 0
                        ? `${oversBalls} balls bowled (${formatOvers(oversBalls)} overs)`
                        : 'Use cricket notation — 4.3 is four overs and three balls.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={LABEL_CLASS} htmlFor="maidens">
                        Maidens
                      </label>
                      <input
                        id="maidens"
                        inputMode="numeric"
                        value={maidenOvers}
                        onChange={(e) => setMaidenOvers(e.target.value)}
                        placeholder="1"
                        className={FIELD_CLASS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS} htmlFor="bowler-dots">
                        Dots
                      </label>
                      <input
                        id="bowler-dots"
                        inputMode="numeric"
                        value={bowlerDots}
                        onChange={(e) => setBowlerDots(e.target.value)}
                        placeholder="16"
                        className={FIELD_CLASS}
                      />
                    </div>
                    <div>
                      <label className={LABEL_CLASS} htmlFor="wides">
                        Wides
                      </label>
                      <input
                        id="wides"
                        inputMode="numeric"
                        value={wides}
                        onChange={(e) => setWides(e.target.value)}
                        placeholder="1"
                        className={FIELD_CLASS}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-[var(--radius-control)] bg-black/[0.04] px-4 py-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-tertiary">
                      Economy
                    </span>
                    <span className="tabular text-[17px] font-semibold text-ink">
                      {bowling.overs > 0 ? bowling.economy.toFixed(2) : '--'}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLASS} htmlFor="match-title">
                    Match
                  </label>
                  <input
                    id="match-title"
                    value={matchTitle}
                    onChange={(e) => setMatchTitle(e.target.value)}
                    placeholder="Rivals CC vs Heritage XI"
                    className={FIELD_CLASS}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS} htmlFor="match-result">
                    Result
                  </label>
                  <input
                    id="match-result"
                    value={matchResult}
                    onChange={(e) => setMatchResult(e.target.value)}
                    placeholder="Won by 32 runs"
                    className={FIELD_CLASS}
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className={LABEL_CLASS} htmlFor="composer-image">
              Photo
            </label>
            <input
              id="composer-image"
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="sr-only"
            />
            {imageUrl ? (
              <div className="relative overflow-hidden rounded-[var(--radius-control)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  aria-label="Remove photo"
                  className="press absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md"
                >
                  <X className="size-4" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="press flex h-24 w-full items-center justify-center rounded-[var(--radius-control)] border border-dashed border-black/10 text-[13px] font-medium text-ink-tertiary hover:border-black/25 hover:text-ink-secondary"
              >
                Add a photo
              </button>
            )}
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="caption">
              Caption
            </label>
            <textarea
              id="caption"
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="How did it go?"
              className="w-full resize-none rounded-[var(--radius-control)] bg-black/[0.04] px-3.5 py-3 text-[15px] leading-relaxed text-ink outline-none transition placeholder:text-ink-tertiary focus:bg-white focus:ring-1 focus:ring-black/15"
            />
          </div>

          {error && (
            <p role="status" className="text-caption text-ink-tertiary">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-hairline-soft pt-4">
            <button
              type="button"
              onClick={onClose}
              className="press rounded-full px-4 py-2.5 text-[13px] font-medium text-ink-secondary hover:bg-black/[0.04]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="press rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {isPending ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

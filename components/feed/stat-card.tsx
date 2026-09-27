import { formatRateLabel, formatRateValue } from '@/lib/cricket-stats';
import { statHeadline, statTag, type FeedPost } from '@/lib/feed';

interface StatCardProps {
  post: FeedPost;
}

/**
 * The stat card.
 *
 * Strictly presentational: every number arrives already derived from the post's
 * raw inputs, so this component never does arithmetic and can never disagree
 * with what was published.
 */
export function StatCard({ post }: StatCardProps) {
  const headline = statHeadline(post);
  const tag = statTag(post);

  if (!post.stats || !headline) {
    return (
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-card)] bg-neutral-900 sm:aspect-[16/11]">
        {post.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.imageUrl} alt="" className="size-full object-cover" />
        )}
      </div>
    );
  }

  const tiles = post.stats.role === 'BOWLER'
    ? [
        { label: 'Wickets', value: String(post.stats.wickets) },
        { label: 'Overs', value: post.stats.oversDisplay },
        { label: 'Runs', value: String(post.stats.runsConceded) },
        { label: 'Average', value: post.stats.wickets > 0 ? post.stats.average.toFixed(2) : '--' },
        { label: 'Dot Balls', value: String(post.stats.dotBalls) },
        { label: 'Maidens', value: String(post.stats.maidenOvers) },
      ]
    : [
        { label: 'Runs', value: String(post.stats.runs) },
        { label: 'Balls', value: String(post.stats.balls) },
        { label: '4s', value: String(post.stats.fours) },
        { label: '6s', value: String(post.stats.sixes) },
        { label: 'Dot Balls', value: String(post.stats.dotBalls) },
        { label: 'Boundaries', value: `${post.stats.boundaryPercent}%` },
      ];

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-card)] bg-neutral-950 sm:aspect-[16/11]">
      {post.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imageUrl}
          alt=""
          className="size-full object-cover opacity-70"
          loading="lazy"
        />
      ) : (
        <div
          aria-hidden
          className="size-full"
          style={{
            backgroundImage:
              'radial-gradient(120% 80% at 50% 0%, #2b2b30 0%, #131315 55%, #0a0a0b 100%)',
          }}
        />
      )}

      {/* One scrim, weighted to the bottom where the data lives. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.72) 38%, rgba(0,0,0,0.18) 68%, rgba(0,0,0,0.34) 100%)',
        }}
      />

      <div className="absolute inset-0 flex flex-col justify-between p-5 text-white sm:p-6">
        {/* Role pill: lighter material draws the eye to what the card is. */}
        {tag && (
          <div className="flex justify-end">
            <span className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-semibold tracking-[0.02em] text-white backdrop-blur-md">
              {tag}
            </span>
          </div>
        )}

        <div>
          {/* Headline: runs off the bat, or wickets/runs for a bowler. */}
          <p className="type-metric text-white drop-shadow-sm">{headline}</p>

          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.075em] text-white/55">
              {formatRateLabel(post.stats)}
            </span>
            <span className="tabular text-[15px] font-semibold text-white/90">
              {formatRateValue(post.stats)}
            </span>
          </div>

          {/* Hairline-separated tile row. Divider weight carries the grouping
              so no boxes are needed. */}
          <dl className="mt-4 grid grid-cols-3 gap-y-3.5 border-t border-white/12 pt-3.5 sm:grid-cols-6 sm:gap-x-4">
            {tiles.map((tile) => (
              <div key={tile.label} className="min-w-0">
                <dt className="truncate text-[10px] font-medium uppercase tracking-[0.06em] text-white/50">
                  {tile.label}
                </dt>
                <dd className="tabular mt-0.5 text-[15px] font-semibold leading-none text-white">
                  {tile.value}
                </dd>
              </div>
            ))}
          </dl>

          {(post.matchTitle || post.matchResult) && (
            <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-t border-white/10 pt-3">
              {post.matchTitle && (
                <span className="truncate text-[13px] font-medium text-white/90">{post.matchTitle}</span>
              )}
              {post.matchResult && (
                <span className="text-[13px] text-white/55">{post.matchResult}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

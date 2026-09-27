import { notFound } from 'next/navigation';
import { Award, Play } from 'lucide-react';
import { requireProfessional } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { awardMedal, saveReview } from '../../actions';
import { TimestampFeedbackForm } from '@/components/timestamp-feedback-form';

const FIELD =
  'mt-2 w-full rounded-xl border border-black/10 p-3 text-[12px] outline-none transition focus:border-black/25';
const TEXTAREA = `${FIELD} min-h-32 font-normal`;

export default async function Review({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfessional();
  const { id } = await params;
  const supabase = await createClient();

  const { data: review } = await supabase
    .from('review_requests')
    .select('*,videos(original_filename)')
    .eq('id', id)
    .eq('professional_id', profile.id)
    .single();

  if (!review) notFound();

  return (
    <>
      <p className="eyebrow">Professional review</p>
      <h1 className="page-title mt-2">{review.videos?.original_filename}</h1>
      <p className="page-copy">
        {review.focus_area || 'General review'} — {review.notes || 'No additional notes.'}
      </p>

      <div className="mt-8 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <div className="surface overflow-hidden">
          <div className="relative grid aspect-video place-items-center bg-neutral-900">
            <Play className="size-9 fill-white text-white" />
            <span className="absolute bottom-4 left-4 text-[11px] text-white/70">Secure review player</span>
          </div>

          <form action={awardMedal} className="border-t border-hairline p-5">
            <input type="hidden" name="review_id" value={id} />
            <p className="text-[12px] font-semibold">Award a rare medal</p>

            <div className="mt-3 flex gap-2">
              <select name="medal" className="min-w-0 flex-1 rounded-xl border border-black/10 p-2.5 text-[11px]">
                <option value="PRECISION">Precision</option>
                <option value="PROGRESS">Progress</option>
                <option value="CONSISTENCY">Consistency</option>
                <option value="CRAFT">Craft</option>
              </select>
              <button className="quiet-button px-3" aria-label="Award medal">
                <Award className="size-3.5" />
              </button>
            </div>

            <input
              name="note"
              className="mt-2 w-full rounded-xl border border-black/10 p-2.5 text-[11px]"
              placeholder="A concise note (optional)"
            />
          </form>

          <TimestampFeedbackForm reviewId={id} />
        </div>

        <form action={saveReview} className="surface p-6 sm:p-7">
          <input type="hidden" name="review_id" value={id} />

          <div className="grid gap-5 sm:grid-cols-[120px_1fr]">
            <label className="text-[12px] font-semibold">
              Overall score
              <input
                name="overall_score"
                type="number"
                min="0"
                max="10"
                step=".1"
                defaultValue={review.overall_score || ''}
                className={`${FIELD} tabular text-[18px] font-semibold tracking-tight`}
              />
            </label>

            <label className="text-[12px] font-semibold">
              Summary
              <textarea
                name="summary"
                defaultValue={review.summary || ''}
                className={`${TEXTAREA} min-h-20`}
                placeholder="The clearest takeaway from this review."
              />
            </label>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <label className="text-[12px] font-semibold">
              Strengths
              <textarea
                name="strengths"
                defaultValue={review.strengths?.join('\n') || ''}
                className={TEXTAREA}
                placeholder="One point per line"
              />
            </label>

            <label className="text-[12px] font-semibold">
              Improvements
              <textarea
                name="improvements"
                defaultValue={review.improvements?.join('\n') || ''}
                className={TEXTAREA}
                placeholder="One point per line"
              />
            </label>

            <label className="text-[12px] font-semibold">
              Recommendations
              <textarea
                name="recommendations"
                defaultValue={review.recommendations?.join('\n') || ''}
                className={TEXTAREA}
                placeholder="One point per line"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button name="submit" value="false" className="quiet-button">
              Save draft
            </button>
            <button name="submit" value="true" className="primary-button">
              Submit review
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

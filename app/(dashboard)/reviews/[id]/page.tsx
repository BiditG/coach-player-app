import { notFound } from 'next/navigation';
import { CheckCircle2, Clock3 } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

type ReviewRow = {
  status: string;
  focus_area: string | null;
  overall_score: number | null;
  summary: string | null;
  strengths: string[] | null;
  improvements: string[] | null;
  videos: { original_filename: string }[] | null;
};

function titleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function ReviewDetail({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireUser();
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('review_requests')
    .select('*,videos(original_filename)')
    .eq('id', id)
    .eq('requester_id', profile.id)
    .single();

  if (!data) notFound();

  const review = data as ReviewRow;
  const isFinished = review.status === 'COMPLETED';
  const video = review.videos?.[0];

  return (
    <>
      <p className="eyebrow">Review request</p>
      <h1 className="page-title mt-2">{video?.original_filename || 'Video review'}</h1>
      <p className="page-copy">
        Professional review · {review.focus_area || 'General review'}
      </p>

      {!isFinished ? (
        <div className="surface mt-8 p-7">
          <Clock3 className="size-5 text-neutral-400" />
          <h2 className="section-title mt-5">{titleCase(review.status)}</h2>
          <p className="mt-2 text-[13px] leading-6 text-neutral-500">
            Your request is safely in the review flow. We&apos;ll notify you when there is an
            update.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-[.42fr_.58fr]">
          <div className="surface p-7">
            <CheckCircle2 className="size-5 text-emerald-600" />
            <p className="eyebrow mt-7">Overall score</p>
            <p className="mt-3 text-6xl font-semibold tracking-[-0.07em] tabular">
              {review.overall_score ?? '—'}
            </p>
            <p className="mt-2 text-[12px] text-neutral-500">out of 10</p>
          </div>

          <div className="surface p-7">
            <p className="section-title">{review.summary || 'Your review is ready.'}</p>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-[12px] font-semibold">Strengths</p>
                <ul className="mt-3 space-y-2 text-[12px] leading-5 text-neutral-500">
                  {(review.strengths ?? []).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[12px] font-semibold">To improve</p>
                <ul className="mt-3 space-y-2 text-[12px] leading-5 text-neutral-500">
                  {(review.improvements ?? []).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

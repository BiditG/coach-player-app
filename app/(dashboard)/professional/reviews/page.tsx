import Link from 'next/link';
import { ArrowRight, CirclePlay, Clock3, FileCheck2 } from 'lucide-react';
import { requireProfessional } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

type QueueReview = {
  id: string;
  status: string;
  created_at: string;
  parent_review_id: string | null;
  videos: { original_filename: string; duration_seconds: number | null }[] | null;
  professional_services: { gig_title: string }[] | null;
  orders: { delivery_due_at: string | null }[] | null;
};

export default async function CoachReviews() {
  const coach = await requireProfessional();
  const db = await createClient();
  const { data } = await db.from('review_requests')
    .select('id,status,created_at,parent_review_id,videos(original_filename,duration_seconds),professional_services(gig_title),orders(delivery_due_at)')
    .eq('professional_id', coach.id)
    .order('created_at', { ascending: false });
  const reviews = (data || []) as QueueReview[];
  const pending = reviews.filter(review => review.status === 'REQUESTED');
  const active = reviews.filter(review => ['ACCEPTED', 'IN_REVIEW'].includes(review.status));
  const complete = reviews.filter(review => review.status === 'COMPLETED');

  return <div>
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow">Coach workspace</p><h1 className="page-title mt-2">Your review queue.</h1><p className="page-copy">Open a player&apos;s footage and start explaining what matters.</p></div>
      <div className="rounded-2xl bg-neutral-900 px-4 py-3 text-white"><p className="text-2xl font-semibold tracking-tight">{pending.length}</p><p className="text-xs text-white/65">waiting for you</p></div>
    </header>
    <QueueSection title="Waiting for you" description="New player footage is ready to review." icon={CirclePlay} reviews={pending} action="Start review" />
    <QueueSection title="Continue where you left off" description="Open a saved draft and keep working." icon={Clock3} reviews={active} action="Continue" />
    <QueueSection title="Recently completed" description="Reports you have sent to players." icon={FileCheck2} reviews={complete.slice(0, 6)} action="View report" />
  </div>;
}

function QueueSection({ title, description, icon: Icon, reviews, action }: { title: string; description: string; icon: typeof CirclePlay; reviews: QueueReview[]; action: string }) {
  return <section className="mt-10"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-neutral-100"><Icon className="size-4 text-neutral-600" /></span><div><h2 className="section-title">{title}</h2><p className="mt-0.5 text-xs text-neutral-500">{description}</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-2">{reviews.length ? reviews.map(review => <ReviewCard key={review.id} review={review} action={action} />) : <div className="rounded-2xl border border-dashed border-black/[.12] bg-[#fafafa] px-5 py-7 text-sm text-neutral-500">Nothing here yet.</div>}</div></section>;
}

function ReviewCard({ review, action }: { review: QueueReview; action: string }) {
  const video = review.videos?.[0];
  const service = review.professional_services?.[0];
  const order = review.orders?.[0];
  const duration = video?.duration_seconds ? `${Math.floor(video.duration_seconds / 60)}m ${video.duration_seconds % 60}s` : 'Video ready';
  const due = order?.delivery_due_at ? `Due ${new Date(order.delivery_due_at).toLocaleDateString()}` : 'No delivery date';
  return <Link href={review.status === 'COMPLETED' ? `/reviews/${review.id}` : `/professional/reviews/${review.id}`} className="group rounded-2xl border border-black/[.08] bg-white p-5 shadow-[0_8px_24px_rgba(0,0,0,.035)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,.08)] motion-reduce:transition-none"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-sm font-semibold">{service?.gig_title || 'Cricket video review'}{review.parent_review_id ? ' · Follow-up' : ''}</p><p className="mt-1 truncate text-xs text-neutral-500">{video?.original_filename || 'Player footage'}</p></div><span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-semibold text-neutral-600">{duration}</span></div><div className="mt-7 flex items-center justify-between border-t border-black/[.06] pt-4"><span className="text-xs text-neutral-400">{due}</span><span className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-900">{action} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></span></div></Link>;
}

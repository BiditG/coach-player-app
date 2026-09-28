import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Check, Clock3, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth';
import { GigBookingModal } from '@/components/gig-booking-modal';

export default async function CoachGigPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); const { id } = await params; const db = await createClient();
  const [{ data: gig }, { data: packages }, { data: coach }] = await Promise.all([
    db.from('professional_services').select('*').eq('id', id).eq('is_published', true).single(),
    db.from('service_packages').select('id,name,description,price_cents').eq('service_id', id).eq('is_active', true).order('price_cents'),
    db.from('professional_profiles').select('rating,reviews_completed').eq('user_id', id).maybeSingle(),
  ]);
  if (!gig) notFound();
  const canBook = user.role !== 'PROFESSIONAL';
  return <div className="mx-auto max-w-5xl"><div className="surface overflow-hidden"><div className="relative aspect-[3/1] bg-[#e7ece7]">{gig.banner_url && <Image src={gig.banner_url} alt="Coach gig banner" fill className="object-cover" />}</div><div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1fr_360px]"><main><div className="flex items-center gap-2 text-xs text-neutral-500"><span className="grid size-8 place-items-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white">{gig.display_name?.[0]}</span>{gig.display_name} · Coach</div><div className="mt-5 flex items-start justify-between gap-4"><h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-[-.055em] sm:text-4xl">{gig.gig_title}</h1><span className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700"><Star className="size-3.5 fill-amber-500" />{coach?.rating || 'New'}</span></div><p className="mt-4 max-w-2xl text-sm leading-6 text-neutral-500">{gig.bio}</p><div className="mt-9"><p className="text-xs font-semibold">What you will receive</p><ul className="mt-3 grid gap-2 sm:grid-cols-2">{gig.review_includes?.map((item: string) => <li key={item} className="flex gap-2 text-xs text-neutral-600"><Check className="size-4 text-neutral-900" />{item}</li>)}</ul></div></main><aside className="rounded-[24px] border border-black/[.07] bg-[#fafafa] p-5"><p className="text-xs font-semibold">Personal video review</p><p className="mt-2 flex items-center gap-2 text-xs text-neutral-500"><Clock3 className="size-3.5" />Delivered within {gig.turnaround_days} days</p><p className="mt-5 text-xs leading-5 text-neutral-500">Upload your main video, add any coaching goals, then complete payment. You can add supporting videos and images before submitting.</p><div className="mt-6">{canBook ? <GigBookingModal serviceId={gig.id} packages={(packages || []) as { id: string; name: string; description: string; price_cents: number }[]} /> : <p className="rounded-xl bg-white p-3 text-xs text-neutral-500">Use a player account to book coaching.</p>}</div></aside></div></div></div>;
}

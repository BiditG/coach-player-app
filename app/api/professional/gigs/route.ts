import { NextResponse } from 'next/server';
import { requireProfessional } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const specialties = new Set(['Batting', 'Bowling', 'Fielding', 'Wicket-keeping']);

export async function POST(request: Request) {
  const coach = await requireProfessional(); const form = await request.formData(); const specialty = String(form.get('specialty') || ''); const youtubeUrl = String(form.get('youtube_url') || '').trim();
  const images = form.getAll('images').filter((value): value is File => value instanceof File && value.size > 0);
  if (!specialties.has(specialty)) return NextResponse.json({ error: 'Choose a valid specialty.' }, { status: 400 });
  if (youtubeUrl && !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(youtubeUrl)) return NextResponse.json({ error: 'Use a valid YouTube link.' }, { status: 400 });
  if (images.length > 3 || images.some(image => !imageTypes.has(image.type) || image.size > 5 * 1024 * 1024)) return NextResponse.json({ error: 'Add up to 3 JPG, PNG, or WebP images under 5 MB each.' }, { status: 400 });
  const supabase = await createClient(); const { count } = await supabase.from('professional_services').select('*', { count: 'exact', head: true }).eq('professional_id', coach.id);
  if ((count || 0) >= 3) return NextResponse.json({ error: 'You can create up to three gigs.' }, { status: 400 });
  const { data: gig, error } = await supabase.from('professional_services').insert({ professional_id: coach.id, display_name: String(form.get('display_name') || coach.full_name || ''), gig_title: String(form.get('gig_title') || ''), headline: specialty, bio: String(form.get('bio') || ''), specialties: [specialty], youtube_url: youtubeUrl || null, turnaround_days: Number(form.get('turnaround_days')) || 3, review_includes: ['Personalized coaching feedback'], is_published: true }).select('id,turnaround_days').single();
  if (error || !gig) return NextResponse.json({ error: 'Unable to create this gig.' }, { status: 400 });
  const galleryUrls: string[] = [];
  for (const image of images) { const extension = image.type === 'image/png' ? 'png' : image.type === 'image/webp' ? 'webp' : 'jpg'; const key = `${coach.id}/${gig.id}/work-${crypto.randomUUID()}.${extension}`; const { error: uploadError } = await supabase.storage.from('gig-images').upload(key, image, { contentType: image.type }); if (uploadError) return NextResponse.json({ error: 'Gig created, but an image could not be uploaded.' }, { status: 400 }); const { data } = supabase.storage.from('gig-images').getPublicUrl(key); galleryUrls.push(data.publicUrl); }
  if (galleryUrls.length) await supabase.from('professional_services').update({ gallery_urls: galleryUrls }).eq('id', gig.id).eq('professional_id', coach.id);
  const priceCents = Math.max(0, Math.round(Number(form.get('price_npr') || 0) * 100)); const { error: packageError } = await supabase.from('service_packages').insert({ service_id: gig.id, name: 'BASIC', description: 'Personalized coaching feedback', price_cents: priceCents, delivery_days: gig.turnaround_days });
  if (packageError) return NextResponse.json({ error: 'Gig created, but the price could not be saved.' }, { status: 400 });
  return NextResponse.json({ redirectUrl: `/professional/gigs/${gig.id}` });
}

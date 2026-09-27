import { NextResponse } from 'next/server';
import { requireProfessional } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request: Request) {
  const profile = await requireProfessional(); const form = await request.formData();
  const file = form.get('file'); const gigId = String(form.get('gig_id') || '');
  if (!gigId || !(file instanceof File) || !imageTypes.has(file.type) || file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Use a JPG, PNG, or WebP image under 5 MB.' }, { status: 400 });
  const supabase = await createClient(); const { data: gig } = await supabase.from('professional_services').select('gallery_urls').eq('id', gigId).eq('professional_id', profile.id).single();
  const gallery = gig?.gallery_urls || []; if (gallery.length >= 3) return NextResponse.json({ error: 'A gig can have up to three work images.' }, { status: 400 });
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'; const key = `${profile.id}/${gigId}/work-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from('gig-images').upload(key, file, { contentType: file.type });
  if (uploadError) return NextResponse.json({ error: 'Unable to upload work image.' }, { status: 400 });
  const { data: url } = supabase.storage.from('gig-images').getPublicUrl(key); const nextGallery = [...gallery, url.publicUrl];
  const { error } = await supabase.from('professional_services').update({ gallery_urls: nextGallery }).eq('id', gigId).eq('professional_id', profile.id);
  if (error) return NextResponse.json({ error: 'Unable to add this image to your gig.' }, { status: 400 });
  return NextResponse.json({ galleryUrls: nextGallery });
}

export async function DELETE(request: Request) {
  const profile = await requireProfessional(); const { gigId, imageUrl } = await request.json(); const supabase = await createClient();
  const { data: gig } = await supabase.from('professional_services').select('gallery_urls').eq('id', gigId).eq('professional_id', profile.id).single();
  if (!gig?.gallery_urls?.includes(imageUrl)) return NextResponse.json({ error: 'Image not found.' }, { status: 404 });
  const nextGallery = gig.gallery_urls.filter((url: string) => url !== imageUrl);
  const { error } = await supabase.from('professional_services').update({ gallery_urls: nextGallery }).eq('id', gigId).eq('professional_id', profile.id);
  if (error) return NextResponse.json({ error: 'Unable to remove image.' }, { status: 400 });
  return NextResponse.json({ galleryUrls: nextGallery });
}

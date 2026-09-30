import { NextResponse } from 'next/server';
import { requireProfessional } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const imageTypes = new Set(['image/jpeg','image/png','image/webp']);
export async function POST(request: Request) {
  const profile = await requireProfessional(); const form = await request.formData(); const file = form.get('file');
  if (!(file instanceof File) || !imageTypes.has(file.type)) return NextResponse.json({ error:'Use a JPG, PNG, or WebP banner image.' }, { status:400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error:'Banner image must be under 5 MB.' }, { status:400 });
  const gigId=String(form.get('gig_id')||''); if(!gigId)return NextResponse.json({error:'Save the gig before adding a banner.'},{status:400});
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const key = `${profile.id}/${gigId}/${crypto.randomUUID()}.${extension}`;
  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage.from('gig-images').upload(key, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error:'Unable to upload banner to image storage.' }, { status:400 });
  const { data: publicUrl } = supabase.storage.from('gig-images').getPublicUrl(key);
  const bannerUrl = publicUrl.publicUrl; const { error } = await supabase.from('professional_services').update({banner_url:bannerUrl}).eq('id',gigId).eq('professional_id',profile.id);
  if (error) return NextResponse.json({ error:'Unable to attach this banner to the selected gig.' },{status:400});
  return NextResponse.json({ bannerUrl });
}

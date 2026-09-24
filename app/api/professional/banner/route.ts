import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { requireProfessional } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const imageTypes = new Set(['image/jpeg','image/png','image/webp']);
export async function POST(request: Request) {
  const profile = await requireProfessional(); const form = await request.formData(); const file = form.get('file');
  if (!(file instanceof File) || !imageTypes.has(file.type)) return NextResponse.json({ error:'Use a JPG, PNG, or WebP banner image.' }, { status:400 });
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error:'Banner image must be under 5 MB.' }, { status:400 });
  const extension = path.extname(file.name).toLowerCase() || '.jpg'; const key = `${crypto.randomUUID()}${extension}`;
  const directory = path.join(process.cwd(), 'public', 'uploads', 'banners'); await mkdir(directory,{recursive:true}); await writeFile(path.join(directory,key),Buffer.from(await file.arrayBuffer()));
  const gigId=String(form.get('gig_id')||''); if(!gigId)return NextResponse.json({error:'Save the gig before adding a banner.'},{status:400});
  const bannerUrl = `/uploads/banners/${key}`; const supabase = await createClient(); const { error } = await supabase.from('professional_services').update({banner_url:bannerUrl}).eq('id',gigId).eq('professional_id',profile.id);
  if (error) return NextResponse.json({ error:'Unable to attach this banner to the selected gig.' },{status:400});
  return NextResponse.json({ bannerUrl });
}

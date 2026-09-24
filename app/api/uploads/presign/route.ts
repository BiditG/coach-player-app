import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const allowedTypes = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const maxBytes = Number(process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE_MB || 500) * 1024 * 1024;

// Local development storage. Files live under public/uploads and are served by Next.js.
// Replace this route with the R2 adapter only when remote storage is required.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const form = await request.formData(); const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a video file first.' }, { status: 400 });
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: 'Use an MP4, MOV, or WebM video.' }, { status: 400 });
  if (file.size > maxBytes) return NextResponse.json({ error: `Video must be under ${process.env.NEXT_PUBLIC_MAX_VIDEO_SIZE_MB || 500} MB.` }, { status: 400 });
  const extension = path.extname(file.name).toLowerCase() || '.mp4'; const key = `${crypto.randomUUID()}${extension}`;
  const directory = path.join(process.cwd(), 'public', 'uploads'); await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, key), Buffer.from(await file.arrayBuffer()));
  const supabase = await createClient();
  const { data, error } = await supabase.from('videos').insert({ user_id:user.id, original_filename:file.name, storage_key:key, mime_type:file.type, file_size:file.size, status:'READY', thumbnail_url:null }).select('id,original_filename').single();
  if (error) return NextResponse.json({ error: 'Video saved locally but metadata could not be created.' }, { status: 500 });
  return NextResponse.json({ video:data, localUrl:`/uploads/${key}` }, { status: 201 });
}

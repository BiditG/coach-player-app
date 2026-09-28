import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { r2Ready, signR2Upload } from '@/lib/r2';

const videoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
export async function POST(request: Request) { const user = await getCurrentUser(); if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); if (!r2Ready()) return NextResponse.json({ error: 'Cloudflare R2 is not configured.' }, { status: 503 }); const body = await request.json(); const name = typeof body.name === 'string' ? body.name : ''; const type = typeof body.type === 'string' ? body.type : ''; const size = Number(body.size); if (!name || !videoTypes.has(type) || !Number.isFinite(size) || size < 1 || size > 500 * 1024 * 1024) return NextResponse.json({ error: 'Use an MP4, MOV, or WebM video under 500 MB.' }, { status: 400 }); const ext = name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp4'; const key = `videos/${user.id}/${crypto.randomUUID()}.${ext}`; return NextResponse.json({ key, uploadUrl: await signR2Upload(key, type) }); }

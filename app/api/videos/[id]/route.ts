import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const user=await getCurrentUser();if(!user)return new Response(null,{status:401});const {id}=await params;const db=await createClient();
 const {data:video}=await db.from('videos').select('id,user_id,storage_key,mime_type,is_public').eq('id',id).single();
 if(!video)return new Response(null,{status:404});
 const {data:viewer}=await db.from('profiles').select('role').eq('id',user.id).single();
 if(!video.is_public&&video.user_id!==user.id&&viewer?.role!=='ADMIN'){
  const [{data:review},{data:analysis}]=await Promise.all([
   db.from('review_requests').select('id').eq('video_id',id).eq('professional_id',user.id).limit(1).maybeSingle(),
   db.from('analysis_orders').select('id').eq('video_id',id).eq('professional_id',user.id).limit(1).maybeSingle(),
  ]);
  if(!review&&!analysis)return new Response(null,{status:404});
 }
 if(video.storage_key.startsWith('supabase:')){
  const key=video.storage_key.slice('supabase:'.length);
  const {data,error}=await db.storage.from('player-videos').createSignedUrl(key,300);
  if(error||!data?.signedUrl)return new Response(null,{status:404});
  return NextResponse.redirect(data.signedUrl,{headers:{'Cache-Control':'private, no-store'}});
 }
 const key=path.basename(video.storage_key);if(key!==video.storage_key)return new Response(null,{status:404});
 let file=path.join(process.cwd(),'private','uploads',key);
 let info;try{info=await stat(file)}catch{file=path.join(process.cwd(),'public','uploads',key);try{info=await stat(file)}catch{return NextResponse.json({error:'Media unavailable.'},{status:404})}}
 const range=request.headers.get('range');let start=0,end=info.size-1;
 if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match)return new Response(null,{status:416});start=match[1]?Number(match[1]):0;end=match[2]?Number(match[2]):Math.min(start+4*1024*1024-1,end);if(start>info.size-1||end<start)return new Response(null,{status:416});end=Math.min(end,info.size-1)}
 const stream=Readable.toWeb(createReadStream(file,{start,end})) as ReadableStream;
 return new Response(stream,{status:range?206:200,headers:{'Content-Type':video.mime_type,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes','Cache-Control':'private, no-store',...(range?{'Content-Range':`bytes ${start}-${end}/${info.size}`}:{})}});
}

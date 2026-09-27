import { notFound } from 'next/navigation';
import { redirect } from 'next/navigation';
import { requireProfessional } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ReviewStudio } from '@/components/review-studio';
import type { Review, TimestampFeedback, ReviewAnnotation } from '@/lib/reviews/types';
export default async function ReviewPage({params}:{params:Promise<{id:string}>}){
 const coach=await requireProfessional();const {id}=await params;const db=await createClient();
 const {data:raw}=await db.from('review_requests').select('*,videos(original_filename)').eq('id',id).eq('professional_id',coach.id).single();if(!raw)notFound();
 const review=raw as Review & {videos:{original_filename:string}|null};
 if(review.status==='COMPLETED')redirect(`/reviews/${id}`);
 const [feedback,annotations,conversation]=await Promise.all([
  db.from('review_timestamp_feedback').select('*').eq('review_request_id',id).order('timestamp_seconds'),
  db.from('review_annotations').select('*').eq('review_id',id).order('created_at'),
  review.order_id?db.from('conversations').select('id').eq('order_id',review.order_id).maybeSingle():Promise.resolve({data:null}),
 ]);
 return <ReviewStudio review={review} videoUrl={`/api/videos/${review.video_id}`} filename={review.videos?.original_filename||'Cricket review'} feedback={(feedback.data||[]) as TimestampFeedback[]} annotations={(annotations.data||[]) as ReviewAnnotation[]} conversationId={conversation.data?.id||null}/>;
}

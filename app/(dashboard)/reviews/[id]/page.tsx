import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ReviewReport } from '@/components/review-report';
import { ReviewAttachments } from '@/components/review-attachments';
import { MedalAwardForm } from '@/components/medal-award-form';
import { ProgressComparison } from '@/components/progress-comparison';
import type { Review, RubricScore, TimestampFeedback, ReviewAnnotation, ReviewDrill, ProfessionalMedal, ReviewRating } from '@/lib/reviews/types';
export default async function ReviewDetail({params}:{params:Promise<{id:string}>}){
 const user=await requireUser();const {id}=await params;const db=await createClient();
 const {data:raw}=await db.from('review_requests').select('*,videos(original_filename),professional_services(gig_title,display_name)').eq('id',id).single();if(!raw||(raw.requester_id!==user.id&&raw.professional_id!==user.id))notFound();
 const review=raw as Review & {videos:{original_filename:string}|null;professional_services:{gig_title:string;display_name:string}|null};
 if(review.status!=='COMPLETED')return <div><p className="eyebrow">Your cricket review</p><h1 className="page-title mt-2">{review.professional_services?.gig_title||'Professional review'}</h1><div className="surface mt-8 p-7"><p className="text-sm font-semibold">{review.status.replaceAll('_',' ')}</p><p className="mt-2 text-sm text-neutral-500">Your coach is preparing the performance report. Return here when it is submitted.</p></div><div className="mt-5"><ReviewAttachments reviewId={review.id} mode={review.professional_id===user.id?'coach':'player'}/></div></div>;
 const [feedback,scores,annotations,drills,medal,rating,conversation]=await Promise.all([
  db.from('review_timestamp_feedback').select('*').eq('review_request_id',id).order('timestamp_seconds'),
  db.from('review_rubric_scores').select('*').eq('review_id',id).order('sort_order'),
  db.from('review_annotations').select('*').eq('review_id',id),
  db.from('review_drills').select('*').eq('review_id',id).order('sort_order'),
  db.from('professional_review_medals').select('*').eq('review_id',id).maybeSingle(),
  db.from('review_ratings').select('*').eq('review_id',id).maybeSingle(),
  review.order_id?db.from('conversations').select('id').eq('order_id',review.order_id).maybeSingle():Promise.resolve({data:null}),
 ]);
 const {data:parent}=review.parent_review_id?await db.from('review_requests').select('id,video_id,review_rubric_scores(*)').eq('id',review.parent_review_id).eq('status','COMPLETED').single():{data:null};
 return <>{review.professional_id===user.id&&!medal.data&&<MedalAwardForm reviewId={review.id}/>}<ReviewReport isCoach={review.professional_id===user.id} review={review} filename={review.videos?.original_filename||'Player video'} videoUrl={`/api/videos/${review.video_id}`} coachName={review.professional_services?.display_name||'Your coach'} playerName={review.requester_id===user.id?user.full_name||'Your performance':'Player'} serviceName={review.professional_services?.gig_title||'Professional cricket review'} feedback={(feedback.data||[]) as TimestampFeedback[]} scores={(scores.data||[]) as RubricScore[]} annotations={(annotations.data||[]) as ReviewAnnotation[]} drills={(drills.data||[]) as ReviewDrill[]} medal={medal.data as ProfessionalMedal|null} rating={rating.data as ReviewRating|null} conversationId={conversation.data?.id||null}/>{parent&&<ProgressComparison parentId={parent.id} parentVideoId={parent.video_id} currentVideoId={review.video_id} previous={(parent.review_rubric_scores||[]) as RubricScore[]} current={(scores.data||[]) as RubricScore[]}/>}</>;
}

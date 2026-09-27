'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireProfessional, requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { MEDALS, RUBRICS } from './rubrics';

const uuid = z.uuid();
const score = z.number().min(0).max(10).nullable();
const text = z.string().trim().max(4000);
const reviewDraft = z.object({
  reviewId:uuid, discipline:z.enum(Object.keys(RUBRICS) as [keyof typeof RUBRICS,...(keyof typeof RUBRICS)[]]),
  overallScore:score, summary:text, strongestArea:text, primaryFocus:text, closingNote:text,
  strengths:z.array(text).max(20), improvements:z.array(text).max(20), recommendations:z.array(text).max(20),
  actionPlan:z.object({duration_days:z.number().int().min(1).max(365),primary_focus:text,items:z.array(z.object({day:z.number().int().min(1).max(365),title:text,drill_id:uuid.optional()})).max(100)}),
  scores:z.array(z.object({category_key:z.string().min(1).max(80),category_name:z.string().min(1).max(100),sort_order:z.number().int(),enabled:z.boolean(),score,
    strength:text,improvement:text,recommendation:text})).max(40),
});
export type ReviewDraftInput = z.infer<typeof reviewDraft>;
async function coachReview(id:string) {
  const coach=await requireProfessional(); const db=await createClient();
  const {data:review}=await db.from('review_requests').select('id,status,requester_id,professional_id,order_id,video_id').eq('id',uuid.parse(id)).eq('professional_id',coach.id).single();
  if(!review || review.status==='COMPLETED' || review.status==='DECLINED') throw new Error('This review is unavailable for editing.');
  return {coach,db,review};
}
export async function saveReviewDraft(input:ReviewDraftInput) {
  const data=reviewDraft.parse(input); const {db,review}=await coachReview(data.reviewId);
  const {error}=await db.from('review_requests').update({discipline:data.discipline,overall_score:data.overallScore,summary:data.summary,strongest_area:data.strongestArea,primary_focus:data.primaryFocus,coach_closing_note:data.closingNote,
    strengths:data.strengths,improvements:data.improvements,recommendations:data.recommendations,action_plan:data.actionPlan,status:review.status==='REQUESTED'?'REQUESTED':'IN_REVIEW'}).eq('id',review.id);
  if(error) throw new Error(error.message);
  if(data.scores.length){const {error:rubricError}=await db.from('review_rubric_scores').upsert(data.scores.map(item=>({...item,review_id:review.id})),{onConflict:'review_id,category_key'});if(rubricError)throw new Error(rubricError.message);}
  revalidatePath(`/professional/reviews/${review.id}`);
  return {savedAt:new Date().toISOString()};
}
export async function submitProfessionalReview(input:ReviewDraftInput) {
  const data=reviewDraft.parse(input);
  if(!data.summary || !data.strengths.some(Boolean) || !(data.improvements.some(Boolean)||data.recommendations.some(Boolean))) throw new Error('Add a summary, strength, and improvement or recommendation before submitting.');
  const {review:existing}=await coachReview(data.reviewId);
  if(existing.status==='REQUESTED')throw new Error('Accept the review before submitting.');
  await saveReviewDraft(data);
  const {db,review}=await coachReview(data.reviewId);
  const {error}=await db.from('review_requests').update({status:'COMPLETED'}).eq('id',review.id);
  if(error) throw new Error(error.message);
  revalidatePath(`/reviews/${review.id}`); revalidatePath('/professional');
  return {submitted:true};
}
export async function acceptProfessionalReview(reviewId:string){const {db,review}=await coachReview(reviewId);if(review.status!=='REQUESTED')throw new Error('Review already accepted.');const {error}=await db.from('review_requests').update({status:'ACCEPTED'}).eq('id',review.id);if(error)throw new Error(error.message);revalidatePath(`/professional/reviews/${review.id}`)}
const feedbackInput=z.object({reviewId:uuid,timestamp:z.number().min(0).max(86400),title:text.min(1),feedback:text.min(1),type:z.enum(['POSITIVE','IMPROVEMENT','IMPORTANT','GENERAL']),category:text,explanation:text,correction:text,drill:text});
export async function addReviewFeedback(input:z.infer<typeof feedbackInput>) {
  const data=feedbackInput.parse(input);const {db,coach}=await coachReview(data.reviewId);
  const {data:row,error}=await db.from('review_timestamp_feedback').insert({review_request_id:data.reviewId,professional_id:coach.id,timestamp_seconds:data.timestamp,title:data.title,feedback:data.feedback,feedback_type:data.type,category:data.category||null,explanation:data.explanation||null,correction:data.correction||null,drill_recommendation:data.drill||null}).select('*').single();
  if(error)throw new Error(error.message);revalidatePath(`/professional/reviews/${data.reviewId}`);return row;
}
const annotationInput=z.object({reviewId:uuid,feedbackId:uuid.nullable(),attachmentId:uuid.nullable().optional(),timestamp:z.number().min(0).max(86400).nullable(),objects:z.array(z.object({type:z.enum(['arrow','line','circle','rectangle','freehand','text']),x1:z.number().min(0).max(1),y1:z.number().min(0).max(1),x2:z.number().min(0).max(1),y2:z.number().min(0).max(1),points:z.array(z.number().min(0).max(1)).optional(),label:text.optional()})).max(100)});
export async function saveReviewAnnotation(input:z.infer<typeof annotationInput>){const data=annotationInput.parse(input);const {db}=await coachReview(data.reviewId);if(data.attachmentId){const {data:attachment}=await db.from('review_attachments').select('id').eq('id',data.attachmentId).eq('review_id',data.reviewId).eq('kind','IMAGE').single();if(!attachment)throw new Error('Image unavailable.');}const {data:row,error}=await db.from('review_annotations').insert({review_id:data.reviewId,feedback_id:data.feedbackId,attachment_id:data.attachmentId||null,timestamp_seconds:data.timestamp,annotation_json:{objects:data.objects}}).select('*').single();if(error)throw new Error(error.message);return row;}
const drillInput=z.object({reviewId:uuid,drillId:uuid.nullable(),title:text.min(1),instructions:text.min(1),frequency:text,sets:z.number().int().min(1).max(100).nullable(),reps:z.number().int().min(1).max(1000).nullable()});
export async function assignReviewDrill(input:z.infer<typeof drillInput>){const data=drillInput.parse(input);const {db,coach}=await coachReview(data.reviewId);if(data.drillId){const {data:drill}=await db.from('coach_drills').select('id').eq('id',data.drillId).or(`coach_id.eq.${coach.id},is_public.eq.true`).single();if(!drill)throw new Error('Drill unavailable.');}const {error}=await db.from('review_drills').insert({review_id:data.reviewId,drill_id:data.drillId,title:data.title,instructions:data.instructions,frequency:data.frequency,target_sets:data.sets,target_reps:data.reps});if(error)throw new Error(error.message);revalidatePath(`/professional/reviews/${data.reviewId}`);}
export async function saveCoachDrill(input:{title:string;instructions:string;category:string}){const coach=await requireProfessional();const data=z.object({title:text.min(1),instructions:text.min(1),category:text}).parse(input);const db=await createClient();const {error}=await db.from('coach_drills').insert({coach_id:coach.id,...data});if(error)throw new Error(error.message);}
export async function saveFeedbackSnippet(input:{title:string;category:string;content:string}){const coach=await requireProfessional();const data=z.object({title:text.min(1),category:text,content:text.min(1)}).parse(input);const db=await createClient();const {error}=await db.from('coach_feedback_snippets').insert({coach_id:coach.id,...data});if(error)throw new Error(error.message);}
export async function saveRubricTemplate(input:{title:string;discipline:string;categories:string[]}){const coach=await requireProfessional();const data=z.object({title:text.min(1),discipline:z.enum(Object.keys(RUBRICS) as [keyof typeof RUBRICS,...(keyof typeof RUBRICS)[]]),categories:z.array(text.min(1)).min(1).max(40)}).parse(input);const db=await createClient();const {error}=await db.from('coach_rubric_templates').insert({coach_id:coach.id,title:data.title,discipline:data.discipline,categories:data.categories});if(error)throw new Error(error.message);}
export async function awardReviewMedal(input:{reviewId:string;medalType:string;reason:string}){const coach=await requireProfessional();const data=z.object({reviewId:uuid,medalType:z.enum(MEDALS),reason:text.min(10)}).parse(input);const db=await createClient();const {data:review}=await db.from('review_requests').select('id,requester_id,status').eq('id',data.reviewId).eq('professional_id',coach.id).single();if(!review||review.status!=='COMPLETED')throw new Error('Submit the report before awarding a medal.');const {error}=await db.from('professional_review_medals').insert({review_id:review.id,coach_id:coach.id,player_id:review.requester_id,medal_type:data.medalType,reason:data.reason});if(error)throw new Error(error.message);revalidatePath(`/reviews/${review.id}`);}
export async function markReviewDrill(id:string,completed:boolean){const player=await requireUser();const db=await createClient();const {error}=await db.from('review_drills').update({completed}).eq('id',uuid.parse(id)).in('review_id',(await db.from('review_requests').select('id').eq('requester_id',player.id).eq('status','COMPLETED')).data?.map(r=>r.id)||[]);if(error)throw new Error(error.message);}
export async function rateProfessionalReview(input:{reviewId:string;overall:number;helpfulness:number;clarity:number;wouldBookAgain:boolean;comment:string}){const player=await requireUser();const data=z.object({reviewId:uuid,overall:z.number().int().min(1).max(5),helpfulness:z.number().int().min(1).max(5),clarity:z.number().int().min(1).max(5),wouldBookAgain:z.boolean(),comment:text}).parse(input);const db=await createClient();const {data:review}=await db.from('review_requests').select('id,status,order_id').eq('id',data.reviewId).eq('requester_id',player.id).single();if(!review||review.status!=='COMPLETED'||!review.order_id)throw new Error('Only a completed purchased review can be rated.');const {error}=await db.from('review_ratings').insert({review_id:review.id,user_id:player.id,overall_rating:data.overall,helpfulness_rating:data.helpfulness,clarity_rating:data.clarity,would_book_again:data.wouldBookAgain,comment:data.comment||null});if(error)throw new Error(error.message);revalidatePath(`/reviews/${review.id}`);}

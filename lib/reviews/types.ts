import type { Discipline } from './rubrics';
export interface Review { id:string; order_id:string|null; parent_review_id:string|null; requester_id:string; professional_id:string; gig_id:string|null; video_id:string; status:string; discipline:Discipline; focus_area:string|null; notes:string|null; overall_score:number|null; summary:string|null; strongest_area:string|null; primary_focus:string|null; coach_closing_note:string|null; strengths:string[]; improvements:string[]; recommendations:string[]; action_plan:ActionPlan; created_at:string; completed_at:string|null; }
export interface RubricScore { id:string; review_id:string; category_key:string; category_name:string; sort_order:number; enabled:boolean; score:number|null; strength:string|null; improvement:string|null; recommendation:string|null; }
export interface TimestampFeedback { id:string; review_request_id:string; timestamp_seconds:number; title:string; feedback:string; feedback_type:string; category:string|null; explanation:string|null; correction:string|null; drill_recommendation:string|null; }
export interface AnnotationObject { type:'arrow'|'line'|'circle'|'rectangle'|'freehand'|'text'; x1:number; y1:number; x2:number; y2:number; points?:number[]; label?:string; }
export interface ReviewAnnotation { id:string; review_id:string; feedback_id:string|null; attachment_id:string|null; timestamp_seconds:number|null; annotation_json:{objects:AnnotationObject[]}; }
export interface CoachDrill { id:string; coach_id:string|null; title:string; category:string|null; purpose:string|null; instructions:string; sets:number|null; reps:number|null; duration_minutes:number|null; equipment:string|null; }
export interface ReviewDrill { id:string; review_id:string; drill_id:string|null; title:string; instructions:string; frequency:string|null; target_sets:number|null; target_reps:number|null; completed:boolean; player_notes:string|null; }
export interface ActionPlan { duration_days:number; primary_focus:string; items:{day:number;title:string;drill_id?:string}[]; }
export interface ProfessionalMedal { id:string; review_id:string; coach_id:string; player_id:string; medal_type:string; reason:string; awarded_at:string; }
export interface ReviewRating { review_id:string; user_id:string; overall_rating:number; helpfulness_rating:number; clarity_rating:number; would_book_again:boolean; comment:string|null; }
export interface ReviewAttachment { id:string; review_id:string; kind:'IMAGE'|'VIDEO'|'AUDIO'|'COACH_VIDEO'; storage_key:string; mime_type:string; duration_seconds:number|null; }
export type ReviewMedia = ReviewAttachment;
export type ReviewActionPlan = ActionPlan;
export interface ReviewFollowup { id:string; parent_review_id:string; order_id:string; requester_id:string; professional_id:string; }

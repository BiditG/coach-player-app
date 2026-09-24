export type AppRole = 'USER' | 'PROFESSIONAL' | 'ADMIN';
export type AnalysisType = 'AI' | 'PROFESSIONAL';
export type OrderStatus = 'DRAFT' | 'SUBMITTED' | 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export interface Profile { id: string; email: string; full_name: string | null; avatar_url: string | null; role: AppRole; }
export interface Video { id: string; original_filename: string; duration_seconds: number | null; status: string; created_at: string; thumbnail_url: string | null; }
export interface AnalysisOrder { id: string; title: string; analysis_type: AnalysisType; status: OrderStatus; created_at: string; video_id: string; notes: string | null; }
export interface Analysis { id: string; order_id: string; overall_score: number | null; summary: string | null; strengths: string[]; improvements: string[]; report_json: Record<string, unknown>; }
export interface ProfessionalProfile { id: string; user_id: string; headline: string | null; approved: boolean; specialties: string[]; }
export interface ProfessionalAssignment { id: string; analysis_order_id: string; professional_id: string; status: string; }
export interface TimestampComment { id: string; analysis_id: string; timestamp_seconds: number; title: string; comment: string; comment_type: string; }
export interface Notification { id: string; title: string; message: string; type: string; read: boolean; related_order_id: string | null; }
export type ReviewRequestStatus = 'REQUESTED' | 'ACCEPTED' | 'IN_REVIEW' | 'COMPLETED' | 'DECLINED';
export interface ProfessionalService { id: string; professional_id: string; gig_title: string; display_name: string; bio: string; photo_url: string | null; banner_url: string | null; headline: string; specialties: string[]; years_experience: number; turnaround_days: number; review_includes: string[]; is_published: boolean; }
export interface ReviewRequest { id: string; requester_id: string; professional_id: string; video_id: string; status: ReviewRequestStatus; focus_area: string | null; notes: string | null; overall_score: number | null; summary: string | null; strengths: string[]; improvements: string[]; recommendations: string[]; }

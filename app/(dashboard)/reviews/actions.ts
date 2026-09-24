'use server';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function sendReviewRequest(formData: FormData) {
  const profile = await requireUser(); const supabase = await createClient();
  if (profile.role === 'PROFESSIONAL') throw new Error('Professional accounts cannot submit review requests. Switch to a player account to request feedback.');
  const professionalId = String(formData.get('professional_id')); const gigId = String(formData.get('gig_id')); const videoId = String(formData.get('video_id'));
  const focus = String(formData.get('focus_area') || ''); const notes = String(formData.get('notes') || '');
  if (!professionalId || !gigId || !videoId) throw new Error('Choose a gig and video before sending your request.');
  const { error } = await supabase.from('review_requests').insert({ requester_id: profile.id, professional_id: professionalId, gig_id: gigId, video_id: videoId, focus_area: focus || null, notes: notes || null });
  if (error) throw new Error('Unable to send this review request.');
  redirect('/reviews');
}

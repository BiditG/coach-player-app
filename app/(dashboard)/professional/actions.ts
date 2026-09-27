'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireProfessional } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const lines = (value: FormDataEntryValue | null): string[] =>
  String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

export async function saveReview(formData: FormData) {
  const profile = await requireProfessional();
  const supabase = await createClient();
  const id = String(formData.get('review_id'));
  const isComplete = formData.get('submit') === 'true';

  const { error } = await supabase
    .from('review_requests')
    .update({
      status: isComplete ? 'COMPLETED' : 'IN_REVIEW',
      overall_score: Number(formData.get('overall_score')) || null,
      summary: String(formData.get('summary') || ''),
      strengths: lines(formData.get('strengths')),
      improvements: lines(formData.get('improvements')),
      recommendations: lines(formData.get('recommendations')),
      completed_at: isComplete ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('professional_id', profile.id);

  if (error) throw new Error('Unable to save review.');

  const feedback = String(formData.get('timestamp_feedback') || '').trim();

  if (feedback) {
    await supabase.from('review_timestamp_feedback').insert({
      review_request_id: id,
      professional_id: profile.id,
      timestamp_seconds: Number(formData.get('timestamp_seconds')) || 0,
      title: String(formData.get('timestamp_title') || 'Feedback'),
      feedback,
      feedback_type: String(formData.get('feedback_type') || 'GENERAL'),
    });
  }

  if (isComplete) {
    const { data: review } = await supabase
      .from('review_requests')
      .select('requester_id')
      .eq('id', id)
      .single();

    if (review) {
      await supabase.from('notifications').insert({
        user_id: review.requester_id,
        title: 'Your professional review is ready',
        message: 'Your reviewer has completed your feedback.',
        type: 'REVIEW_COMPLETE',
      });
    }
  }

  revalidatePath(`/professional/reviews/${id}`);
  redirect('/professional');
}

export async function awardMedal(formData: FormData) {
  const profile = await requireProfessional();
  const supabase = await createClient();
  const reviewId = String(formData.get('review_id'));
  const medal = String(formData.get('medal'));
  const note = String(formData.get('note') || '');

  const { data: review } = await supabase
    .from('review_requests')
    .select('video_id')
    .eq('id', reviewId)
    .eq('professional_id', profile.id)
    .single();

  if (!review) throw new Error('Review unavailable.');

  const { error } = await supabase
    .from('video_medals')
    .insert({ video_id: review.video_id, professional_id: profile.id, medal, note: note || null });

  if (error) throw new Error('Unable to award medal.');

  revalidatePath(`/professional/reviews/${reviewId}`);
}

export async function addTimestampFeedback(formData: FormData) {
  const profile = await requireProfessional();
  const supabase = await createClient();
  const reviewId = String(formData.get('review_id'));

  const { error } = await supabase.from('review_timestamp_feedback').insert({
    review_request_id: reviewId,
    professional_id: profile.id,
    timestamp_seconds: Number(formData.get('timestamp_seconds')) || 0,
    title: String(formData.get('title') || 'Feedback'),
    feedback: String(formData.get('feedback') || ''),
    feedback_type: String(formData.get('feedback_type') || 'GENERAL'),
  });

  if (error) throw new Error('Unable to add timestamp feedback.');

  revalidatePath(`/professional/reviews/${reviewId}`);
}

export async function updateService(formData: FormData) {
  const profile = await requireProfessional();
  const supabase = await createClient();

  const { error } = await supabase
    .from('professional_services')
    .upsert(
      {
        professional_id: profile.id,
        display_name: String(formData.get('display_name') || ''),
        headline: String(formData.get('headline') || ''),
        bio: String(formData.get('bio') || ''),
        specialties: String(formData.get('specialties') || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        years_experience: Number(formData.get('years_experience')) || 0,
        turnaround_days: Number(formData.get('turnaround_days')) || 3,
        review_includes: lines(formData.get('review_includes')),
        is_published: formData.get('is_published') === 'on',
      },
      { onConflict: 'professional_id' },
    );

  if (error) throw new Error('Unable to update service.');

  revalidatePath('/professional');
  revalidatePath('/professionals');
  redirect('/professional');
}

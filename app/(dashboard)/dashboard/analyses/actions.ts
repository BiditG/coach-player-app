'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function createAnalysis(formData: FormData) {
  const profile = await requireUser();
  const videoId = String(formData.get('video_id'));
  const isProfessional = String(formData.get('analysis_type')) === 'PROFESSIONAL';
  const analysisType = isProfessional ? 'PROFESSIONAL' : 'AI';
  const notes = String(formData.get('notes') || '');
  const supabase = await createClient();

  const { data: video } = await supabase
    .from('videos')
    .select('original_filename')
    .eq('id', videoId)
    .eq('user_id', profile.id)
    .single();

  if (!video) throw new Error('Video unavailable');

  const { data, error } = await supabase
    .from('analysis_orders')
    .insert({
      user_id: profile.id,
      video_id: videoId,
      analysis_type: analysisType,
      status: isProfessional ? 'SUBMITTED' : 'QUEUED',
      title: `${video.original_filename} review`,
      notes,
    })
    .select('id')
    .single();

  if (error || !data) throw new Error('Unable to create analysis');

  redirect(`/dashboard/analyses/${data.id}`);
}

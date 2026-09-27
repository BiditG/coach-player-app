'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function toggleVideoVisibility(formData: FormData) {
  const profile = await requireUser();
  const supabase = await createClient();
  const id = String(formData.get('video_id'));
  const next = formData.get('is_public') === 'true';

  const { error } = await supabase
    .from('videos')
    .update({ is_public: next })
    .eq('id', id)
    .eq('user_id', profile.id);

  if (error) throw new Error('Unable to update visibility.');

  revalidatePath('/dashboard/videos');
  revalidatePath('/feed');
}

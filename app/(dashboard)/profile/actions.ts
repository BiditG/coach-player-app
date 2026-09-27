'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function activateProfessionalMode() {
  const profile = await requireUser();

  if (profile.role === 'PROFESSIONAL' || profile.role === 'ADMIN') {
    redirect('/professional');
  }

  const supabase = await createClient();

  const { error } = await supabase.from('profiles').update({ role: 'PROFESSIONAL' }).eq('id', profile.id);

  if (error) {
    throw new Error('Unable to activate professional mode.');
  }

  await supabase
    .from('professional_profiles')
    .upsert({ user_id: profile.id, approved: true }, { onConflict: 'user_id' });

  revalidatePath('/profile');
  redirect('/professional');
}

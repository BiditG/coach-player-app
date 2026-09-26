import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AppRole, Profile } from '@/lib/types';

const DEMO_PROFILE: Profile = {
  id: 'demo-user-123',
  email: 'player@sprintnp.app',
  full_name: 'SprintNP Player',
  avatar_url: null,
  role: 'USER',
};

export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}

export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return DEMO_PROFILE;

    const supabase = await createClient();
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    return (data as Profile) || DEMO_PROFILE;
  } catch {
    return DEMO_PROFILE;
  }
}

export async function requireUser() {
  const profile = await getCurrentProfile();
  if (!profile) return DEMO_PROFILE;
  return profile;
}

export async function requireRole(...roles: AppRole[]) {
  const profile = await requireUser();
  if (!roles.includes(profile.role)) redirect('/feed');
  return profile;
}

export const requireProfessional = () => requireRole('PROFESSIONAL', 'ADMIN');
export const requireAdmin = () => requireRole('ADMIN');

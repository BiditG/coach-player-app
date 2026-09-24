import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AppRole, Profile } from '@/lib/types';

export async function getCurrentUser() { const supabase = await createClient(); const { data } = await supabase.auth.getUser(); return data.user; }
export async function getCurrentProfile(): Promise<Profile | null> { const user = await getCurrentUser(); if (!user) return null; const supabase = await createClient(); const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single(); return data as Profile | null; }
export async function requireUser() { const profile = await getCurrentProfile(); if (!profile) redirect('/login'); return profile; }
export async function requireRole(...roles: AppRole[]) { const profile = await requireUser(); if (!roles.includes(profile.role)) redirect('/dashboard'); return profile; }
export const requireProfessional = () => requireRole('PROFESSIONAL', 'ADMIN');
export const requireAdmin = () => requireRole('ADMIN');

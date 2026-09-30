import { redirect } from 'next/navigation';
import type { AppRole, Profile } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

export async function getCurrentUser() { const db = await createClient(); const { data } = await db.auth.getUser(); return data.user; }
export async function getCurrentProfile(): Promise<Profile | null> { const user = await getCurrentUser(); if (!user) return null; const db = await createClient(); const { data } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle(); return data as Profile | null; }
export async function requireUser(): Promise<Profile> { const profile = await getCurrentProfile(); if (!profile) redirect('/login'); return profile; }
export async function requireRole(...roles: AppRole[]): Promise<Profile> { const profile = await requireUser(); if (!roles.includes(profile.role)) redirect('/dashboard'); return profile; }
export const requireProfessional = () => requireRole('PROFESSIONAL', 'ADMIN');
export const requireAdmin = () => requireRole('ADMIN');

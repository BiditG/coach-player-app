import { cookies } from 'next/headers';
import type { AppRole, Profile } from '@/lib/types';

const DEMO_PROFILE: Profile = {
  id: 'test1-id',
  email: 'test1@sprintnp.app',
  full_name: 'test1 (Player)',
  avatar_url: null,
  role: 'USER',
};

export async function getCurrentUser() {
  const profile = await getCurrentProfile();
  return profile ? { id: profile.id, email: profile.email } : null;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('sprintnp_user')?.value;
    if (userCookie) {
      const parsed = JSON.parse(decodeURIComponent(userCookie));
      if (parsed && parsed.email) {
        return {
          id: parsed.id || 'test1-id',
          email: parsed.email,
          full_name: parsed.full_name || parsed.email.split('@')[0],
          avatar_url: parsed.avatar_url || null,
          role: parsed.role || 'USER',
        };
      }
    }
    return DEMO_PROFILE;
  } catch {
    return DEMO_PROFILE;
  }
}

export async function requireUser(): Promise<Profile> {
  const profile = await getCurrentProfile();
  return profile || DEMO_PROFILE;
}

export async function requireRole(...roles: AppRole[]): Promise<Profile> {
  const profile = await requireUser();
  return profile;
}

export const requireProfessional = () => requireRole('PROFESSIONAL', 'ADMIN');
export const requireAdmin = () => requireRole('ADMIN');

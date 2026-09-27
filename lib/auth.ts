import { cookies } from 'next/headers';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { AppRole, Profile, SessionIdentity } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/env';

/**
 * Session resolution.
 *
 * The app authenticates with Supabase's own session cookie, the same cookie
 * `proxy.ts` refreshes on every request. The previous implementation read a
 * hand-rolled `sprintnp_user` preview cookie as its primary source, which is
 * why authenticated pages kept failing: the preview cookie carried a fake id
 * that matches no `profiles` row, so every RLS-scoped query came back empty.
 *
 * Order of resolution:
 *   1. Supabase session cookie -> validated, and the profile is read from the
 *      `profiles` table. This is the only source trusted for real writes.
 *   2. Preview cookie -> local demo accounts only. Refused outright in
 *      production unless explicitly re-enabled, because it is unsigned.
 */

const PREVIEW_COOKIE = 'sprintnp_user';
const LOGIN_PATH = '/login';

function previewAuthEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_PREVIEW_AUTH === 'true') return true;
  if (process.env.NEXT_PUBLIC_PREVIEW_AUTH === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

function isAppRole(value: unknown): value is AppRole {
  return value === 'USER' || value === 'PROFESSIONAL' || value === 'ADMIN';
}

function normaliseRole(value: unknown): AppRole {
  return isAppRole(value) ? value : 'USER';
}

function profileFromRow(row: Record<string, unknown>): Profile {
  const email = typeof row.email === 'string' ? row.email : '';
  return {
    id: String(row.id ?? ''),
    email,
    full_name: typeof row.full_name === 'string' ? row.full_name : null,
    avatar_url: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    role: normaliseRole(row.role),
  };
}

/**
 * The local demo accounts. Their ids are not UUIDs, so they can never satisfy a
 * `profiles` foreign key - which is exactly why the feed falls back to a local
 * cache while preview auth is in use.
 */
const readPreviewCookie = cache(async (): Promise<Profile | null> => {
  if (!previewAuthEnabled()) return null;

  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(PREVIEW_COOKIE)?.value;
    if (!raw) return null;

    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (typeof parsed !== 'object' || parsed === null) return null;

    const record = parsed as Record<string, unknown>;
    if (typeof record.email !== 'string' || !record.email) return null;

    const name = typeof record.full_name === 'string' && record.full_name
      ? record.full_name
      : record.email.split('@')[0];

    return {
      id: typeof record.id === 'string' && record.id ? record.id : `preview-${record.email}`,
      email: record.email,
      full_name: name,
      avatar_url: typeof record.avatar_url === 'string' ? record.avatar_url : null,
      role: normaliseRole(record.role),
    };
  } catch {
    return null;
  }
});

async function readSupabaseIdentity(): Promise<Profile | null> {
  if (!hasSupabaseEnv()) return null;

  try {
    const supabase = await createClient();

    // getUser() re-validates the JWT with the Auth server rather than trusting
    // the cookie payload, and is the call that actually reflects a revoked
    // session.
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) return null;

    if (data) return profileFromRow(data as Record<string, unknown>);

    // A brand-new user whose `handle_new_user` trigger has not landed yet.
    // Synthesise the minimum shape so the session is still usable.
    return {
      id: user.id,
      email: user.email ?? '',
      full_name:
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : (user.email?.split('@')[0] ?? 'Player'),
      avatar_url: null,
      role: 'USER',
    };
  } catch {
    return null;
  }
}

/**
 * The resolved identity for this request, or null when nobody is signed in.
 * Deduped per request so a page with ten `requireUser()` calls still performs
 * a single session validation.
 */
export const getSessionIdentity = cache(async (): Promise<SessionIdentity | null> => {
  const supabaseProfile = await readSupabaseIdentity();

  if (supabaseProfile) {
    return { profile: supabaseProfile, source: 'supabase', isAuthenticated: true };
  }

  const previewProfile = await readPreviewCookie();

  if (previewProfile) {
    return { profile: previewProfile, source: 'preview', isAuthenticated: false };
  }

  return null;
});

/** Non-redirecting. Returns null instead of a demo profile for anonymous users. */
export async function getCurrentProfile(): Promise<Profile | null> {
  return (await getSessionIdentity())?.profile ?? null;
}

export async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  const identity = await getSessionIdentity();
  if (!identity) return null;
  return { id: identity.profile.id, email: identity.profile.email };
}

/** True when the identity came from a validated Supabase session. */
export async function hasRealSession(): Promise<boolean> {
  return (await getSessionIdentity())?.source === 'supabase';
}

export async function requireUser(): Promise<Profile> {
  const identity = await getSessionIdentity();

  if (!identity) {
    redirect(LOGIN_PATH);
  }

  return identity.profile;
}

export async function requireRole(...roles: AppRole[]): Promise<Profile> {
  const profile = await requireUser();

  if (!roles.includes(profile.role)) {
    redirect('/feed');
  }

  return profile;
}

export const requireProfessional = () => requireRole('PROFESSIONAL', 'ADMIN');
export const requireAdmin = () => requireRole('ADMIN');

'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { PREVIEW_COOKIE } from '@/lib/preview-auth';

/**
 * Sign out of both session sources.
 *
 * Clearing the Supabase session is what actually revokes access; the preview
 * cookie is cleared alongside it so a stale demo identity cannot linger and be
 * picked up on the next request.
 */
export async function signOut(): Promise<void> {
  if (getSupabaseEnv()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // Nothing to revoke if the session was already gone.
    }
  }

  try {
    const cookieStore = await cookies();
    cookieStore.delete(PREVIEW_COOKIE);
  } catch {
    // Server Components cannot write cookies; the browser-side sign-out below
    // covers the common case.
  }

  redirect('/login');
}

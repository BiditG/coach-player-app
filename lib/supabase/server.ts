import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseEnv } from '@/lib/supabase/env';

/**
 * Server-side Supabase client bound to the request's cookies.
 *
 * Reading and writing the *Supabase* session cookie here - rather than a custom
 * one - is what lets `auth.uid()` resolve inside RLS policies.
 */
export async function createClient() {
  const env = getSupabaseEnv();

  if (!env) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  const cookieStore = await cookies();

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies. `proxy.ts` refreshes the
          // session on every request, so this is only reached when a token
          // rotates mid-render and the next request will pick it up.
        }
      },
    },
  });
}

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseEnv } from '@/lib/supabase/env';

export interface SessionResult {
  response: NextResponse;
  /** The authenticated Supabase user, or null when there is no valid session. */
  userId: string | null;
}

/**
 * Keep the Supabase session cookie current.
 *
 * This is what makes Supabase's own session cookie - not a hand-rolled preview
 * cookie - the thing the app authenticates with. `auth.getUser()` validates the
 * access token against the Auth server and transparently refreshes it when it
 * has expired, and every refreshed cookie is written straight back onto the
 * outgoing response.
 *
 * Deliberately does not redirect. Route-level guards own navigation; doing it
 * here as well is what previously produced redirect loops on refresh.
 */
export async function updateSession(request: NextRequest): Promise<SessionResult> {
  const env = getSupabaseEnv();

  if (!env) {
    return { response: NextResponse.next({ request }), userId: null };
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Keep the request's view of the cookies in sync so later reads in the
        // same pass see the refreshed token.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, userId: user?.id ?? null };
}

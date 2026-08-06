import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client: bypasses RLS and can call the Admin API
 * (createUser/deleteUser). Only ever import this from server-side code
 * (server actions, scripts) — the `server-only` import above makes any
 * accidental client-bundle import a build-time error.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable(s).'
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

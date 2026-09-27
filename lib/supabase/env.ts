/**
 * Supabase environment access.
 *
 * The app is expected to run with Supabase configured, but the feed degrades
 * to a local cache rather than crashing when it is not (for example before the
 * project migration has been applied). Every place that needs the credentials
 * goes through here so that decision lives in exactly one spot.
 */

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function hasSupabaseEnv(): boolean {
  return getSupabaseEnv() !== null;
}

/**
 * The local preview identity cookie.
 *
 * This is NOT authentication. It is a convenience so the one-click demo
 * accounts work on localhost without provisioning Supabase users. Supabase's own
 * session cookie is the real source of truth (see `lib/auth.ts`), and this
 * cookie is ignored entirely in production unless `NEXT_PUBLIC_PREVIEW_AUTH=true`.
 */

export const PREVIEW_COOKIE = 'sprintnp_user';
export const PREVIEW_STORAGE_KEY = 'sprintnp_current_user';

export interface PreviewIdentity {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

export function writePreviewIdentity(identity: PreviewIdentity): void {
  if (typeof window === 'undefined') return;

  const serialised = encodeURIComponent(JSON.stringify(identity));

  // Not HttpOnly: the cookie is written from the browser by design.
  document.cookie = `${PREVIEW_COOKIE}=${serialised}; path=/; max-age=31536000; SameSite=Lax`;
  localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(identity));
}

export function clearPreviewIdentity(): void {
  if (typeof window === 'undefined') return;

  document.cookie = `${PREVIEW_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  localStorage.removeItem(PREVIEW_STORAGE_KEY);
}

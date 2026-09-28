import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
import { requireUser } from '@/lib/auth';

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const profile = await requireUser();
  const { createClient } = await import('@/lib/supabase/server');
  const db = await createClient();
  const { count } = profile.role === 'PROFESSIONAL'
    ? await db.from('review_requests').select('*', { count: 'exact', head: true }).eq('professional_id', profile.id).eq('status', 'REQUESTED')
    : { count: 0 };
  return <AppShell profile={profile} pendingReviewCount={count || 0}>{children}</AppShell>;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<main className="min-h-screen bg-[#f7f7f8]"/>}><AuthenticatedShell>{children}</AuthenticatedShell></Suspense>;
}

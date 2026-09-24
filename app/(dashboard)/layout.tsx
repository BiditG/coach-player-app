import { Suspense } from 'react';
import { AppShell } from '@/components/app-shell';
import { requireUser } from '@/lib/auth';

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  return <AppShell profile={await requireUser()}>{children}</AppShell>;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<main className="min-h-screen bg-[#f7f7f8]"/>}><AuthenticatedShell>{children}</AuthenticatedShell></Suspense>;
}

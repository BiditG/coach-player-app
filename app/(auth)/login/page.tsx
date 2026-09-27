'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { writePreviewIdentity } from '@/lib/preview-auth';

export default function LoginPage() {
  const [email, setEmail] = useState('test1@sprintnp.app');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Test Player 1');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function signInToSupabase(address: string, secret: string, fallbackName: string) {
    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: address,
      password: secret,
    });

    if (signInError || !data.user) {
      return { ok: false as const, message: signInError?.message ?? 'Unable to sign in.' };
    }

    // A Supabase session is now the source of truth, so the preview cookie is
    // only a convenience for the local demo accounts.
    writePreviewIdentity({
      id: data.user.id,
      email: data.user.email ?? address,
      full_name: fallbackName,
      role: 'USER',
    });

    return { ok: true as const, message: null };
  }

  async function loginAs(profile: { id: string; email: string; full_name: string; role: string }) {
    setError(null);
    setIsPending(true);

    const result = await signInToSupabase(profile.email, password, profile.full_name);

    if (!result.ok) {
      // Local demo accounts are not Supabase users, so fall back to the preview
      // identity rather than blocking sign-in.
      setError(`${result.message} Continuing in preview mode.`);
    }

    writePreviewIdentity(profile);
    setIsPending(false);
    router.push('/feed');
    router.refresh();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const address = email || 'test1@sprintnp.app';

    setError(null);
    setIsPending(true);

    const result = await signInToSupabase(address, password, name || address.split('@')[0]);
    setIsPending(false);

    if (result.ok) {
      router.push('/feed');
      router.refresh();
      return;
    }

    setError(`${result.message} Continuing in preview mode.`);
    writePreviewIdentity({
      id: `preview-${address}`,
      email: address,
      full_name: name || address.split('@')[0] || 'Test Player 1',
      role: 'USER',
    });
    router.push('/feed');
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f7f7f8] p-5">
      <div className="w-full max-w-[440px] rounded-3xl border border-black/[.08] bg-white p-7 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="grid size-11 place-items-center rounded-2xl bg-black text-white text-xl font-black shadow-md">
            S
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">SprintNP</h1>
            <p className="text-xs font-semibold text-amber-600">Cricket Social Network</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Sign In to SprintNP</h2>
        <p className="text-xs text-neutral-500 mt-1 mb-6">Click a test account below or enter any email to start exploring immediately.</p>

        {/* 1-Click Quick Test Accounts */}
        <div className="space-y-2 mb-6">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Quick Test Accounts</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                loginAs({
                  id: 'test1-id',
                  email: 'test1@sprintnp.app',
                  full_name: 'test1 (Player)',
                  role: 'USER',
                })
              }
              className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/60 p-3 text-left hover:bg-amber-100/70 transition group"
            >
              <div>
                <p className="text-xs font-bold text-amber-900">test1</p>
                <p className="text-[10px] text-amber-700">Player Profile</p>
              </div>
              <ArrowRight className="size-4 text-amber-600 group-hover:translate-x-0.5 transition" />
            </button>

            <button
              type="button"
              onClick={() =>
                loginAs({
                  id: 'test2-id',
                  email: 'test2@sprintnp.app',
                  full_name: 'test2 (Coach)',
                  role: 'PROFESSIONAL',
                })
              }
              className="flex items-center justify-between rounded-2xl border border-blue-200 bg-blue-50/60 p-3 text-left hover:bg-blue-100/70 transition group"
            >
              <div>
                <p className="text-xs font-bold text-blue-900">test2</p>
                <p className="text-[10px] text-blue-700">Coach Profile</p>
              </div>
              <ArrowRight className="size-4 text-blue-600 group-hover:translate-x-0.5 transition" />
            </button>
          </div>
        </div>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-black/[0.06]"></div>
          <span className="flex-shrink mx-3 text-[11px] font-medium text-neutral-400">Or custom login</span>
          <div className="flex-grow border-t border-black/[0.06]"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Test Player 1"
              className="w-full rounded-2xl border border-black/[0.08] bg-neutral-50 px-4 py-3 text-xs outline-none focus:border-black focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test1@sprintnp.app"
              className="w-full rounded-2xl border border-black/[0.08] bg-neutral-50 px-4 py-3 text-xs outline-none focus:border-black focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-black/[0.08] bg-neutral-50 px-4 py-3 text-xs outline-none focus:border-black focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-full bg-black py-3 text-xs font-bold text-white hover:bg-neutral-800 transition shadow-md mt-2 disabled:opacity-60"
          >
            {isPending ? 'Signing in…' : 'Sign In & Enter App'}
          </button>

          {error && (
            <p role="status" className="rounded-2xl bg-amber-50 px-4 py-2.5 text-[11px] font-medium text-amber-900">
              {error}
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-bold text-black hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}

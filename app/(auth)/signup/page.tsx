'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { writePreviewIdentity } from '@/lib/preview-auth';

export default function SignupPage() {
  const [email, setEmail] = useState('test1@sprintnp.app');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Test Player 1');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    const address = email || 'test1@sprintnp.app';
    const fullName = name || address.split('@')[0] || 'Test Player 1';

    setError(null);
    setNotice(null);
    setIsPending(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: address,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      // Never block on Supabase availability - the preview identity keeps the
      // local demo flow working.
      setError(`${signUpError.message} Continuing in preview mode.`);
      setIsPending(false);
      writePreviewIdentity({
        id: `preview-${address}`,
        email: address,
        full_name: fullName,
        role: 'USER',
      });
      router.push('/feed');
      router.refresh();
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setIsPending(false);
      setError('Could not start a session. Try signing in instead.');
      return;
    }

    if (data.session) {
      setIsPending(false);
      writePreviewIdentity({ id: userId, email: address, full_name: fullName, role: 'USER' });
      router.push('/feed');
      router.refresh();
      return;
    }

    // No session yet: the project requires email confirmation. Sign in if the
    // account already exists, otherwise tell the player to confirm.
    setIsPending(false);
    setNotice('Account created. Check your inbox to confirm, then sign in.');

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: address, password });

    if (!signInError) {
      writePreviewIdentity({ id: userId, email: address, full_name: fullName, role: 'USER' });
      router.push('/feed');
      router.refresh();
    }
  }

  function enterAsInstantAccount(profile: { id: string; email: string; full_name: string; role: string }) {
    writePreviewIdentity(profile);
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

        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Create SprintNP Account</h2>
        <p className="text-xs text-neutral-500 mt-1 mb-6">Use test accounts or create a custom profile instantly.</p>

        {/* Quick Test Account Selectors */}
        <div className="space-y-2 mb-6">
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Instant Test Accounts</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                enterAsInstantAccount({
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
                enterAsInstantAccount({
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
          <span className="flex-shrink mx-3 text-[11px] font-medium text-neutral-400">Or custom signup</span>
          <div className="flex-grow border-t border-black/[0.06]"></div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Test Player 1"
              className="w-full rounded-2xl border border-black/[0.08] bg-neutral-50 px-4 py-3 text-xs outline-none focus:border-black focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Email Address</label>
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
            {isPending ? 'Creating account…' : 'Create Account & Enter App'}
          </button>

          {error && (
            <p role="status" className="rounded-2xl bg-amber-50 px-4 py-2.5 text-[11px] font-medium text-amber-900">
              {error}
            </p>
          )}

          {notice && (
            <p role="status" className="rounded-2xl bg-neutral-100 px-4 py-2.5 text-[11px] font-medium text-neutral-700">
              {notice}
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-xs text-neutral-400">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-black hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

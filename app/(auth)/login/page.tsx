'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserCheck, Sparkles, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('test1@sprintnp.app');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('Test Player 1');
  const router = useRouter();

  function loginAs(profile: { id: string; email: string; full_name: string; role: string }) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sprintnp_current_user', JSON.stringify(profile));
      document.cookie = `sprintnp_user=${encodeURIComponent(JSON.stringify(profile))}; path=/; max-age=31536000`;
    }
    router.push('/feed');
    router.refresh();
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    loginAs({
      id: `user-${Date.now()}`,
      email: email || 'test1@sprintnp.app',
      full_name: name || email.split('@')[0] || 'Test Player 1',
      role: 'USER',
    });
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
            className="w-full rounded-full bg-black py-3 text-xs font-bold text-white hover:bg-neutral-800 transition shadow-md mt-2"
          >
            Sign In & Enter App
          </button>
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

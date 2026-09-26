'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const router = useRouter();

  function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    // Direct account creation without email verification screen
    const userProfile = {
      id: `user-${Date.now()}`,
      email: email,
      full_name: name || email.split('@')[0] || 'SprintNP Player',
      role: 'USER',
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('sprintnp_current_user', JSON.stringify(userProfile));
      document.cookie = `sprintnp_user=${encodeURIComponent(JSON.stringify(userProfile))}; path=/; max-age=31536000`;
    }

    router.push('/feed');
    router.refresh();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f7f7f8] p-5">
      <div className="w-full max-w-[420px] rounded-3xl border border-black/[.08] bg-white p-7 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="grid size-11 place-items-center rounded-2xl bg-black text-white text-xl font-black">
            S
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-neutral-900 tracking-tight">SprintNP</h1>
            <p className="text-xs font-semibold text-amber-600">Cricket Social Network</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">Create SprintNP Account</h2>
        <p className="text-xs text-neutral-500 mt-1 mb-6">Direct instant registration (no email confirmation needed).</p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Arjun Mehta"
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
              placeholder="player@sprintnp.app"
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
            Create Account & Enter App
          </button>
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

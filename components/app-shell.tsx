'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Calendar,
  Flame,
  LogOut,
  Plus,
  Search,
  Share2,
  Shield,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { signOut } from '@/app/(login)/actions';
import type { Profile } from '@/lib/types';
import { PostCreatorModal } from './post-creator';
import { ShareModal } from './share-modal';
import { Post } from '@/lib/post-store';

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname();
  const [isPostCreatorOpen, setIsPostCreatorOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const navLinks = [
    { href: '/feed', label: 'Feed', icon: Flame },
    { href: '/coaches', label: 'Coaches', icon: Users },
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/ai-review', label: 'AI Review', icon: Sparkles },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  if (profile.role === 'ADMIN') {
    navLinks.unshift({ href: '/admin', label: 'Admin', icon: Shield });
  }

  const initial = profile.full_name?.[0] || profile.email[0]?.toUpperCase() || 'S';

  const handlePostCreated = (post: Post) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('sprintnp:posts-changed'));
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col md:flex-row overflow-x-hidden">
      {/* DESKTOP SIDEBAR (Full Height) */}
      <aside className="hidden w-[230px] shrink-0 border-r border-black/[0.06] p-5 md:flex md:flex-col justify-between bg-white min-h-screen sticky top-0 h-screen">
        <div>
          {/* Logo */}
          <Link href="/feed" aria-label="SprintNP Home" className="flex items-center gap-3 px-2 py-1">
            <div className="grid size-10 place-items-center rounded-2xl bg-black font-extrabold text-white text-lg shadow-md tracking-tighter">
              S
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-neutral-900 leading-none">SprintNP</span>
              <span className="text-[10px] font-semibold tracking-wider text-amber-600 uppercase mt-0.5">Cricket Social</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="mt-8 space-y-1.5">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== '/' && pathname.startsWith(href + '/'));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3.5 rounded-2xl px-3.5 py-3 text-xs font-semibold transition duration-200 ${
                    isActive
                      ? 'bg-black text-white shadow-md'
                      : 'text-neutral-500 hover:bg-neutral-100 hover:text-black'
                  }`}
                >
                  <Icon size={18} strokeWidth={2} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* YOUR TOOLS Section */}
          <div className="mt-8 pt-6 border-t border-black/[0.06]">
            <p className="px-3 text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-3">Your Tools</p>
            
            <button
              onClick={() => setIsPostCreatorOpen(true)}
              className="w-full flex items-center gap-3 rounded-2xl bg-neutral-900 px-3.5 py-3 text-xs font-semibold text-white shadow-md hover:bg-neutral-800 transition"
            >
              <Plus size={18} strokeWidth={2.5} className="text-amber-400" />
              <span>Create Post</span>
            </button>

            <button
              onClick={() => setIsShareModalOpen(true)}
              aria-label="Share App"
              className="w-full mt-2 flex items-center gap-3 rounded-2xl border border-black/[0.08] bg-white px-3.5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition"
            >
              <Share2 size={16} className="text-neutral-500" />
              <span>Share App</span>
            </button>
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="pt-4 border-t border-black/[0.06] flex items-center justify-between">
          <Link href="/profile" className="flex items-center gap-3 min-w-0">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-neutral-900 text-xs font-bold text-white shadow-sm">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-neutral-900 truncate">{profile.full_name || 'Player'}</p>
              <p className="text-[10px] text-neutral-400 truncate">{profile.email}</p>
            </div>
          </Link>

          <form action={signOut}>
            <button title="Sign out" aria-label="Sign out" className="grid size-8 place-items-center rounded-full text-neutral-400 hover:bg-neutral-200 hover:text-black transition">
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </aside>

      {/* MAIN CONTENT AREA (Full Width & Height) */}
      <main className="min-w-0 flex-1 flex flex-col bg-white min-h-screen">
        {/* HEADER */}
        <header className="flex h-16 items-center justify-between border-b border-black/[.055] px-5 sm:px-8 bg-white/80 backdrop-blur-md sticky top-0 z-20 w-full">
          <Link href="/feed" className="flex items-center gap-2 md:hidden">
            <div className="grid size-8 place-items-center rounded-xl bg-black text-xs font-bold text-white">S</div>
            <span className="text-sm font-extrabold tracking-tight">SprintNP</span>
          </Link>

          {/* Search Bar */}
          <div className="hidden w-full max-w-md items-center gap-2.5 rounded-full bg-neutral-100 px-4 py-2 md:flex border border-black/[0.04] focus-within:bg-white focus-within:border-black/20 transition">
            <Search size={15} className="text-neutral-400" />
            <input
              type="text"
              placeholder="Search players, matches, or posts..."
              className="w-full bg-transparent text-xs text-neutral-800 placeholder-neutral-400 outline-none"
            />
          </div>

          {/* Top Bar Actions */}
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setIsPostCreatorOpen(true)}
              className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-neutral-800 transition flex items-center gap-1.5"
            >
              <Plus size={15} className="text-amber-400" />
              <span className="hidden sm:inline">Create Post</span>
            </button>

            <button className="grid size-9 place-items-center rounded-full text-neutral-500 hover:bg-neutral-100 transition" aria-label="Notifications">
              <Bell size={18} strokeWidth={1.7} />
            </button>

            <Link href="/profile" className="grid size-8 place-items-center rounded-full bg-neutral-900 text-xs font-bold text-white shadow-sm" aria-label="Profile">
              {initial}
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-8 md:py-8 flex-1">
          {children}
        </div>
      </main>

      {/* MOBILE NAVIGATION BAR */}
      <nav className="fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-2xl border border-black/[.08] bg-white/95 px-2 py-2.5 shadow-xl backdrop-blur-lg md:hidden">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-3 py-1 text-[10px] font-semibold transition ${
                isActive ? 'text-black font-bold' : 'text-neutral-400'
              }`}
            >
              <Icon size={19} strokeWidth={isActive ? 2.2 : 1.6} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Modals */}
      <PostCreatorModal
        isOpen={isPostCreatorOpen}
        onClose={() => setIsPostCreatorOpen(false)}
        onPostCreated={handlePostCreated}
        userFullName={profile.full_name || 'Player'}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
}

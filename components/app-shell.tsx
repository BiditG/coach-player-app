'use client';

import { useState } from 'react';
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
import { PostComposer } from '@/components/feed/post-composer';
import { ShareModal } from '@/components/share-modal';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/feed', label: 'Feed', icon: Flame },
  { href: '/coaches', label: 'Coaches', icon: Users },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/ai-review', label: 'AI Review', icon: Sparkles },
  { href: '/profile', label: 'Profile', icon: User },
] as const;

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const pathname = usePathname();
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const navLinks =
    profile.role === 'ADMIN'
      ? [{ href: '/admin', label: 'Admin', icon: Shield }, ...NAV_LINKS]
      : NAV_LINKS;

  const initial = profile.full_name?.[0] || profile.email[0]?.toUpperCase() || 'S';

  return (
    <div className="min-h-[100dvh] bg-canvas md:flex">
      {/* Sidebar: a heavier material so it separates the structural region
          from the content. Never translucent-on-translucent. */}
      <aside className="material-thick sticky top-0 hidden h-[100dvh] w-[240px] shrink-0 flex-col justify-between border-r border-hairline px-4 py-5 md:flex">
        <div>
          <Link href="/feed" aria-label="SprintNP home" className="press flex items-center gap-2.5 px-2">
            <span className="grid size-9 place-items-center rounded-xl bg-ink text-[15px] font-bold text-white">
              S
            </span>
            <span className="flex flex-col">
              <span className="type-headline leading-none text-ink">SprintNP</span>
              <span className="type-eyebrow mt-1 text-[10px] text-ink-tertiary">Cricket Social</span>
            </span>
          </Link>

          <nav className="mt-7 space-y-0.5" aria-label="Primary">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'press flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium',
                    isActive ? 'bg-ink text-white' : 'text-ink-secondary hover:bg-black/[0.05] hover:text-ink',
                  )}
                >
                  <Icon size={17} strokeWidth={isActive ? 2.1 : 1.8} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-7 border-t border-hairline-soft pt-5">
            <p className="type-eyebrow px-3 text-ink-tertiary">Create</p>
            <button
              type="button"
              onClick={() => setIsComposerOpen(true)}
              className="press mt-2 flex w-full items-center gap-3 rounded-xl bg-ink px-3 py-2.5 text-[13px] font-semibold text-white"
            >
              <Plus size={17} strokeWidth={2.2} className="text-orange-400" />
              New post
            </button>
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              aria-label="Share the app"
              className="press mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-ink-secondary hover:bg-black/[0.05] hover:text-ink"
            >
              <Share2 size={16} strokeWidth={1.8} />
              Share app
            </button>
          </div>
        </div>

        <div className="border-t border-hairline-soft pt-4">
          <div className="flex items-center gap-2.5 px-2">
            <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-neutral-900 text-[13px] font-semibold text-white">
                {initial}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">
                  {profile.full_name || 'Player'}
                </span>
                <span className="block truncate text-[11px] text-ink-tertiary">{profile.email}</span>
              </span>
            </Link>

            <form action={signOut}>
              <button
                type="submit"
                title="Sign out"
                aria-label="Sign out"
                className="press press-sm grid size-9 place-items-center rounded-full text-ink-tertiary hover:bg-black/[0.05] hover:text-ink"
              >
                <LogOut size={16} strokeWidth={1.8} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Floating chrome: content scrolls underneath, and the edge fades
            rather than being divided by a hard rule. */}
        <header className="material sticky top-0 z-30 border-b border-hairline-soft">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6 md:h-16 md:px-8">
            <Link href="/feed" aria-label="SprintNP home" className="press flex items-center gap-2 md:hidden">
              <span className="grid size-8 place-items-center rounded-lg bg-ink text-[13px] font-bold text-white">
                S
              </span>
            </Link>

            <div className="hidden h-10 max-w-sm flex-1 items-center gap-2.5 rounded-full bg-black/[0.04] px-4 transition focus-within:bg-black/[0.06] md:flex">
              <Search size={15} strokeWidth={1.9} className="shrink-0 text-ink-tertiary" />
              <input
                type="search"
                placeholder="Search players, matches, posts"
                aria-label="Search"
                className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-tertiary"
              />
            </div>

            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsComposerOpen(true)}
                className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-white"
              >
                <Plus size={15} strokeWidth={2.2} className="text-orange-400" />
                <span className="hidden sm:inline">New post</span>
              </button>

              <button
                type="button"
                aria-label="Notifications"
                className="press press-sm grid size-10 place-items-center rounded-full text-ink-secondary hover:bg-black/[0.05]"
              >
                <Bell size={18} strokeWidth={1.8} />
              </button>

              <Link
                href="/profile"
                aria-label="Your profile"
                className="press press-sm grid size-9 place-items-center rounded-full bg-neutral-900 text-[13px] font-semibold text-white"
              >
                {initial}
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 md:px-8 md:pb-12 md:pt-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      {/* Tab bar for touch. Translucent, floats above content. */}
      <nav
        aria-label="Primary"
        className="material fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-2xl px-1.5 py-1.5 elevation-2 md:hidden"
      >
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'press flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-semibold',
                isActive ? 'text-ink' : 'text-ink-tertiary',
              )}
            >
              <Icon size={19} strokeWidth={isActive ? 2.2 : 1.7} />
              {label}
            </Link>
          );
        })}
      </nav>

      <PostComposer
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        author={{ id: profile.id, name: profile.full_name || 'Player' }}
      />

      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
    </div>
  );
}

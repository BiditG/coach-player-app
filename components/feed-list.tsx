'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Award, ChevronRight, Sparkles, Users, Activity, Video } from 'lucide-react';
import { PostCard } from './post-card';
import { Post } from './post-creator';

const INITIAL_POSTS: Post[] = [
  {
    id: 'post-arjun-1',
    authorName: 'Arjun Mehta',
    authorHandle: '@arjunmehta',
    timeAgo: '2h ago',
    location: 'Local Match • Mumbai',
    caption: 'Good game today! Nice to get some time in the middle again. 🏏',
    imageUrl: '/images/cricket-feed-poster.png',
    hasStatCard: true,
    statCard: {
      score: '78 (52)',
      strikeRate: '150.0',
      fours: '8',
      sixes: '3',
      dotBalls: '12',
      matchTitle: 'Rivals CC vs Heritage XI',
      matchResult: 'Won by 32 runs',
      tag: 'Match'
    },
    fireCount: 124,
    hasFired: false,
    commentsCount: 18,
    bookmarked: false,
    comments: [
      { id: 'c1', author: 'Karan Desai', text: 'Clean striking! That pull shot in the 8th over was effortless.', timeAgo: '1h ago' },
      { id: 'c2', author: 'Coach Vikram', text: 'Stance looking solid. Maintain that back-foot alignment.', timeAgo: '45m ago' }
    ],
    medals: ['Technical excellence'],
    createdAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'post-karan-2',
    authorName: 'Karan Desai',
    authorHandle: '@karandesai',
    timeAgo: '5h ago',
    location: 'League Match • Bangalore',
    caption: 'Tight spell in the death overs. 4 overs, 2 wickets for 18 runs. Focused on seam movement today. ⚡',
    imageUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop',
    hasStatCard: true,
    statCard: {
      score: '4/18 (4.0)',
      strikeRate: 'Econ 4.50',
      fours: '0',
      sixes: '1',
      dotBalls: '16',
      matchTitle: 'Bangalore Strikers vs Knights CC',
      matchResult: 'Won by 4 wickets',
      tag: 'Bowling'
    },
    fireCount: 89,
    hasFired: true,
    commentsCount: 9,
    bookmarked: true,
    comments: [
      { id: 'c3', author: 'Rohan Iyer', text: 'Great control on the outswingers mate!', timeAgo: '3h ago' }
    ],
    medals: ['Precision'],
    createdAt: new Date(Date.now() - 18000000).toISOString()
  }
];

export function FeedList({ userRole }: { userRole?: string }) {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [activeTab, setActiveTab] = useState('For you');

  useEffect(() => {
    const handleNewPost = (e: Event) => {
      const customEvent = e as CustomEvent<Post>;
      if (customEvent.detail) {
        setPosts((prev) => [customEvent.detail, ...prev]);
      }
    };

    window.addEventListener('sprintnp:new-post', handleNewPost);
    return () => window.removeEventListener('sprintnp:new-post', handleNewPost);
  }, []);

  const isCoach = userRole === 'PROFESSIONAL' || userRole === 'ADMIN';

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_310px]">
      {/* MAIN FEED SECTION */}
      <section className="space-y-6">
        {/* Header Banner */}
        <div className="border-b border-black/[.07] pb-5">
          <span className="inline-block text-[11px] font-bold text-amber-600 tracking-wider uppercase">SprintNP Community</span>
          <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-neutral-900">
            A cricket community<br />that sees potential.
          </h1>
          <p className="mt-2 text-xs text-neutral-500">
            Share your match stats, short clips, and queries. Get recognized with fire reactions 🔥 and coach medals.
          </p>

          {/* Feed Filter Tabs */}
          <div className="mt-6 flex gap-6 text-xs font-semibold border-b border-black/[0.04]">
            {['For you', 'Following', 'Cricket', 'Trending', 'Latest'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 transition relative ${
                  activeTab === tab
                    ? 'border-b-2 border-black text-black font-bold'
                    : 'text-neutral-400 hover:text-neutral-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Posts List */}
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} isCoach={isCoach} />
          ))}
        </div>
      </section>

      {/* RIGHT SIDEBAR STATS & TRENDING */}
      <aside className="space-y-5">
        {/* Today's Activity */}
        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <h3 className="text-xs font-bold text-neutral-900 tracking-tight mb-4">Today&apos;s Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="grid size-10 place-items-center rounded-2xl bg-amber-50 text-amber-700">
                <Activity className="size-5" />
              </div>
              <div>
                <p className="text-base font-extrabold text-neutral-900 leading-none">12</p>
                <p className="text-[11px] font-medium text-neutral-400 mt-0.5">Matches played</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="grid size-10 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                <Users className="size-5" />
              </div>
              <div>
                <p className="text-base font-extrabold text-neutral-900 leading-none">48</p>
                <p className="text-[11px] font-medium text-neutral-400 mt-0.5">Players active</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="grid size-10 place-items-center rounded-2xl bg-purple-50 text-purple-700">
                <Video className="size-5" />
              </div>
              <div>
                <p className="text-base font-extrabold text-neutral-900 leading-none">136</p>
                <p className="text-[11px] font-medium text-neutral-400 mt-0.5">Clips shared</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trending Players */}
        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-neutral-900 tracking-tight">Trending Players</h3>
            <span className="text-[10px] font-semibold text-neutral-400">View all</span>
          </div>

          <div className="space-y-3.5">
            {[
              { name: 'Arjun Mehta', handle: '@arjunmehta', role: 'Batsman' },
              { name: 'Karan Desai', handle: '@karandesai', role: 'Fast Bowler' },
              { name: 'Rohan Iyer', handle: '@rohaniyer', role: 'All-rounder' },
              { name: 'Ishaan Verma', handle: '@ishaanv', role: 'Spin Bowler' }
            ].map((player) => (
              <div key={player.handle} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                    {player.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-neutral-900 leading-tight">{player.name}</p>
                    <p className="text-[10px] text-neutral-400">{player.handle}</p>
                  </div>
                </div>
                <button className="rounded-full bg-neutral-100 hover:bg-black hover:text-white px-3 py-1.5 text-[11px] font-semibold transition">
                  Follow
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Top Medals */}
        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-neutral-900 tracking-tight">Coach Medals</h3>
            <ChevronRight className="size-4 text-neutral-400" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: 'Technical Excellence', tone: 'bg-amber-50 text-amber-700' },
              { name: 'Great Progress', tone: 'bg-emerald-50 text-emerald-700' },
              { name: 'Outstanding Style', tone: 'bg-orange-50 text-orange-700' }
            ].map((m) => (
              <div key={m.name} className={`rounded-2xl p-3 text-center ${m.tone}`}>
                <Award className="size-5 mx-auto mb-2" />
                <p className="text-[10px] font-bold leading-tight">{m.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Callout Card */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 to-black p-6 text-white shadow-xl relative">
          <Sparkles className="size-5 text-amber-400" />
          <h4 className="mt-6 text-xl font-extrabold tracking-tight">Cricket is better together.</h4>
          <p className="mt-2 text-xs leading-relaxed text-white/70">
            Share your latest innings stat card or bowling spell with verified coaches on SprintNP.
          </p>
        </div>
      </aside>
    </div>
  );
}

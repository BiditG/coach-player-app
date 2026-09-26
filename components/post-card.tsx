'use client';

import React, { useState } from 'react';
import { Award, Bookmark, Flame, MessageCircle, MoreHorizontal, Send, Share2 } from 'lucide-react';
import { Post } from '@/lib/post-store';
import { ShareModal } from './share-modal';

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  isCoach?: boolean;
  onAddMedal?: (postId: string, medal: string) => void;
}

export function PostCard({ post, isCoach = false }: PostCardProps) {
  const [fireCount, setFireCount] = useState(post.fireCount || 0);
  const [hasFired, setHasFired] = useState(post.hasFired || false);
  const [bookmarked, setBookmarked] = useState(post.bookmarked || false);
  const [showShare, setShowShare] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [newComment, setNewComment] = useState('');
  const [medals, setMedals] = useState<string[]>(post.medals || []);
  const [showMedalMenu, setShowMedalMenu] = useState(false);

  const handleFireClick = () => {
    if (hasFired) {
      setFireCount((prev: number) => Math.max(0, prev - 1));
      setHasFired(false);
    } else {
      setFireCount((prev: number) => prev + 1);
      setHasFired(true);
    }
  };

  const handleBookmarkClick = () => {
    setBookmarked(!bookmarked);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment = {
      id: `comment-${Date.now()}`,
      author: 'You',
      text: newComment.trim(),
      timeAgo: 'Just now',
    };

    setComments([...comments, comment]);
    setNewComment('');
  };

  const handleAwardMedal = (medalType: string) => {
    if (!medals.includes(medalType)) {
      setMedals([...medals, medalType]);
    }
    setShowMedalMenu(false);
  };

  return (
    <article className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
      {/* Author Header */}
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-neutral-800 to-black text-xs font-bold text-white shadow-sm">
            {post.authorAvatar ? (
              <img src={post.authorAvatar} alt={post.authorName} className="size-full rounded-full object-cover" />
            ) : (
              post.authorName[0]?.toUpperCase()
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-neutral-900">{post.authorName}</h3>
            <p className="text-[11px] font-medium text-neutral-400">
              {post.timeAgo} {post.location ? `· ${post.location}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {medals.length > 0 && (
            <div className="flex gap-1">
              {medals.map((m, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800 shadow-sm"
                >
                  <Award className="size-3 text-amber-600" />
                  {m}
                </span>
              ))}
            </div>
          )}
          <button className="grid size-8 place-items-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-black transition">
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </header>

      {/* Main Image / Stat Card Overlay */}
      <div className="relative overflow-hidden rounded-2xl bg-neutral-950 aspect-[4/3] sm:aspect-[16/10] border border-black/[0.06] shadow-inner">
        <img
          src={post.imageUrl || '/images/cricket-feed-poster.png'}
          alt="Cricket post"
          className="size-full object-cover"
        />

        {/* Tag Pill (Top Right) */}
        {post.hasStatCard && post.statCard && (
          <div className="absolute top-4 right-4 z-10">
            <span className="rounded-full bg-black/60 backdrop-blur-md border border-white/20 px-3 py-1 text-[11px] font-semibold text-white shadow-lg">
              {post.statCard.tag || 'Match'}
            </span>
          </div>
        )}

        {/* Stat Card Overlay (Matching Image 2 Sample) */}
        {post.hasStatCard && post.statCard && (
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-5 pt-16 text-white">
            {/* Big Score & Strike Rate */}
            <div>
              <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
                {post.statCard.score}
              </div>
              <div className="mt-1 text-sm font-semibold text-white/90 tracking-wide">
                Strike Rate {post.statCard.strikeRate}
              </div>
            </div>

            {/* 4s, 6s, Dot Balls Row */}
            <div className="mt-4 flex items-center gap-6 border-t border-white/15 pt-3">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-white/60">4s</div>
                <div className="text-base font-bold text-white">{post.statCard.fours}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-white/60">6s</div>
                <div className="text-base font-bold text-white">{post.statCard.sixes}</div>
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-white/60">Dot Balls</div>
                <div className="text-base font-bold text-white">{post.statCard.dotBalls}</div>
              </div>
            </div>

            {/* Bottom Teams & Result Line */}
            <div className="mt-4 flex items-center justify-between text-xs text-white/80 font-medium pt-1">
              <span className="font-semibold text-white/90">{post.statCard.matchTitle}</span>
              {post.statCard.matchResult && (
                <span className="text-white/70 italic">{post.statCard.matchResult}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Caption Section */}
      <div className="mt-4">
        <p className="text-xs font-bold text-neutral-900">{post.authorName}</p>
        <p className="mt-1 text-xs leading-relaxed text-neutral-600">{post.caption}</p>
      </div>

      {/* Action Bar (Fire 🔥, Comment, Share, Bookmark) */}
      <div className="mt-4 flex items-center justify-between border-t border-black/[0.06] pt-3">
        <div className="flex items-center gap-4">
          {/* FIRE REACTION ONLY (Replacing like heart) */}
          <button
            onClick={handleFireClick}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              hasFired
                ? 'bg-orange-500/10 text-orange-600 ring-1 ring-orange-500/30'
                : 'text-neutral-500 hover:bg-neutral-100 hover:text-orange-500'
            }`}
            title="React Fire 🔥"
          >
            <Flame className={`size-4 ${hasFired ? 'fill-orange-500 text-orange-500 animate-bounce' : ''}`} />
            <span>{fireCount}</span>
          </button>

          {/* Comment Button */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-black transition"
          >
            <MessageCircle className="size-4" />
            <span>{comments.length}</span>
          </button>

          {/* Cross-App Share Button */}
          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-100 hover:text-black transition"
            title="Share post"
          >
            <Share2 className="size-4" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* Coach Medal Action (For Coaches) */}
          {isCoach && (
            <div className="relative">
              <button
                onClick={() => setShowMedalMenu(!showMedalMenu)}
                className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
              >
                <Award className="size-4 text-amber-600" />
                <span>Give Medal</span>
              </button>

              {showMedalMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-48 rounded-2xl bg-white p-2 shadow-xl border border-black/[0.08] z-30">
                  <p className="px-2 py-1 text-[10px] font-bold text-neutral-400 uppercase">Award Medal</p>
                  {['Technical Excellence', 'Great Progress', 'Outstanding Style'].map((m) => (
                    <button
                      key={m}
                      onClick={() => handleAwardMedal(m)}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-xl hover:bg-amber-50 hover:text-amber-800 transition"
                    >
                      🏅 {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bookmark Action */}
        <button
          onClick={handleBookmarkClick}
          className={`grid size-9 place-items-center rounded-full transition ${
            bookmarked ? 'text-black bg-neutral-100' : 'text-neutral-400 hover:bg-neutral-100 hover:text-black'
          }`}
          title="Bookmark Post"
        >
          <Bookmark className={`size-4 ${bookmarked ? 'fill-black' : ''}`} />
        </button>
      </div>

      {/* Inline Comments Drawer */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-black/[0.05] space-y-3">
          {comments.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {comments.map((c: { id: string; author: string; text: string; timeAgo: string }) => (
                <div key={c.id} className="rounded-2xl bg-neutral-50 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900">{c.author}</span>
                    <span className="text-[10px] text-neutral-400">{c.timeAgo}</span>
                  </div>
                  <p className="mt-1 text-neutral-600">{c.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">No comments yet. Be the first to comment!</p>
          )}

          {/* Comment Form */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="min-w-0 flex-1 rounded-full bg-neutral-100 px-4 py-2 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-black/20"
            />
            <button type="submit" className="grid size-8 place-items-center rounded-full bg-black text-white hover:bg-neutral-800 transition">
              <Send className="size-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Cross-App Sharing Modal */}
      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        postTitle={`${post.authorName}'s cricket highlight on SprintNP`}
      />
    </article>
  );
}

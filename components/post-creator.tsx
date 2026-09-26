'use client';

import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, BarChart3, Sparkles, UploadCloud } from 'lucide-react';

export interface StatCardData {
  score: string;
  balls?: string;
  strikeRate: string;
  fours: string;
  sixes: string;
  dotBalls: string;
  matchTitle: string;
  matchResult: string;
  tag: string;
}

export interface Post {
  id: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  timeAgo: string;
  location?: string;
  caption: string;
  imageUrl?: string;
  hasStatCard: boolean;
  statCard?: StatCardData;
  fireCount: number;
  hasFired: boolean;
  commentsCount: number;
  bookmarked: boolean;
  comments: { id: string; author: string; text: string; timeAgo: string }[];
  medals?: string[];
  createdAt: string;
}

interface PostCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post: Post) => void;
  userFullName?: string;
}

export function PostCreatorModal({ isOpen, onClose, onPostCreated, userFullName = 'Player' }: PostCreatorProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [hasStatCard, setHasStatCard] = useState<boolean>(true);
  const [caption, setCaption] = useState<string>('');
  
  // Stat Card Fields
  const [score, setScore] = useState('78');
  const [balls, setBalls] = useState('52');
  const [strikeRate, setStrikeRate] = useState('150.0');
  const [fours, setFours] = useState('8');
  const [sixes, setSixes] = useState('3');
  const [dotBalls, setDotBalls] = useState('12');
  const [matchTitle, setMatchTitle] = useState('Rivals CC vs Heritage XI');
  const [matchResult, setMatchResult] = useState('Won by 32 runs');
  const [tag, setTag] = useState('Match');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newPost: Post = {
      id: `post-${Date.now()}`,
      authorName: userFullName,
      authorHandle: `@${userFullName.toLowerCase().replace(/\s+/g, '')}`,
      timeAgo: 'Just now',
      location: 'Local Match • Mumbai',
      caption: caption || 'Great game today! 🏏',
      imageUrl: imagePreview || '/images/cricket-feed-poster.png',
      hasStatCard,
      statCard: hasStatCard ? {
        score: `${score} (${balls})`,
        strikeRate,
        fours,
        sixes,
        dotBalls,
        matchTitle,
        matchResult,
        tag
      } : undefined,
      fireCount: 1,
      hasFired: true,
      commentsCount: 0,
      bookmarked: false,
      comments: [],
      medals: [],
      createdAt: new Date().toISOString()
    };

    onPostCreated(newPost);
    onClose();

    // Reset form
    setImagePreview(null);
    setCaption('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-black/[0.08] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">Create Post</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Share your cricket matches, stats, or shortest clips on SprintNP</p>
          </div>
          <button
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-black transition"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          {/* Post Type Selector */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-neutral-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setHasStatCard(true)}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold transition ${
                hasStatCard ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <BarChart3 className="size-4 text-amber-500" />
              Stat Card Post
            </button>
            <button
              type="button"
              onClick={() => setHasStatCard(false)}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold transition ${
                !hasStatCard ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <ImageIcon className="size-4 text-blue-500" />
              Plain Image Only
            </button>
          </div>

          {/* Image Upload Area */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-2">Upload Image from Device</label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-neutral-900 border border-black/[0.08] group">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-black/70 text-white hover:bg-black transition"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 rounded-2xl p-8 cursor-pointer hover:border-black transition bg-neutral-50/50"
              >
                <div className="grid size-12 place-items-center rounded-2xl bg-neutral-100 text-neutral-600 mb-3">
                  <UploadCloud className="size-6" />
                </div>
                <p className="text-xs font-semibold text-neutral-800">Click to upload photo from device</p>
                <p className="text-[11px] text-neutral-400 mt-1">PNG, JPG, WEBP supported</p>
              </div>
            )}
          </div>

          {/* Stat Card Fields (Conditional) */}
          {hasStatCard && (
            <div className="rounded-2xl border border-amber-200/60 bg-amber-50/40 p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-amber-200/40 pb-2">
                <Sparkles className="size-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">Match Stat Card Overlay</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Runs</label>
                  <input
                    type="text"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="78"
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Balls</label>
                  <input
                    type="text"
                    value={balls}
                    onChange={(e) => setBalls(e.target.value)}
                    placeholder="52"
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Strike Rate</label>
                  <input
                    type="text"
                    value={strikeRate}
                    onChange={(e) => setStrikeRate(e.target.value)}
                    placeholder="150.0"
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Fours (4s)</label>
                  <input
                    type="text"
                    value={fours}
                    onChange={(e) => setFours(e.target.value)}
                    placeholder="8"
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Sixes (6s)</label>
                  <input
                    type="text"
                    value={sixes}
                    onChange={(e) => setSixes(e.target.value)}
                    placeholder="3"
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Dot Balls</label>
                  <input
                    type="text"
                    value={dotBalls}
                    onChange={(e) => setDotBalls(e.target.value)}
                    placeholder="12"
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Teams / Match Name</label>
                  <input
                    type="text"
                    value={matchTitle}
                    onChange={(e) => setMatchTitle(e.target.value)}
                    placeholder="Rivals CC vs Heritage XI"
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-xs outline-none focus:border-black"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Match Result</label>
                  <input
                    type="text"
                    value={matchResult}
                    onChange={(e) => setMatchResult(e.target.value)}
                    placeholder="Won by 32 runs"
                    className="w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-xs outline-none focus:border-black"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Caption */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-2">Caption / Note</label>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Good game today! Nice to get some time in the middle again. 🏏"
              className="w-full rounded-2xl border border-black/[0.08] bg-neutral-50 px-4 py-3 text-xs outline-none focus:border-black focus:bg-white transition"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-black px-6 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 transition shadow-md"
            >
              Publish Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

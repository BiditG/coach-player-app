'use client';

import React, { useState } from 'react';
import { Check, Copy, Share2, Globe, MessageCircle, Send, X } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postTitle?: string;
  postUrl?: string;
}

export function ShareModal({ isOpen, onClose, postTitle = 'Check out this cricket highlight on SprintNP!', postUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = postUrl || (typeof window !== 'undefined' ? window.location.href : 'https://sprintnp.app');

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = [
    {
      name: 'Instagram',
      icon: (props: any) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
      ),
      bg: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600',
      action: () => {
        navigator.clipboard.writeText(currentUrl);
        alert('Link copied! Open Instagram to paste in your story or messages.');
      },
    },
    {
      name: 'Facebook',
      icon: (props: any) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
        </svg>
      ),
      bg: 'bg-blue-600',
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, '_blank');
      },
    },
    {
      name: 'X (Twitter)',
      icon: (props: any) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
          <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
        </svg>
      ),
      bg: 'bg-black',
      action: () => {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(postTitle)}&url=${encodeURIComponent(currentUrl)}`, '_blank');
      },
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-black/[0.08] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
          <div className="flex items-center gap-2">
            <Share2 className="size-5 text-neutral-800" />
            <h3 className="text-lg font-semibold tracking-tight text-neutral-900">Share Post across Apps</h3>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-black transition"
          >
            <X className="size-4" />
          </button>
        </div>

        <p className="mt-4 text-xs text-neutral-500 leading-relaxed">
          Share your cricket moments, match stat cards, and highlights directly with your friends on social media.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {shareLinks.map((platform) => {
            const Icon = platform.icon;
            return (
              <button
                key={platform.name}
                onClick={platform.action}
                className="flex flex-col items-center gap-2 rounded-2xl border border-black/[0.06] p-3 text-center transition hover:bg-neutral-50 hover:shadow-sm"
              >
                <div className={`grid size-11 place-items-center rounded-2xl ${platform.bg} text-white shadow-md`}>
                  <Icon className="size-5" />
                </div>
                <span className="text-xs font-medium text-neutral-700">{platform.name}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-2xl bg-neutral-100 p-2.5">
          <input
            type="text"
            readOnly
            value={currentUrl}
            className="min-w-0 flex-1 bg-transparent px-2 text-xs text-neutral-600 outline-none"
          />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Copy Link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

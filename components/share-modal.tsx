'use client';

import { useState } from 'react';
import { Check, Copy, Share2, X } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postTitle?: string;
  postUrl?: string;
}

interface ShareTarget {
  name: string;
  tone: string;
  href: (url: string) => string;
}

/** Encoded intent links. Instagram has no public web intent, so it is a copy action. */
const TARGETS: ShareTarget[] = [
  {
    name: 'Facebook',
    tone: 'bg-[#1877f2]',
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: 'X',
    tone: 'bg-black',
    href: (url) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
  },
  {
    name: 'WhatsApp',
    tone: 'bg-[#25d366]',
    href: (url) => `https://wa.me/?text=${encodeURIComponent(url)}`,
  },
];

export function ShareModal({
  isOpen,
  onClose,
  postTitle = 'Check out this cricket highlight on SprintNP',
  postUrl,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentUrl = postUrl ?? (typeof window !== 'undefined' ? window.location.href : 'https://sprintnp.app');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const openTarget = (target: ShareTarget) => {
    window.open(target.href(currentUrl), '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div className="enter-material w-full max-w-md rounded-b-none rounded-t-[1.5rem] bg-white/90 p-6 backdrop-blur-2xl elevation-3 sm:rounded-[1.5rem]">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h3 className="type-title text-ink">Share</h3>
            <p className="type-caption mt-1 text-ink-secondary">
              {postTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-ink-tertiary hover:bg-black/[0.05] hover:text-ink"
          >
            <X className="size-[18px]" strokeWidth={1.8} />
          </button>
        </header>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {TARGETS.map((target) => (
            <button
              key={target.name}
              type="button"
              onClick={() => openTarget(target)}
              className="press flex flex-col items-center gap-2 rounded-2xl px-2 py-3.5 hover:bg-black/[0.04]"
            >
              <span className={`grid size-11 place-items-center rounded-2xl text-white ${target.tone}`}>
                <Share2 className="size-[18px]" strokeWidth={1.9} />
              </span>
              <span className="text-[11px] font-medium text-ink-secondary">{target.name}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-2xl bg-black/[0.04] p-2 pl-4">
          <input
            readOnly
            value={currentUrl}
            aria-label="Link to copy"
            onFocus={(event) => event.currentTarget.select()}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink-secondary outline-none"
          />
          <button
            type="button"
            onClick={copy}
            className="press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-white"
          >
            {copied ? <Check className="size-3.5" strokeWidth={2.4} /> : <Copy className="size-3.5" strokeWidth={2} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}

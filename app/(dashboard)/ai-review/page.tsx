import React from 'react';
import { Sparkles, Bot, Zap, ArrowRight } from 'lucide-react';

export default function AiReviewPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      {/* Sleek Glowing Icon */}
      <div className="relative mb-6">
        <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-amber-500 to-rose-500 opacity-30 blur-xl animate-pulse" />
        <div className="relative grid size-20 place-items-center rounded-3xl bg-black text-white shadow-2xl border border-white/20">
          <Sparkles className="size-10 text-amber-400" />
        </div>
      </div>

      {/* Badge */}
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-700 shadow-sm mb-3">
        <Zap className="size-3.5 fill-amber-500 text-amber-500" />
        SprintNP AI Coach Engine
      </span>

      {/* Title & Coming Soon */}
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 leading-tight">
        AI Review
      </h1>
      
      <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-rose-600 to-purple-600">
        Coming Soon...
      </p>

      <p className="mt-4 max-w-md text-xs sm:text-sm text-neutral-500 leading-relaxed">
        Automated biomechanics pose estimation, batting shot classification, and bowling speed tracking powered by SprintNP AI.
      </p>

      {/* Concept Card */}
      <div className="mt-10 w-full max-w-md rounded-3xl border border-black/[0.08] bg-white p-6 shadow-xl text-left space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-neutral-800" />
            <h3 className="text-xs font-bold text-neutral-900">What to expect</h3>
          </div>
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">v2.0 Preview</span>
        </div>

        <ul className="space-y-2.5 text-xs text-neutral-600">
          <li className="flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-amber-500" />
            <span>Instant stance & backswing wrist path detection</span>
          </li>
          <li className="flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-amber-500" />
            <span>Release point & bowling seam alignment score</span>
          </li>
          <li className="flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-amber-500" />
            <span>Personalized AI drills recommended for your technique</span>
          </li>
        </ul>

        <div className="pt-2">
          <button disabled className="w-full flex items-center justify-center gap-2 rounded-2xl bg-neutral-100 py-2.5 text-xs font-semibold text-neutral-400 cursor-not-allowed">
            <span>Notify Me Upon Launch</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

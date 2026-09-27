import React from 'react';
import { Compass, Users, Sparkles } from 'lucide-react';

export default function CoachesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-black/[0.07] pb-5">
        <span className="inline-block text-[11px] font-bold text-amber-600 tracking-wider uppercase">SprintNP Coaches</span>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-neutral-900">
          Coaches Section
        </h1>
        <p className="mt-2 text-xs text-neutral-500">
          Connect with verified cricket coaches for video analysis and technique feedback.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* FRIEND'S INTEGRATION SLOT FOR COACHES PAGE                                */}
      {/* Paste your coaches list, gig cards, and coach profile components below.  */}
      {/* ========================================================================= */}
      
      <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50/70 p-12 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white shadow-md text-amber-600 mb-4 border border-black/[0.06]">
          <Users className="size-7" />
        </div>
        <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Coaches Directory Slot</h2>
        <p className="mt-2 max-w-md mx-auto text-xs text-neutral-500 leading-relaxed">
          This section is ready for your friend to paste their Coaches Marketplace & Professional Profile components!
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
          {[
            { title: 'Technique Coaches', count: '14 Coaches Active', icon: Compass },
            { title: 'Bowling Specialists', count: '8 Coaches Active', icon: Sparkles },
            { title: 'Batting Analysts', count: '12 Coaches Active', icon: Users }
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.title} className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
                <Icon className="size-5 text-amber-600 mb-2" />
                <h3 className="text-xs font-bold text-neutral-900">{c.title}</h3>
                <p className="text-[11px] text-neutral-400 mt-1">{c.count}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

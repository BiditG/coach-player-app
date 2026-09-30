import React from 'react';
import { User, ShieldCheck, Award, Activity, Settings } from 'lucide-react';
import { requireUser } from '@/lib/auth';

export default async function ProfilePage() {
  const profile = await requireUser();
  const initial = profile.full_name?.[0] || profile.email[0]?.toUpperCase() || 'P';

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-neutral-800 to-black text-2xl font-bold text-white shadow-md">
            {initial}
          </div>
          <div className="text-center sm:text-left min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
                {profile.full_name || 'SprintNP Player'}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                <ShieldCheck className="size-3 text-amber-600" />
                {profile.role}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">{profile.email}</p>
            <p className="mt-2 text-xs font-medium text-neutral-600">Cricket Athlete & Player on SprintNP</p>
          </div>
          <button className="flex items-center gap-1.5 rounded-full border border-black/[0.08] px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition">
            <Settings className="size-3.5" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FRIEND'S INTEGRATION SLOT FOR PROFILE PAGE                                */}
      {/* Paste your player bio, statistics, match history, & media grid below.   */}
      {/* ========================================================================= */}

      <div className="rounded-3xl border border-dashed border-neutral-300 bg-neutral-50/70 p-12 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white shadow-md text-neutral-800 mb-4 border border-black/[0.06]">
          <User className="size-7" />
        </div>
        <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Player Profile Integration Slot</h2>
        <p className="mt-2 max-w-md mx-auto text-xs text-neutral-500 leading-relaxed">
          This section is ready for your friend to paste her complete Player Profile, Career Stats, Match History, and Media Gallery components!
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
          {[
            { label: 'Batting Avg', value: '42.5', icon: Activity },
            { label: 'Highest Score', value: '112*', icon: Award },
            { label: 'Coach Medals', value: '18 Medals', icon: ShieldCheck }
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
                <Icon className="size-5 text-amber-600 mb-1" />
                <p className="text-[11px] font-semibold text-neutral-400">{s.label}</p>
                <p className="text-lg font-extrabold text-neutral-900 mt-0.5">{s.value}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

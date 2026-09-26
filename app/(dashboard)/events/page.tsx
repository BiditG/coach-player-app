'use client';

import React, { useState } from 'react';
import { Calendar, MapPin, Plus, ShieldCheck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { CricketEvent, EventSubmitModal } from '@/components/event-submit-modal';

const MOCK_EVENTS: CricketEvent[] = [
  {
    id: 'evt-1',
    title: 'SprintNP All-India U-19 Pace Bowling Trials 2026',
    organizer: 'SprintNP Academy & BCCI Certified Coaches',
    category: 'Selection Trials',
    date: 'Oct 15, 2026',
    time: '08:00 AM - 04:00 PM',
    venue: 'Wankhede Stadium Training Nets, Mumbai',
    fee: 'Free Registration',
    bannerUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop',
    description: 'Open trials for fast bowlers under 19. Speed radar guns and high-speed video analysis provided on site.',
    status: 'APPROVED',
    isAcademyVerified: true,
  },
  {
    id: 'evt-2',
    title: 'High Performance Batting Masterclass with Coach Vikram',
    organizer: 'Apex Cricket Academy',
    category: 'Coaching Camp',
    date: 'Nov 02, 2026',
    time: '10:00 AM - 01:00 PM',
    venue: 'M. Chinnaswamy Indoor Facility, Bangalore',
    fee: '₹1,500 per player',
    bannerUrl: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=1200&auto=format&fit=crop',
    description: '3-hour masterclass on playing spin on turning wickets and mastering back-foot punch shots.',
    status: 'APPROVED',
    isAcademyVerified: true,
  }
];

export default function EventsPage() {
  const [events, setEvents] = useState<CricketEvent[]>(MOCK_EVENTS);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const handleEventSubmitted = (newEvent: CricketEvent) => {
    setEvents([newEvent, ...events]);
  };

  const handleApproveEvent = (eventId: string) => {
    setEvents(events.map((e) => (e.id === eventId ? { ...e, status: 'APPROVED' } : e)));
  };

  const filteredEvents = events.filter((e) => {
    if (activeFilter === 'All') return true;
    return e.category === activeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.07] pb-5">
        <div>
          <span className="inline-block text-[11px] font-bold text-amber-600 tracking-wider uppercase">SprintNP Events</span>
          <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-neutral-900">
            Upcoming Cricket Events
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Academy selection trials, tournaments, and coaching workshops organized by SprintNP and approved partners.
          </p>
        </div>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="self-start sm:self-auto flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-neutral-800 transition"
        >
          <Plus className="size-4 text-amber-400" />
          <span>Submit Event (Academy)</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 text-xs font-semibold">
        {['All', 'Selection Trials', 'Coaching Camp', 'Tournament', 'Workshop'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`rounded-full px-4 py-2 transition whitespace-nowrap ${
              activeFilter === filter
                ? 'bg-black text-white shadow-sm font-bold'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredEvents.map((evt) => (
          <div
            key={evt.id}
            className="group overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition hover:shadow-[0_12px_36px_rgba(0,0,0,0.07)] flex flex-col"
          >
            {/* Image Banner */}
            <div className="relative aspect-video w-full overflow-hidden bg-neutral-900">
              <img
                src={evt.bannerUrl}
                alt={evt.title}
                className="size-full object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="rounded-full bg-black/70 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                  {evt.category}
                </span>
                {evt.status === 'APPROVED' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-white">
                    <CheckCircle2 className="size-3" /> Approved
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-white">
                    <AlertCircle className="size-3" /> Pending Admin Approval
                  </span>
                )}
              </div>

              <div className="absolute bottom-4 right-4">
                <span className="rounded-full bg-white/90 backdrop-blur-md px-3 py-1 text-xs font-extrabold text-neutral-900 shadow-md">
                  {evt.fee}
                </span>
              </div>
            </div>

            {/* Event Content */}
            <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
                  <ShieldCheck className="size-4 text-amber-600" />
                  <span>{evt.organizer}</span>
                </div>

                <h3 className="mt-2 text-lg font-extrabold text-neutral-900 tracking-tight leading-snug">
                  {evt.title}
                </h3>

                <p className="mt-2 text-xs text-neutral-600 leading-relaxed line-clamp-2">
                  {evt.description}
                </p>
              </div>

              <div className="space-y-2 pt-4 border-t border-black/[0.06] text-xs font-medium text-neutral-600">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-neutral-400 shrink-0" />
                  <span>{evt.date} · {evt.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-neutral-400 shrink-0" />
                  <span className="truncate">{evt.venue}</span>
                </div>
              </div>

              {/* Admin Approval Control if pending */}
              {evt.status === 'PENDING_APPROVAL' && (
                <div className="pt-2">
                  <button
                    onClick={() => handleApproveEvent(evt.id)}
                    className="w-full rounded-2xl bg-amber-500 hover:bg-amber-600 py-2.5 text-xs font-bold text-white transition shadow-sm"
                  >
                    Approve Event as Admin
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Submit Modal */}
      <EventSubmitModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onEventSubmitted={handleEventSubmitted}
      />
    </div>
  );
}

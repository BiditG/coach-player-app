'use client';

import React, { useState } from 'react';
import { X, Calendar, MapPin, Building, DollarSign, UploadCloud, CheckCircle2 } from 'lucide-react';

export interface CricketEvent {
  id: string;
  title: string;
  organizer: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  fee: string;
  bannerUrl: string;
  description: string;
  status: 'APPROVED' | 'PENDING_APPROVAL';
  isAcademyVerified: boolean;
}

interface EventSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventSubmitted: (event: CricketEvent) => void;
}

export function EventSubmitModal({ isOpen, onClose, onEventSubmitted }: EventSubmitModalProps) {
  const [title, setTitle] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [category, setCategory] = useState('Trials');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [fee, setFee] = useState('Free');
  const [description, setDescription] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newEvent: CricketEvent = {
      id: `evt-${Date.now()}`,
      title: title || 'Cricket Event',
      organizer: organizer || 'SprintNP Academy Partner',
      category,
      date: date || 'Oct 20, 2026',
      time: time || '09:00 AM',
      venue: venue || 'Local Sports Ground',
      fee: fee || 'Free Registration',
      bannerUrl: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?q=80&w=1200&auto=format&fit=crop',
      description,
      status: 'PENDING_APPROVAL',
      isAcademyVerified: true,
    };

    onEventSubmitted(newEvent);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-black/[0.08] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">Submit Event for Approval</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Paid academies & organizers can request event listings on SprintNP</p>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-black transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {isSubmitted ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="size-12 text-emerald-500 mx-auto mb-3 animate-bounce" />
            <h3 className="text-lg font-bold text-neutral-900">Event Submitted for Admin Approval!</h3>
            <p className="mt-1 text-xs text-neutral-500 max-w-xs mx-auto">
              Our team will review your submission details. Once approved, it will appear on the SprintNP Events page.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Event Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mumbai U-19 Cricket Selection Trials 2026"
                className="w-full rounded-xl border border-black/[0.08] bg-neutral-50 px-3.5 py-2.5 text-xs outline-none focus:border-black focus:bg-white transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Academy / Organizer</label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 size-4 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                    placeholder="e.g. SprintNP Academy"
                    className="w-full rounded-xl border border-black/[0.08] bg-neutral-50 pl-9 pr-3 py-2.5 text-xs outline-none focus:border-black focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-black/[0.08] bg-neutral-50 px-3 py-2.5 text-xs outline-none focus:border-black focus:bg-white transition"
                >
                  <option value="Trials">Selection Trials</option>
                  <option value="Tournament">Tournament</option>
                  <option value="Coaching Camp">Coaching Camp</option>
                  <option value="Workshop">Skills Workshop</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 size-4 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="Oct 15, 2026"
                    className="w-full rounded-xl border border-black/[0.08] bg-neutral-50 pl-9 pr-3 py-2.5 text-xs outline-none focus:border-black focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Venue / City</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 size-4 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="Wankhede Stadium Nets, Mumbai"
                    className="w-full rounded-xl border border-black/[0.08] bg-neutral-50 pl-9 pr-3 py-2.5 text-xs outline-none focus:border-black focus:bg-white transition"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Registration Fee</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 size-4 text-neutral-400" />
                <input
                  type="text"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="Free or ₹500 Entry"
                  className="w-full rounded-xl border border-black/[0.08] bg-neutral-50 pl-9 pr-3 py-2.5 text-xs outline-none focus:border-black focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">Description & Eligibility</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mention age group, gear required, and contact details..."
                className="w-full rounded-xl border border-black/[0.08] bg-neutral-50 px-3.5 py-2.5 text-xs outline-none focus:border-black focus:bg-white transition"
              />
            </div>

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
                Submit for Approval
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

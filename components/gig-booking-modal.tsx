'use client';

import { useState, useTransition } from 'react';
import { Upload, X } from 'lucide-react';
import { registerPlayerVideo } from '@/lib/reviews/video-upload';
import { beginCheckout } from '@/app/(dashboard)/dashboard/orders/actions';

type Package = { id: string; name: string; description: string; price_cents: number };

export function GigBookingModal({ serviceId, packages }: { serviceId: string; packages: Package[] }) {
  const [open, setOpen] = useState(false);
  const [packageId, setPackageId] = useState(packages[0]?.id || '');
  const [video, setVideo] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();

  const submit = () => startTransition(async () => {
    try {
      if (!video) throw new Error('Upload the main video for this review.');
      if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(video.type)) throw new Error('Use an MP4, MOV, or WebM video.');
      if (video.size > 500 * 1024 * 1024) throw new Error('Videos must be under 500 MB.');
      setMessage('Uploading your video…');
      const signed = await fetch('/api/r2/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: video.name, type: video.type, size: video.size }) });
      const payload = await signed.json(); if (!signed.ok) throw new Error(payload.error || 'Unable to prepare upload.');
      const upload = await fetch(payload.uploadUrl, { method: 'PUT', headers: { 'Content-Type': video.type }, body: video });
      if (!upload.ok) throw new Error('Video upload failed. Check the Cloudflare R2 CORS rule for this app origin, then retry.');
      const saved = await registerPlayerVideo({ name: video.name, storageKey: `r2:${payload.key}`, mimeType: video.type, fileSize: video.size });
      const form = new FormData();
      form.set('service_id', serviceId); form.set('package_id', packageId); form.set('video_id', saved.id); form.set('requirements', notes);
      await beginCheckout(form);
    } catch (error) { setMessage(error instanceof TypeError ? 'Cloudflare R2 blocked this browser upload. Add this app origin to the bucket CORS rule, then retry.' : error instanceof Error ? error.message : 'Could not start booking.'); }
  });

  return <><button type="button" onClick={() => setOpen(true)} className="primary-button w-full">Book this coach</button>{open && <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-0 backdrop-blur-sm sm:place-items-center sm:p-6"><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-t-[28px] bg-white p-6 shadow-[0_28px_90px_rgba(0,0,0,.25)] sm:rounded-[28px]"><div className="flex items-start justify-between"><div><p className="eyebrow">Book your review</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.045em]">Send your coach what matters.</h2></div><button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full bg-neutral-100 active:scale-95"><X className="size-4" /></button></div><div className="mt-6 space-y-5"><fieldset><legend className="text-xs font-semibold">1 · Pick a package</legend><div className="mt-2 grid gap-2">{packages.map(item => <label key={item.id} className={`flex cursor-pointer justify-between rounded-2xl border p-3 text-xs transition ${packageId === item.id ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-black/[.08]'}`}><span><b className="block">{item.name}</b><span className="mt-1 block opacity-65">{item.description}</span></span><input className="sr-only" type="radio" checked={packageId === item.id} onChange={() => setPackageId(item.id)} /><b>NPR {(item.price_cents / 100).toFixed(0)}</b></label>)}</div></fieldset><fieldset><legend className="text-xs font-semibold">2 · Upload your main video</legend><label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-black/[.18] bg-[#f7f7f8] px-4 py-6 text-xs font-medium transition hover:bg-white"><Upload className="size-4" />{video?.name || 'Choose a video'}<input className="sr-only" type="file" accept="video/mp4,video/webm,video/quicktime" onChange={event => setVideo(event.target.files?.[0] || null)} /></label><p className="mt-2 text-[11px] text-neutral-500">The next step lets you add 2 more videos and 5 images.</p></fieldset><fieldset><legend className="text-xs font-semibold">3 · What would you like help with?</legend><textarea value={notes} onChange={event => setNotes(event.target.value)} className="mt-2 min-h-24 w-full rounded-2xl border border-black/[.09] bg-[#fafafa] p-3 text-sm outline-none focus:border-black/40" placeholder="For example: timing against pace, front foot position, or bowling release." /></fieldset></div>{message && <p className="mt-4 text-xs text-neutral-600">{message}</p>}<button type="button" disabled={pending || !packages.length} onClick={submit} className="primary-button mt-6 w-full disabled:opacity-40">{pending ? 'Preparing payment…' : 'Continue to payment'}</button></section></div>}</>;
}

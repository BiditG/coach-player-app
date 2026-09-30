import Link from 'next/link';
import { Bell, CalendarDays, ClipboardCheck, ShoppingBag } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function NotificationsPage() {
  const user = await requireUser(); const supabase = await createClient();
  if (user.role !== 'PROFESSIONAL') {
    const { data: notifications } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    return <><p className="eyebrow">Notifications</p><h1 className="page-title mt-2">Stay in the loop.</h1><div className="surface mt-8 divide-y divide-black/[.055]">{notifications?.length ? notifications.map(notification => <div key={notification.id} className="p-5"><p className="text-[13px] font-semibold">{notification.title}</p><p className="mt-1 text-[12px] text-neutral-500">{notification.message}</p></div>) : <Empty />}</div></>;
  }
  const [{ data: orders }, { data: reviews }, { data: bookings }] = await Promise.all([
    supabase.from('orders').select('id,status,created_at,professional_services(gig_title)').eq('professional_id', user.id).neq('status', 'DRAFT').order('created_at', { ascending: false }),
    supabase.from('review_requests').select('id,status,created_at,focus_area,videos(original_filename)').eq('professional_id', user.id).order('created_at', { ascending: false }),
    supabase.from('bookings').select('id,status,starts_at,created_at,professional_services(gig_title)').eq('professional_id', user.id).order('created_at', { ascending: false }),
  ]);
  const activity = [
    ...(orders || []).map((order:any) => ({ id: `order-${order.id}`, icon: ShoppingBag, title: `New gig purchase: ${order.professional_services?.gig_title || 'Coaching gig'}`, body: `Order status: ${order.status.replaceAll('_', ' ')}`, date: order.created_at, href: '/professional' })),
    ...(reviews || []).map((review:any) => ({ id: `review-${review.id}`, icon: ClipboardCheck, title: 'New review request', body: `${review.videos?.original_filename || 'Player video'} · ${review.focus_area || 'General feedback'}`, date: review.created_at, href: `/professional/reviews/${review.id}` })),
    ...(bookings || []).map((booking:any) => ({ id: `booking-${booking.id}`, icon: CalendarDays, title: `Booking request: ${booking.professional_services?.gig_title || 'Coaching session'}`, body: `${booking.status.replaceAll('_', ' ')} · ${new Date(booking.starts_at).toLocaleString()}`, date: booking.created_at, href: '/professional' })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return <><p className="eyebrow">Notifications</p><h1 className="page-title mt-2">Player activity.</h1><p className="page-copy">New purchases, review requests, and booking updates appear here.</p><div className="surface mt-8 divide-y divide-black/[.055]">{activity.length ? activity.map(item => { const Icon = item.icon; return <Link key={item.id} href={item.href} className="flex items-start gap-4 p-5 transition hover:bg-neutral-50 active:scale-[.995]"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-neutral-100"><Icon className="size-4 text-neutral-500" /></span><span><span className="block text-[13px] font-semibold">{item.title}</span><span className="mt-1 block text-[12px] text-neutral-500">{item.body}</span><span className="mt-2 block text-[10px] text-neutral-400">{new Date(item.date).toLocaleString()}</span></span></Link> }) : <Empty />}</div></>;
}

function Empty() { return <div className="grid min-h-52 place-items-center p-6 text-center"><div><Bell className="mx-auto size-5 text-neutral-400" /><p className="mt-4 text-[13px] font-semibold">You are all caught up.</p><p className="mt-1 text-[12px] text-neutral-500">New player activity will show here.</p></div></div>; }

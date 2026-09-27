'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function beginCheckout(formData: FormData) {
  const user = await requireUser(); if (user.role === 'PROFESSIONAL') throw new Error('Coach accounts cannot purchase coaching.');
  const serviceId = String(formData.get('service_id') || ''); const packageId = String(formData.get('package_id') || ''); const videoId = String(formData.get('video_id') || ''); const requirements = String(formData.get('requirements') || '');
  const supabase = await createClient(); const [{ data: service }, { data: video }] = await Promise.all([supabase.from('professional_services').select('id,professional_id,turnaround_days').eq('id', serviceId).eq('is_published', true).single(), supabase.from('videos').select('id').eq('id', videoId).eq('user_id', user.id).eq('status', 'READY').is('deleted_at', null).single()]);
  if (!service || !video || service.professional_id === user.id) throw new Error('Choose an available package and video.');
  const { data: packageOption } = await supabase.from('service_packages').select('id,price_cents,delivery_days').eq('id', packageId).eq('service_id', service.id).eq('is_active', true).single();
  if (!packageOption) throw new Error('Choose a coaching package.');
  const { data: order, error } = await supabase.from('orders').insert({ buyer_id: user.id, professional_id: service.professional_id, service_id: service.id, package_id: packageOption.id, status: 'DRAFT', requirements: requirements || null, subtotal_cents: packageOption.price_cents, total_cents: packageOption.price_cents, delivery_due_at: new Date(Date.now() + packageOption.delivery_days * 86400000).toISOString() }).select('id').single();
  if (error || !order) throw new Error(error?.message || 'Unable to start checkout.');
  redirect(`/checkout/${order.id}?video=${video.id}`);
}

export async function confirmPayment(formData: FormData) {
  const user = await requireUser(); const orderId = String(formData.get('order_id') || ''); const videoId = String(formData.get('video_id') || ''); const supabase = await createClient();
  const { data: order } = await supabase.from('orders').select('id,professional_id,service_id,status').eq('id', orderId).eq('buyer_id', user.id).single();
  if (!order || order.status !== 'DRAFT') throw new Error('This payment session is unavailable.');
  const { data: video } = await supabase.from('videos').select('id').eq('id', videoId).eq('user_id', user.id).eq('status', 'READY').is('deleted_at', null).single();
  if (!video) throw new Error('Choose a ready video from your library.');
  const { error: orderError } = await supabase.from('orders').update({ status: 'PENDING', review_video_id: video.id }).eq('id', order.id).eq('buyer_id', user.id).eq('status', 'DRAFT'); if (orderError) throw new Error(orderError.message);
  const { data: review, error: reviewError } = await supabase.from('review_requests').select('id').eq('order_id', order.id).single();
  if (reviewError || !review) throw new Error('Review creation failed. Please contact support with your order number.');
  redirect(`/reviews/${review.id}`);
}

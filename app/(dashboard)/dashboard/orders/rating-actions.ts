'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function submitMarketplaceRating(formData: FormData) {
  const user = await requireUser(); const orderId = String(formData.get('order_id') || '');
  const rating = Number(formData.get('rating')); const body = String(formData.get('body') || '').trim();
  if (!orderId || !Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('Choose a rating from one to five stars.');
  const supabase = await createClient();
  const { data: order } = await supabase.from('orders').select('id,buyer_id,professional_id,status').eq('id', orderId).eq('buyer_id', user.id).single();
  if (!order || order.status !== 'COMPLETED') throw new Error('Ratings are available after the order is completed.');
  const { error } = await supabase.from('marketplace_reviews').upsert({ order_id: order.id, buyer_id: user.id, professional_id: order.professional_id, rating, body: body || null }, { onConflict: 'order_id' });
  if (error) throw new Error('Unable to save your rating.');
  revalidatePath(`/dashboard/orders/${orderId}`); revalidatePath('/explore'); revalidatePath('/professionals');
}

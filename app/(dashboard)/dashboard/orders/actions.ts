'use server';

import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const DAY_IN_MS = 86_400_000;

export async function createOrder(formData: FormData) {
  const user = await requireUser();

  if (user.role === 'PROFESSIONAL') {
    throw new Error('Coach accounts cannot create orders.');
  }

  const serviceId = String(formData.get('service_id') || '');
  const packageId = String(formData.get('package_id') || '');
  const requirements = String(formData.get('requirements') || '');

  const supabase = await createClient();

  const { data: service } = await supabase
    .from('professional_services')
    .select('id,professional_id,turnaround_days')
    .eq('id', serviceId)
    .eq('is_published', true)
    .single();

  if (!service || service.professional_id === user.id) {
    throw new Error('This coach offer is unavailable.');
  }

  const { data: packageOption } = packageId
    ? await supabase
        .from('service_packages')
        .select('id,price_cents,delivery_days')
        .eq('id', packageId)
        .eq('service_id', service.id)
        .eq('is_active', true)
        .single()
    : { data: null };

  const days = packageOption?.delivery_days || service.turnaround_days;
  const total = packageOption?.price_cents || 0;

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      buyer_id: user.id,
      professional_id: service.professional_id,
      service_id: service.id,
      package_id: packageOption?.id || null,
      status: 'PENDING',
      requirements: requirements || null,
      subtotal_cents: total,
      total_cents: total,
      delivery_due_at: new Date(Date.now() + days * DAY_IN_MS).toISOString(),
    })
    .select('id')
    .single();

  if (error || !order) throw new Error(error?.message || 'Unable to create order.');

  redirect(`/dashboard/orders/${order.id}`);
}

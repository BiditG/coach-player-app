'use client';
import { useTransition } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { confirmPayment } from '@/app/(dashboard)/dashboard/orders/actions';
export function CheckoutMediaSubmission({ orderId, videoId }: { orderId: string; videoId: string }) { const [pending,startTransition]=useTransition(); return <button type="button" onClick={()=>startTransition(async()=>{const form=new FormData();form.set('order_id',orderId);form.set('video_id',videoId);form.set('media','[]');await confirmPayment(form)})} disabled={pending} className="primary-button mt-6 w-full disabled:opacity-40"><CheckCircle2 className="mr-1.5 size-3.5"/>{pending?'Confirming payment…':'I have completed payment'}</button>; }

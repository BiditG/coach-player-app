'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function sendMessage(formData: FormData) {
  const user = await requireUser();
  const conversationId = String(formData.get('conversation_id') || '');
  const body = String(formData.get('body') || '').trim();

  if (!conversationId || !body) return;

  const supabase = await createClient();

  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, kind: 'TEXT', body });

  if (error) throw new Error('Unable to send message.');

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath('/messages');
}

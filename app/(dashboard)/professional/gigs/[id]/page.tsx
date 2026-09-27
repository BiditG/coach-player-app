import { notFound } from 'next/navigation';
import { requireProfessional } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { GigEditor } from '@/components/gig-editor';

export default async function EditGig({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireProfessional();
  const { id } = await params;
  const supabase = await createClient();

  const { data: gig } = await supabase
    .from('professional_services')
    .select('*')
    .eq('id', id)
    .eq('professional_id', profile.id)
    .single();

  if (!gig) notFound();

  return <GigEditor gig={gig} />;
}

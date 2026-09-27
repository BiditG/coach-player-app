import { redirect } from 'next/navigation';
import { requireProfessional } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { GigEditor } from '@/components/gig-editor';

const MAX_GIGS = 3;

export default async function NewGig() {
  const profile = await requireProfessional();
  const supabase = await createClient();

  const { count } = await supabase
    .from('professional_services')
    .select('*', { count: 'exact', head: true })
    .eq('professional_id', profile.id);

  if ((count ?? 0) >= MAX_GIGS) redirect('/professional/gigs');

  return <GigEditor />;
}

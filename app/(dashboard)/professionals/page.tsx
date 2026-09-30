import { ExploreCoaches } from '@/components/explore-coaches';
import { createClient } from '@/lib/supabase/server';

export default async function ExplorePage() {
  const supabase = await createClient();
  const [{ data: offers }, { data: profiles }] = await Promise.all([
    supabase.from('professional_services').select('*').eq('is_published', true).order('created_at', { ascending: false }),
    supabase.from('professional_profiles').select('user_id,rating,reviews_completed'),
  ]);
  const ratingByCoach = new Map((profiles || []).map(profile => [profile.user_id, profile]));
  const ranked = (offers || []).map(offer => ({ ...offer, coach: ratingByCoach.get(offer.professional_id) || null })).sort((a, b) => Number(b.coach?.rating || 0) - Number(a.coach?.rating || 0) || Number(b.coach?.reviews_completed || 0) - Number(a.coach?.reviews_completed || 0));
  return <ExploreCoaches offers={ranked} />;
}

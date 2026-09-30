import { requireUser } from '@/lib/auth';
import { FeedList } from '@/components/feed-list';

export default async function FeedPage() {
  const profile = await requireUser();
  return <FeedList userRole={profile.role} />;
}

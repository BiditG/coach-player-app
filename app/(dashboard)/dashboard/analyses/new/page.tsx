import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAnalysis } from '../actions';
import { Sparkles, UserRound } from 'lucide-react';

const FIELD = 'mt-3 w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm';

export default async function NewAnalysis() {
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: videos } = await supabase
    .from('videos')
    .select('id,original_filename')
    .eq('user_id', profile.id)
    .eq('status', 'READY')
    .is('deleted_at', null);

  if (!videos?.length) {
    return (
      <div className="surface p-8">
        <h1 className="page-title">Choose a video first</h1>
        <p className="mt-3 text-neutral-500">Upload and prepare a video before requesting analysis.</p>
        <Link href="/dashboard/upload" className="mt-6 inline-block rounded-full bg-black px-4 py-2 text-sm text-white">
          Upload video
        </Link>
      </div>
    );
  }

  return (
    <form action={createAnalysis}>
      <p className="eyebrow">New request</p>
      <h1 className="page-title mt-2">Create an analysis</h1>

      <div className="surface mt-8 p-6">
        <label className="text-sm font-medium">1. Choose video</label>
        <select name="video_id" className={FIELD}>
          {videos.map((video) => (
            <option key={video.id} value={video.id}>
              {video.original_filename}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium">2. Choose analysis type</p>

        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="surface cursor-pointer p-6">
            <input defaultChecked type="radio" name="analysis_type" value="AI" className="sr-only" />
            <Sparkles className="size-5" />
            <h2 className="mt-8 text-lg font-semibold">AI Analysis</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">Get structured feedback powered by AI.</p>
          </label>

          <label className="surface cursor-pointer p-6">
            <input type="radio" name="analysis_type" value="PROFESSIONAL" className="sr-only" />
            <UserRound className="size-5" />
            <h2 className="mt-8 text-lg font-semibold">Professional Analysis</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Receive personalized feedback from an experienced reviewer.
            </p>
          </label>
        </div>
      </div>

      <div className="surface mt-5 p-6">
        <label className="text-sm font-medium">3. What would you like us to focus on?</label>
        <textarea
          name="notes"
          className="mt-3 min-h-28 w-full rounded-xl border border-black/10 p-3 text-sm"
          placeholder="Optional notes for your reviewer"
        />
      </div>

      <button className="mt-6 rounded-full bg-black px-5 py-3 text-sm font-medium text-white">
        Request analysis
      </button>
    </form>
  );
}

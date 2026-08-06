import { redirect } from 'next/navigation';
import { getTeamForUser, getUser } from '@/lib/db/queries';
import type { TeamDataWithMembers } from '@/lib/db/schema';

type TeamActionFunction<T> = (
  formData: FormData,
  team: TeamDataWithMembers
) => Promise<T>;

/**
 * Wraps a server action so it only runs for an authenticated user that
 * belongs to a team, and injects that team as the second argument.
 */
export function withTeam<T>(action: TeamActionFunction<T>) {
  return async (formData: FormData): Promise<T> => {
    const user = await getUser();
    if (!user) {
      redirect('/login');
    }

    const team = await getTeamForUser();
    if (!team) {
      throw new Error('Team not found for the current user.');
    }

    return action(formData, team);
  };
}

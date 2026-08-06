'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  users,
  teamMembers,
  invitations,
  activityLogs,
  ActivityType,
  type NewActivityLog,
} from '@/lib/db/schema';
import { getUser, getUserWithTeam, getTeamMemberRole } from '@/lib/db/queries';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function logActivity(
  teamId: number | null | undefined,
  userId: string,
  type: ActivityType,
  ipAddress?: string
) {
  if (!teamId) {
    return;
  }
  const newActivity: NewActivityLog = {
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || '',
  };
  await db.insert(activityLogs).values(newActivity);
}

export async function signOut() {
  const user = await getUser();
  if (user) {
    const userWithTeam = await getUserWithTeam(user.id);
    await logActivity(userWithTeam?.teamId, user.id, ActivityType.SIGN_OUT);
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
}

type UpdateAccountState = {
  name?: string;
  error?: string;
  success?: string;
};

// email is intentionally NOT editable here. Changing public.users.email
// without also changing the Supabase Auth identity (auth.users.email) left
// the two out of sync: subsequent re-auth (updatePassword, deleteAccount)
// calls supabase.auth.signInWithPassword({ email: user.email, ... }) using
// the already-updated public.users.email, which Supabase Auth no longer
// recognizes — a self-lockout. Properly keeping both in sync requires
// driving the change through supabase.auth.updateUser({ email }) (which
// itself requires a confirmation round-trip) plus a sync mechanism back to
// public.users; that is out of scope for this starter. Name-only update
// removes the vulnerable path entirely.
const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

export async function updateAccount(
  _prevState: UpdateAccountState,
  formData: FormData
): Promise<UpdateAccountState> {
  const user = await getUser();
  if (!user) {
    return { error: 'User not authenticated' };
  }

  const result = updateAccountSchema.safeParse({
    name: formData.get('name'),
  });
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Invalid input' };
  }
  const { name } = result.data;

  const userWithTeam = await getUserWithTeam(user.id);

  await Promise.all([
    db
      .update(users)
      .set({ name, updatedAt: new Date() })
      .where(eq(users.id, user.id)),
    logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_ACCOUNT),
  ]);

  revalidatePath('/dashboard/general');
  return { name, success: 'Account updated successfully.' };
}

type UpdatePasswordState = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  error?: string;
  success?: string;
};

const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(100),
    newPassword: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });

export async function updatePassword(
  _prevState: UpdatePasswordState,
  formData: FormData
): Promise<UpdatePasswordState> {
  const user = await getUser();
  if (!user) {
    return { error: 'User not authenticated' };
  }

  const result = updatePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Invalid input' };
  }
  const { currentPassword, newPassword } = result.data;

  const supabase = await createClient();

  // supabase.auth.updateUser() does not itself verify the caller's current
  // password, so we re-authenticate first.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (reauthError) {
    return { error: 'Current password is incorrect.' };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { error: error.message };
  }

  const userWithTeam = await getUserWithTeam(user.id);
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD);

  return { success: 'Password updated successfully.' };
}

type DeleteAccountState = {
  password?: string;
  error?: string;
  success?: string;
};

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100),
});

export async function deleteAccount(
  _prevState: DeleteAccountState,
  formData: FormData
): Promise<DeleteAccountState> {
  const user = await getUser();
  if (!user) {
    return { error: 'User not authenticated' };
  }

  const result = deleteAccountSchema.safeParse({
    password: formData.get('password'),
  });
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Invalid input' };
  }

  const supabase = await createClient();
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: result.data.password,
  });
  if (reauthError) {
    return { error: 'Incorrect password. Account deletion failed.' };
  }

  const userWithTeam = await getUserWithTeam(user.id);
  // activity_logs.user_id is ON DELETE SET NULL, so this row (and this
  // action) survives the account deletion below for audit purposes.
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.DELETE_ACCOUNT);

  // Soft-delete first: if the admin API call below fails for any reason,
  // getUser() already stops returning this account (it filters on
  // isNull(deletedAt)), even though the underlying Supabase Auth user still
  // technically exists.
  await db
    .update(users)
    .set({
      deletedAt: new Date(),
      email: `${user.email}-deleted-${user.id}`,
    })
    .where(eq(users.id, user.id));

  await supabase.auth.signOut();

  // Hard delete via the Admin API. `users.id` has ON DELETE CASCADE from
  // auth.users, so this also removes the public.users row (and cascades to
  // team_members); activity_logs rows are preserved with user_id set null.
  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('Failed to delete Supabase Auth user:', deleteError);
  }

  redirect('/login');
}

type TeamActionState = {
  error?: string;
  success?: string;
};

const removeTeamMemberSchema = z.object({
  memberId: z.coerce.number(),
});

export async function removeTeamMember(
  _prevState: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const user = await getUser();
  if (!user) {
    return { error: 'User not authenticated' };
  }

  const result = removeTeamMemberSchema.safeParse({
    memberId: formData.get('memberId'),
  });
  if (!result.success) {
    return { error: 'Invalid team member.' };
  }

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) {
    return { error: 'You are not part of a team.' };
  }

  // Vertical privilege escalation guard: only the team owner may remove a
  // member (including, potentially, another owner). Without this, any plain
  // member could delete the real owner and take over the team. The role is
  // read from team_members — never trusted from the client.
  const role = await getTeamMemberRole(user.id, userWithTeam.teamId);
  if (role !== 'owner') {
    return { error: 'Only a team owner can remove team members.' };
  }

  await db
    .delete(teamMembers)
    .where(
      and(
        eq(teamMembers.id, result.data.memberId),
        eq(teamMembers.teamId, userWithTeam.teamId)
      )
    );

  await logActivity(
    userWithTeam.teamId,
    user.id,
    ActivityType.REMOVE_TEAM_MEMBER
  );

  revalidatePath('/dashboard');
  return { success: 'Team member removed successfully.' };
}

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'owner']),
});

export async function inviteTeamMember(
  _prevState: TeamActionState,
  formData: FormData
): Promise<TeamActionState> {
  const user = await getUser();
  if (!user) {
    return { error: 'User not authenticated' };
  }

  const result = inviteTeamMemberSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  });
  if (!result.success) {
    return { error: result.error.issues[0]?.message ?? 'Invalid input' };
  }
  const { email, role: invitedRole } = result.data;

  const userWithTeam = await getUserWithTeam(user.id);
  if (!userWithTeam?.teamId) {
    return { error: 'You are not part of a team.' };
  }

  // Vertical privilege escalation guard: only the team owner may invite new
  // members. The invite schema accepts role: 'owner', so without this check
  // any plain member could mint a colluding owner account. Gating the whole
  // action on owner also means a member can never reach the role: 'owner'
  // branch below — no separate "no member can invite an owner" check needed.
  const role = await getTeamMemberRole(user.id, userWithTeam.teamId);
  if (role !== 'owner') {
    return { error: 'Only a team owner can invite new members.' };
  }

  const existingMember = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(
      and(
        eq(users.email, email),
        eq(teamMembers.teamId, userWithTeam.teamId)
      )
    )
    .limit(1);

  if (existingMember.length > 0) {
    return { error: 'User is already a member of this team.' };
  }

  const existingInvitation = await db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.email, email),
        eq(invitations.teamId, userWithTeam.teamId),
        eq(invitations.status, 'pending')
      )
    )
    .limit(1);

  if (existingInvitation.length > 0) {
    return { error: 'An invitation has already been sent to this email.' };
  }

  await db.insert(invitations).values({
    teamId: userWithTeam.teamId,
    email,
    role: invitedRole,
    invitedBy: user.id,
    status: 'pending',
  });

  // TODO: send the invitation email (Resend) — out of scope for this
  // Supabase Auth migration.

  await logActivity(
    userWithTeam.teamId,
    user.id,
    ActivityType.INVITE_TEAM_MEMBER
  );

  revalidatePath('/dashboard');
  return { success: 'Invitation sent successfully.' };
}

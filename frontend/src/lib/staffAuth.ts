import { isSupabaseConfigured, rememberSession, requireSupabase } from './supabaseClient.js';
import type { StaffRole } from '../admin/types';

const STAFF_ROLE: Record<StaffRole, string> = {
  admin: 'owner_admin',
  dietitian: 'dietitian_staff',
  kitchen: 'kitchen_staff',
  delivery: 'delivery_staff',
};

const STAFF_PROFILE_ROLES = new Set<string>([
  'owner_admin',
  'dietitian_staff',
  'kitchen_staff',
  'delivery_staff',
]);

/** Supabase `profiles.role` values used for staff panels — not the client app. */
export function isStaffProfileRole(role: string | null | undefined) {
  return typeof role === 'string' && STAFF_PROFILE_ROLES.has(role);
}

export function supabaseRoleForStaff(role: StaffRole): string {
  return STAFF_ROLE[role];
}

export async function signInStaffToSupabase(
  email: string,
  password: string,
  panelRole?: StaffRole,
) {
  if (!isSupabaseConfigured) return { ok: true as const, skipped: true };
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error || !data.session?.access_token) {
    return { ok: false as const, message: error?.message || 'Staff sign-in to the backend failed.' };
  }
  await rememberSession(data.session);
  const userId = data.session.user.id;
  const appRole = await client
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  const backendRole = appRole.data?.role as string | undefined;
  const expected = panelRole ? supabaseRoleForStaff(panelRole) : null;
  if (
    expected
    && backendRole
    && backendRole !== expected
    && backendRole !== 'owner_admin'
  ) {
    await client.auth.signOut();
    return {
      ok: false as const,
      message: `This account is not authorized for the ${panelRole} panel.`,
    };
  }
  return { ok: true as const, userId, backendRole };
}

export async function signOutStaffFromSupabase() {
  if (!isSupabaseConfigured) return;
  try {
    await requireSupabase().auth.signOut();
  } catch {
    // Local staff session can still end.
  }
}
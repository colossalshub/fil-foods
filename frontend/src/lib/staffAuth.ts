import { isSupabaseConfigured, rememberSession, requireSupabase } from './supabaseClient.js';
import type { StaffRole } from '../admin/types';

const STAFF_ROLE: Record<StaffRole, string> = {
  admin: 'owner_admin',
  dietitian: 'dietitian_staff',
  kitchen: 'kitchen_staff',
  delivery: 'delivery_staff',
};

export function supabaseRoleForStaff(role: StaffRole): string {
  return STAFF_ROLE[role];
}

export async function signInStaffToSupabase(email: string, password: string) {
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
  return { ok: true as const, userId, backendRole: appRole.data?.role as string | undefined };
}

export async function signOutStaffFromSupabase() {
  if (!isSupabaseConfigured) return;
  try {
    await requireSupabase().auth.signOut();
  } catch {
    // Local staff session can still end.
  }
}
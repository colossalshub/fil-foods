import { ensureSession, isSupabaseConfigured, rememberSession, requireSupabase } from './supabaseClient.js';
import { fetchOwnStaffProfile, staffRoleFromDb } from './staffBackend.js';
import type { StaffPublic, StaffRole } from '../admin/types';

const STAFF_ROLE: Record<StaffRole, string> = {
  admin: 'owner_admin',
  dietitian: 'dietitian_staff',
  kitchen: 'kitchen_staff',
  delivery: 'delivery_staff',
};

/** Supabase `profiles.role` values used for staff panels — not the client app. */
export function isStaffProfileRole(role: string | null | undefined) {
  return staffRoleFromDb(role) !== null;
}

export function supabaseRoleForStaff(role: StaffRole): string {
  return STAFF_ROLE[role];
}

export type StaffSignIn =
  | { ok: true; skipped: true }
  | { ok: true; skipped?: false; account: StaffPublic }
  | { ok: false; reason: 'credentials' | 'not_staff' | 'disabled' | 'network'; message: string };

/**
 * Backend-first staff sign-in: the Supabase profile decides the role. The caller checks the
 * panel with `authorizePanel` so a wrong-panel login shows the same message as the local store.
 */
export async function signInStaffToSupabase(email: string, password: string): Promise<StaffSignIn> {
  if (!isSupabaseConfigured) return { ok: true, skipped: true };
  const client = requireSupabase();
  let data;
  try {
    const result = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (result.error || !result.data.session?.access_token) {
      const message = result.error?.message || '';
      if (/fetch|network/i.test(message)) return { ok: false, reason: 'network', message };
      return { ok: false, reason: 'credentials', message };
    }
    data = result.data;
  } catch (error) {
    return { ok: false, reason: 'network', message: (error as Error).message };
  }
  await rememberSession(data.session);
  const profile = await fetchOwnStaffProfile(data.session.user.id);
  if (!profile.ok || !profile.value) {
    await signOutStaffFromSupabase();
    return { ok: false, reason: 'not_staff', message: profile.ok ? '' : profile.message };
  }
  if (profile.value.disabled) {
    await signOutStaffFromSupabase();
    return { ok: false, reason: 'disabled', message: '' };
  }
  return { ok: true, account: profile.value };
}

/** Restores a remembered Supabase staff session (refreshing the token when needed). */
export async function restoreStaffSession(): Promise<StaffPublic | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const session = await ensureSession();
    const userId = session?.user?.id;
    if (!userId) return null;
    const profile = await fetchOwnStaffProfile(userId);
    if (!profile.ok || !profile.value || profile.value.disabled) return null;
    return profile.value;
  } catch {
    return null;
  }
}

export async function signOutStaffFromSupabase() {
  if (!isSupabaseConfigured) return;
  try {
    await requireSupabase().auth.signOut();
  } catch {
    // Local staff session can still end.
  }
}

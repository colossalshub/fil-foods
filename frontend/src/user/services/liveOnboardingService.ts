// USR-01 step 2–3 on a live project: the onboarding answers (personal details, Family Member
// recipient, allergies, health conditions, restrictions) are saved to Supabase, not only the device.
import type { OnboardingInput, PublicUser, ServiceResult, User } from '../types';
import { ensureSession, requireSupabase } from '../../lib/supabaseClient.js';
import { MSG } from '../data/messages.js';
import { TERMS_VERSION } from '../data/terms.js';
import { getDb } from '../data/mockStore.js';
import { completeOnboarding } from './authService.js';
import { saveMealRecipientWithBackend } from './backendOrderService.js';
import { saveRemoteAllergies, saveRemoteDiet, saveRemoteHealth } from './remoteProfileService.js';
import { liveUserFromProfile } from './liveAuthService.js';

/** In-memory copy of the live account so the shared onboarding validation can run on it. */
function mirrorLiveUser(user: PublicUser): User {
  const db = getDb();
  const existing = db.users.find((item) => item.id === user.id);
  if (existing) return existing;
  const mirror: User = {
    id: user.id,
    accountFor: user.accountFor || 'self',
    mealRecipient: user.mealRecipient,
    firstName: user.firstName || '',
    middleName: user.middleName || '',
    lastName: user.lastName || '',
    suffix: user.suffix || '',
    contactNumber: user.contactNumber || '',
    email: user.email || '',
    address: user.address || '',
    username: user.username,
    passwordHash: null,
    verified: true,
    profileComplete: false,
    inactive: false,
    locked: false,
    failedAttempts: 0,
    termsAcceptedAt: user.termsAcceptedAt,
    termsAcceptedVersion: user.termsAcceptedVersion || null,
    authEvents: [],
    sessionVersion: 1,
  };
  db.users.push(mirror);
  return mirror;
}

export function remoteSaveMessage(error: { message?: string; code?: string } | null | undefined) {
  const raw = String(error?.message || '');
  if (error?.code === '23505' || /duplicate key/i.test(raw)) return MSG.duplicateUser;
  return raw || 'Could not save. Try again.';
}

export async function completeOnboardingLive(user: PublicUser, input: OnboardingInput): Promise<ServiceResult> {
  mirrorLiveUser(user);
  const local = completeOnboarding(user.id, input);
  if (!local.ok || !local.user) return local;
  const done = local.user as PublicUser;

  const session = await ensureSession();
  if (!session?.access_token) return { ok: false, messages: ['Your session has expired. Please log in again.'] };
  const client = requireSupabase();
  const auth = `Bearer ${session.access_token}`;
  const now = new Date().toISOString();

  const profile = await client.from('profiles').update({
    first_name: done.firstName,
    middle_name: done.middleName || null,
    last_name: done.lastName,
    suffix: done.suffix || null,
    contact_number: done.contactNumber || null,
    address: done.address || null,
    terms_accepted_at: user.termsAcceptedAt || now,
    terms_version: user.termsAcceptedVersion || TERMS_VERSION,
    health_consent_at: now,
    updated_at: now,
  }).eq('id', user.id).setHeader('Authorization', auth);
  if (profile.error) return { ok: false, messages: [remoteSaveMessage(profile.error)] };

  let recipientRow: Record<string, unknown> | null = null;
  if (done.accountFor === 'family' && done.mealRecipient) {
    try {
      recipientRow = await saveMealRecipientWithBackend(done.mealRecipient, session) as Record<string, unknown>;
    } catch (error) {
      return { ok: false, messages: [(error as Error).message] };
    }
  }

  const source = done.accountFor === 'family' ? done.mealRecipient : getDb().users.find((item) => item.id === user.id);
  for (const step of [
    () => saveRemoteAllergies(user.id, source?.allergies || []),
    () => saveRemoteHealth(user.id, source?.healthConditions || []),
    () => saveRemoteDiet(user.id, source?.dietaryRestrictions || []),
  ]) {
    const saved = await step();
    if (!saved.ok) return { ok: false, messages: saved.messages || [saved.message || 'Could not save. Try again.'] };
  }

  // Marked complete last, so an interrupted save shows the onboarding again.
  const completed = await client.from('profiles').update({ profile_complete: true })
    .eq('id', user.id).select('*').single().setHeader('Authorization', auth);
  if (completed.error) return { ok: false, messages: [remoteSaveMessage(completed.error)] };
  const mapped = liveUserFromProfile(completed.data as Record<string, unknown>, recipientRow);
  return {
    ok: true,
    user: {
      ...mapped,
      mealRecipient: done.mealRecipient ? { ...done.mealRecipient, id: mapped.mealRecipient?.id || done.mealRecipient.id } : undefined,
    },
  };
}

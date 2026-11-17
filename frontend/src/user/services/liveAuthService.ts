// USR-01 / USR-02 / USR-04 / USR-05 / USR-33 against Supabase Auth on a live project.
// Demo mode (no Supabase settings) keeps the local stand-in in authService.ts.
import type { FieldMap, MealRecipientProfile, PublicUser, RegistrationInput, ServiceResult } from '../types';
import { forgetSession, isSupabaseConfigured, requireSupabase } from '../../lib/supabaseClient.js';
import { MSG } from '../data/messages.js';
import { TERMS_VERSION } from '../data/terms.js';
import { isValidContact, isValidEmail, trim, validateRegistration } from '../domain/registration.js';

type AuthErrorLike = { message?: string; code?: string; status?: number } | null | undefined;

export const LIVE_MAX_WRONG = 5;
export const LIVE_RESEND_SECONDS = 60;

export function waitMessage(seconds: number) {
  return `Please wait ${seconds} seconds before requesting a new code.`;
}

/** Supabase Auth errors → USR wording. */
export function authErrorMessage(error: AuthErrorLike, context: 'signup' | 'send' | 'verify' | 'password' = 'send') {
  const raw = String(error?.message || '');
  const code = String(error?.code || '');
  const wait = /after (\d+) seconds?/i.exec(raw);
  if (wait) return waitMessage(Number(wait[1]));
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || /rate limit/i.test(raw)) {
    return MSG.tooManyCodeRequests;
  }
  if (code === 'otp_expired' || /expired|invalid/i.test(raw)) {
    return context === 'verify' ? MSG.wrongCode : MSG.sendFailed;
  }
  if (code === 'user_already_exists' || code === 'email_exists' || /already registered/i.test(raw)) return MSG.duplicateEmail;
  if (code === 'same_password' || /different from the old password/i.test(raw)) return MSG.samePassword;
  if (code === 'weak_password' || /password should be/i.test(raw)) return MSG.shortPassword;
  if (code === 'email_address_invalid' || /email address .* invalid/i.test(raw)) return MSG.invalidEmail;
  if (context === 'send' || context === 'signup') return MSG.sendFailed;
  return raw || MSG.sendFailed;
}

type ProfileRow = Record<string, unknown>;
type RecipientRow = Record<string, unknown> | null | undefined;

function text(value: unknown) {
  return value == null ? '' : String(value);
}

/** Maps a `profiles` row (+ its meal recipient) to the app's user shape. */
export function liveUserFromProfile(profile: ProfileRow, recipient?: RecipientRow): PublicUser {
  const mealRecipient: MealRecipientProfile | undefined = recipient ? {
    id: text(recipient.id),
    firstName: text(recipient.first_name),
    middleName: text(recipient.middle_name),
    lastName: text(recipient.last_name),
    suffix: text(recipient.suffix),
    contactNumber: text(recipient.contact_number) || undefined,
    relationship: text(recipient.relationship),
    deliveryAddress: text(recipient.address),
    consentAt: text(recipient.created_at) || undefined,
    healthConditions: [],
    dietaryRestrictions: [],
    allergies: [],
    mealPreferences: { preferredCategories: [], dislikedIngredients: [] },
    nutritionalPreference: null,
    nutritionalPreferences: [],
    nutritionTargets: {},
  } as MealRecipientProfile : undefined;
  return {
    id: text(profile.id),
    role: text(profile.role) || 'client',
    accountFor: profile.account_for === 'family' ? 'family' : 'self',
    mealRecipient,
    firstName: text(profile.first_name),
    middleName: text(profile.middle_name),
    lastName: text(profile.last_name),
    suffix: text(profile.suffix),
    contactNumber: text(profile.contact_number),
    email: text(profile.email),
    address: text(profile.address),
    username: profile.username ? text(profile.username) : null,
    verified: Boolean(profile.is_verified),
    profileComplete: Boolean(profile.profile_complete),
    inactive: profile.is_active === false,
    termsAcceptedAt: profile.terms_accepted_at ? text(profile.terms_accepted_at) : null,
    termsAcceptedVersion: profile.terms_version ? text(profile.terms_version) : null,
    plan: null,
    biometricUnlock: { enabled: false },
  };
}

/** Loads the signed-in account's recipient (Family Member accounts) for liveUserFromProfile. */
export async function loadLiveRecipient(profile: ProfileRow, accessToken: string) {
  if (profile.account_for !== 'family' || !profile.meal_recipient_id) return null;
  const { data } = await requireSupabase()
    .from('meal_recipients')
    .select('*')
    .eq('id', String(profile.meal_recipient_id))
    .setHeader('Authorization', `Bearer ${accessToken}`)
    .maybeSingle();
  return data as RecipientRow;
}

// ---------------------------------------------------------------------------------------
// USR-01 sign-up

export interface PendingVerification {
  email: string;
  contactNumber?: string;
  firstName?: string;
}

export async function signUpLive(input: RegistrationInput): Promise<ServiceResult & { pending?: PendingVerification }> {
  const check = validateRegistration(input, []);
  if (!check.ok) return { ok: false, messages: check.messages, fields: check.fields };
  const client = requireSupabase();
  const email = trim(input.email).toLowerCase();
  const username = trim(input.username);
  const contactNumber = trim(input.contactNumber);

  const available = await client.rpc('check_signup_available', {
    p_username: username, p_email: email, p_contact: contactNumber,
  });
  if (!available.error && available.data) {
    const flags = available.data as { username_taken?: boolean; email_taken?: boolean; contact_taken?: boolean };
    const fields: FieldMap = {};
    const messages: string[] = [];
    if (flags.username_taken || flags.contact_taken) {
      messages.push(MSG.duplicateUser);
      if (flags.username_taken) fields.username = MSG.duplicateUser;
      if (flags.contact_taken) fields.contactNumber = MSG.duplicateUser;
    }
    if (flags.email_taken) {
      messages.push(MSG.duplicateEmail);
      fields.email = MSG.duplicateEmail;
    }
    if (messages.length) return { ok: false, messages, fields };
  }

  const { data, error } = await client.auth.signUp({
    email,
    password: String(input.password ?? ''),
    options: {
      data: {
        first_name: trim(input.firstName),
        middle_name: trim(input.middleName),
        last_name: trim(input.lastName),
        suffix: trim(input.suffix),
        username,
        contact_number: contactNumber,
        address: trim(input.address),
        account_for: input.accountFor === 'family' ? 'family' : 'self',
        terms_accepted: Boolean(input.acceptedTerms),
        terms_version: TERMS_VERSION,
        auth_provider: 'password',
      },
    },
  });
  if (error) {
    const message = authErrorMessage(error, 'signup');
    const field = message === MSG.duplicateEmail || message === MSG.invalidEmail ? 'email'
      : message === MSG.shortPassword ? 'password' : null;
    return { ok: false, messages: [message], fields: field ? { [field]: message } : {} };
  }
  // With email-enumeration protection Supabase answers an existing email with an empty identity list.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { ok: false, messages: [MSG.duplicateEmail], fields: { email: MSG.duplicateEmail } };
  }
  return { ok: true, pending: { email, contactNumber, firstName: trim(input.firstName) } };
}

// ---------------------------------------------------------------------------------------
// USR-33 codes (sign-up) and USR-04 codes (password reset), email only: no SMS provider yet.

export async function sendLiveCode(purpose: 'account' | 'reset', channel: string, email: string | undefined): Promise<ServiceResult> {
  if (channel !== 'email' || !email) return { ok: false, message: MSG.sendFailed };
  const client = requireSupabase();
  const { error } = purpose === 'account'
    ? await client.auth.resend({ type: 'signup', email })
    : await client.auth.resetPasswordForEmail(email);
  if (error) return { ok: false, message: authErrorMessage(error, 'send') };
  return { ok: true };
}

export async function verifyLiveCode(purpose: 'account' | 'reset', email: string | undefined, code: string): Promise<ServiceResult> {
  const token = String(code || '').trim();
  if (!token) return { ok: false, message: MSG.required };
  if (!email) return { ok: false, message: MSG.wrongCode };
  const client = requireSupabase();
  const { data, error } = await client.auth.verifyOtp({
    email,
    token,
    type: purpose === 'account' ? 'signup' : 'recovery',
  });
  if (error || !data.session) return { ok: false, message: authErrorMessage(error, 'verify') };
  if (purpose === 'account') {
    await finishLiveSignup(data.session.access_token, data.session.user?.user_metadata || {});
    await endLiveSession();
  }
  return { ok: true, grantId: purpose === 'reset' ? 'live' : undefined };
}

/** Copies sign-up details into the profile when the server trigger has not done it (older schema). */
async function finishLiveSignup(accessToken: string, meta: Record<string, unknown>) {
  const client = requireSupabase();
  const auth = `Bearer ${accessToken}`;
  const { data: profile } = await client.from('profiles').select('*').setHeader('Authorization', auth).maybeSingle();
  if (!profile) return;
  const patch: Record<string, unknown> = {};
  const copy = (column: string, value: unknown) => {
    const next = trim(value);
    if (next && !profile[column]) patch[column] = next;
  };
  copy('username', meta.username);
  copy('middle_name', meta.middle_name);
  copy('suffix', meta.suffix);
  copy('address', meta.address);
  if (isValidContact(trim(meta.contact_number))) copy('contact_number', meta.contact_number);
  if (meta.account_for === 'family' && profile.account_for !== 'family') patch.account_for = 'family';
  if (meta.terms_accepted && !profile.terms_accepted_at) {
    patch.terms_accepted_at = new Date().toISOString();
    patch.terms_version = trim(meta.terms_version) || TERMS_VERSION;
  }
  if (!Object.keys(patch).length) return;
  await client.from('profiles').update(patch).eq('id', String(profile.id)).setHeader('Authorization', auth);
}

export async function endLiveSession() {
  try {
    await requireSupabase().auth.signOut();
  } catch {
    // The stored copy is removed below.
  }
  await forgetSession().catch(() => {});
}

// ---------------------------------------------------------------------------------------
// USR-04 / USR-05 password reset

export async function lookupLiveReset(mode: string, value: string | undefined): Promise<ServiceResult & { email?: string; phone?: string }> {
  const raw = trim(value);
  if (mode === 'contact') {
    const contact = raw.replace(/\D/g, '');
    if (!isValidContact(contact)) return { ok: false, message: MSG.invalidContact };
  } else if (!isValidEmail(raw)) {
    return { ok: false, message: MSG.invalidEmail };
  }
  const { data, error } = await requireSupabase().rpc('password_reset_status', { p_mode: mode, p_value: raw });
  if (!error) {
    if (data === 'not_found') return { ok: false, message: mode === 'contact' ? MSG.noContact : MSG.noEmail };
    if (data === 'google_only') return { ok: false, message: MSG.googleOnly };
  }
  return mode === 'contact'
    ? { ok: true, phone: raw.replace(/\D/g, '') }
    : { ok: true, email: raw.toLowerCase() };
}

export function validateNewPassword(password: string, confirm: string) {
  const messages: string[] = [];
  if (!password || !confirm) messages.push(MSG.required);
  if (password !== confirm) messages.push(MSG.passwordMismatch);
  if (password.length < 8) messages.push(MSG.shortPassword);
  return [...new Set(messages)];
}

export async function updateLivePassword(password: string, confirm: string): Promise<ServiceResult> {
  const messages = validateNewPassword(password, confirm);
  if (messages.length) return { ok: false, messages };
  const { error } = await requireSupabase().auth.updateUser({ password });
  if (error) return { ok: false, messages: [authErrorMessage(error, 'password')] };
  await endLiveSession();
  return { ok: true, message: MSG.passwordUpdated };
}

export const liveAuthEnabled = isSupabaseConfigured;

// ---------------------------------------------------------------------------------------
// USR-33 code rules kept on the device for live codes (Supabase also rate-limits on the server).

export interface LiveCodeState {
  sentAt: number[];
  wrong: number;
}

export function newLiveCodeState(sentNow?: number): LiveCodeState {
  return { sentAt: sentNow ? [sentNow] : [], wrong: 0 };
}

/** null when a new code may be requested, otherwise the USR-33 message. */
export function liveSendBlock(state: LiveCodeState, now: number) {
  const recent = state.sentAt.filter((at) => now - at < 3_600_000);
  if (recent.length >= 5) return MSG.tooManyCodeRequests;
  const last = recent[recent.length - 1];
  if (last && now - last < LIVE_RESEND_SECONDS * 1000) {
    return waitMessage(Math.ceil((LIVE_RESEND_SECONDS * 1000 - (now - last)) / 1000));
  }
  return null;
}

export function recordLiveSend(state: LiveCodeState, now: number): LiveCodeState {
  return { sentAt: [...state.sentAt, now], wrong: 0 };
}

export function recordLiveWrong(state: LiveCodeState): { state: LiveCodeState; message: string } {
  const wrong = state.wrong + 1;
  return { state: { ...state, wrong }, message: wrong >= LIVE_MAX_WRONG ? MSG.tooManyWrong : MSG.wrongCode };
}

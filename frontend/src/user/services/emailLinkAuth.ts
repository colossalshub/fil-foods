// USR-01 / USR-04 / USR-33 with Supabase's default emails, which carry a link instead of a code.
// The 6-digit code path in liveAuthService still works once custom SMTP + {{ .Token }} templates are on.
import type { AuthTokenSession, PublicUser } from '../types';
import { parseAuthLink } from '../../lib/authLink.js';
import { getCurrentSupabaseProfile, rememberSession, requireSupabase } from '../../lib/supabaseClient.js';
import { isStaffProfileRole } from '../../lib/staffAuth.js';
import { MSG } from '../data/messages.js';
import {
  anyPendingSignup, clearPendingSignup, endLiveSession, finishLiveSignup, liveUserFromProfile, loadLiveRecipient,
  pendingSignupFor,
} from './liveAuthService.js';
import { loginWithSupabase } from './supabaseAuthService.js';

type SignedInUser = PublicUser & { accessToken: string; refreshToken?: string | null; expiresAt?: number | null };
type SessionLike = { access_token: string; refresh_token?: string | null; expires_at?: number | null; user?: { user_metadata?: Record<string, unknown> } | null };

export type LinkOutcome =
  | { status: 'none' }
  | { status: 'signed_in'; user: SignedInUser; session: AuthTokenSession }
  | { status: 'recovery' }
  | { status: 'notice'; message: string };

let resetRequested = false;
/** ForgotPassword sent a reset link from this device. */
export function noteResetRequested() {
  resetRequested = true;
}

async function liveUserForSession(session: AuthTokenSession): Promise<SignedInUser | string> {
  const profile = await getCurrentSupabaseProfile().catch(() => null);
  if (!profile) return MSG.verified;
  if (isStaffProfileRole(String(profile.role))) {
    await endLiveSession();
    return '';
  }
  if (profile.is_active === false) {
    await endLiveSession();
    return MSG.inactive;
  }
  const accessToken = session.access_token || '';
  const recipient = await loadLiveRecipient(profile, accessToken).catch(() => null);
  return {
    ...liveUserFromProfile(profile, recipient),
    accessToken,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at,
  };
}

async function finishSignupSession(raw: SessionLike): Promise<LinkOutcome> {
  const session = await rememberSession(raw as AuthTokenSession);
  if (!session?.access_token) return { status: 'notice', message: MSG.verified };
  let meta = raw.user?.user_metadata;
  if (!meta) {
    const { data } = await requireSupabase().auth.getUser(session.access_token).catch(() => ({ data: { user: null } }));
    meta = data.user?.user_metadata;
  }
  await finishLiveSignup(session.access_token, meta || {}).catch(() => {});
  const user = await liveUserForSession(session);
  if (typeof user === 'string') return user ? { status: 'notice', message: user } : { status: 'none' };
  clearPendingSignup();
  return { status: 'signed_in', user, session };
}

/** "I've confirmed, continue": signs in with the password just typed on Create Account. */
export async function continueAfterEmailConfirm(email?: string): Promise<
  | { ok: true; user: SignedInUser; session: AuthTokenSession }
  | { ok: false; message?: string; needsLogin?: boolean }
> {
  const creds = pendingSignupFor(email);
  if (!creds) return { ok: false, needsLogin: true };
  const result = await loginWithSupabase({ username: creds.email, password: creds.password, deviceKey: 'expo-device' });
  if (!result.ok) {
    return { ok: false, message: 'verifyRequired' in result && result.verifyRequired ? MSG.verifyFirst : result.message };
  }
  const outcome = await finishSignupSession(result.session as SessionLike);
  if (outcome.status === 'signed_in') return { ok: true, user: outcome.user, session: outcome.session };
  return { ok: false, message: outcome.status === 'notice' ? outcome.message : undefined };
}

/** Handles a URL opened by the confirmation or reset email. */
export async function completeAuthLink(url: string | null | undefined): Promise<LinkOutcome> {
  const link = parseAuthLink(url);
  if (!link) return { status: 'none' };
  if (link.kind === 'error') return { status: 'notice', message: MSG.linkExpired };

  const client = requireSupabase();
  let session: SessionLike | null = null;
  let recovery = false;
  if (link.kind === 'code') {
    const { data, error } = await client.auth.exchangeCodeForSession(link.code);
    if (!error && data.session) {
      session = data.session;
      recovery = (data as { redirectType?: string | null }).redirectType === 'recovery';
    }
  } else if (link.kind === 'tokens') {
    const { data, error } = await client.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
    if (!error && data.session) session = data.session;
    recovery = link.type === 'recovery';
  } else {
    const { data, error } = await client.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type as 'signup' | 'recovery' | 'email' });
    if (!error && data.session) session = data.session;
    recovery = link.type === 'recovery';
  }

  if (!session) {
    // Supabase confirms the email before redirecting, so a sign-up link still did its job even when
    // this device cannot open the session (link opened in another browser, or a newer email was sent).
    const pending = anyPendingSignup();
    if (pending) {
      const next = await continueAfterEmailConfirm(pending.email);
      if (next.ok) return { status: 'signed_in', user: next.user, session: next.session };
    }
    return { status: 'notice', message: resetRequested && !pending ? MSG.linkExpired : MSG.verified };
  }
  if (recovery) {
    await rememberSession(session as AuthTokenSession);
    resetRequested = false;
    return { status: 'recovery' };
  }
  return finishSignupSession(session);
}

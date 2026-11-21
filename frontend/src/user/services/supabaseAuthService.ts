import { accessTokenStillValid } from '../../lib/authSession.js';
import { requireSupabase, rememberSession } from '../../lib/supabaseClient.js';
import { ensureRecordedTermsVersion, liveUserFromProfile, loadLiveRecipient } from './liveAuthService.js';

const functionUrl = () => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  return `${url}/functions/v1/login-by-username`;
};

export async function loginWithSupabase({ username, password, deviceKey }: {
  username?: string;
  password?: string;
  deviceKey?: string;
}) {
  const client = requireSupabase();
  const response = await fetch(functionUrl(), {
    method: 'POST',
    headers: {
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password, deviceKey }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (result.verifyRequired && result.email) {
      return { ok: false, message: result.message, verifyRequired: true, email: result.email as string };
    }
    return { ok: false, message: result.message || 'Could not log in. Try again.' };
  }
  if (!result.session?.access_token) {
    return { ok: false, message: 'Could not start your session. Please try again.' };
  }

  // Keep the token before setSession. Checkout reads this copy if the auth
  // client later reports that it has no session.
  let session = await rememberSession(result.session);
  try {
    const { data, error } = await client.auth.setSession(result.session);
    if (!error && data.session?.access_token) {
      session = await rememberSession(data.session);
    } else if (!accessTokenStillValid(result.session)) {
      return { ok: false, message: (error as { message?: string } | undefined)?.message || 'Could not start your session. Please try again.' };
    }
  } catch (error) {
    if (!accessTokenStillValid(result.session)) {
      return { ok: false, message: (error as { message?: string } | undefined)?.message || 'Could not start your session. Please try again.' };
    }
  }
  const profile = await ensureRecordedTermsVersion(result.profile, session!.access_token);
  const recipient = await loadLiveRecipient(profile, session!.access_token).catch(() => null);
  return {
    ok: true,
    session,
    user: {
      ...liveUserFromProfile(profile, recipient),
      accessToken: session!.access_token,
      refreshToken: session!.refresh_token,
      expiresAt: session!.expires_at,
    },
  };
}

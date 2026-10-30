import { accessTokenStillValid } from '../lib/authSession.js';
import { requireSupabase, rememberSession } from '../lib/supabaseClient.js';

const functionUrl = () => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  return `${url}/functions/v1/login-by-username`;
};

export async function loginWithSupabase({ username, password, deviceKey }) {
  const client = requireSupabase();
  const response = await fetch(functionUrl(), {
    method: 'POST',
    headers: {
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password, deviceKey }),
  });
  const result = await response.json();
  if (!response.ok) return { ok: false, message: result.message };
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
      return { ok: false, message: error?.message || 'Could not start your session. Please try again.' };
    }
  } catch (error) {
    if (!accessTokenStillValid(result.session)) {
      return { ok: false, message: error?.message || 'Could not start your session. Please try again.' };
    }
  }
  return {
    ok: true,
    session,
    user: {
      ...result.profile,
      id: result.profile.id,
      role: result.profile.role,
      verified: result.profile.is_verified,
      profileComplete: result.profile.profile_complete,
      inactive: !result.profile.is_active,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
    },
  };
}

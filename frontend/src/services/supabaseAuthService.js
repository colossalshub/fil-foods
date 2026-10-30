import { requireSupabase } from '../lib/supabaseClient.js';

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

  const { error } = await client.auth.setSession(result.session);
  if (error) return { ok: false, message: error.message };
  return {
    ok: true,
    user: {
      ...result.profile,
      id: result.profile.id,
      role: result.profile.role,
      verified: result.profile.is_verified,
      profileComplete: result.profile.profile_complete,
      inactive: !result.profile.is_active,
    },
  };
}

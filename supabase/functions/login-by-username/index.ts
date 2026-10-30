type LoginBody = {
  username?: string;
  password?: string;
  deviceKey?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function rest(
  url: string,
  key: string,
  path: string,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set('apikey', key);
  headers.set('Authorization', `Bearer ${key}`);
  headers.set('Content-Type', 'application/json');
  return fetch(`${url}${path}`, { ...init, headers });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response({ message: 'Method not allowed.' }, 405);

  const body = await request.json() as LoginBody;
  const username = body.username?.trim();
  const password = body.password ?? '';
  const deviceKey = body.deviceKey?.trim() || 'unknown-device';
  if (!username || !password) return response({ message: 'Invalid username or password.' }, 400);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !serviceKey || !anonKey) return response({ message: 'Server authentication is not configured.' }, 500);

  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const attemptsResponse = await rest(
    url,
    serviceKey,
    `/rest/v1/login_attempts?select=id&device_key=eq.${encodeURIComponent(deviceKey)}&created_at=gte.${encodeURIComponent(minuteAgo)}`,
  );
  const attempts = attemptsResponse.ok ? await attemptsResponse.json() : [];
  if (attempts.length >= 10) return response({ message: 'Too many attempts. Please wait a minute and try again.' }, 429);

  const profileResponse = await rest(
    url,
    serviceKey,
    `/rest/v1/profiles?select=id,email,is_verified,is_active,locked_at,failed_attempts&username=eq.${encodeURIComponent(username)}&limit=1`,
  );
  const profiles = profileResponse.ok ? await profileResponse.json() : [];
  const profile = profiles[0];

  if (!profile || profile.locked_at || !profile.is_active) {
    await rest(url, serviceKey, '/rest/v1/login_attempts', {
      method: 'POST',
      body: JSON.stringify({ username, device_key: deviceKey, succeeded: false }),
    });
    return response({ message: profile?.locked_at
      ? 'Your account is locked. Please reset your password or contact support.'
      : 'Invalid username or password.' }, 401);
  }

  const authResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: profile.email, password }),
  });
  const signedIn = authResponse.ok ? await authResponse.json() : null;
  await rest(url, serviceKey, '/rest/v1/login_attempts', {
    method: 'POST',
    body: JSON.stringify({
    username,
    device_key: deviceKey,
    succeeded: authResponse.ok,
    }),
  });

  if (!authResponse.ok || !signedIn?.access_token) {
    const failures = (profile.failed_attempts ?? 0) + 1;
    await rest(url, serviceKey, `/rest/v1/profiles?id=eq.${profile.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        failed_attempts: failures,
        locked_at: failures >= 5 ? new Date().toISOString() : null,
      }),
    });
    return response({
      message: failures >= 5
        ? 'Your account is locked. Please reset your password or contact support.'
        : 'Invalid username or password.',
    }, 401);
  }

  await rest(url, serviceKey, `/rest/v1/profiles?id=eq.${profile.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ failed_attempts: 0, locked_at: null }),
  });
  await rest(url, serviceKey, '/rest/v1/rpc/append_audit_event', {
    method: 'POST',
    body: JSON.stringify({ p_event_type: 'login', p_details: { user_id: profile.id } }),
  });

  const currentProfileResponse = await rest(
    url,
    serviceKey,
    `/rest/v1/profiles?select=*&id=eq.${profile.id}&limit=1`,
  );
  const currentProfiles = currentProfileResponse.ok ? await currentProfileResponse.json() : [];
  const currentProfile = currentProfiles[0];
  if (!currentProfile) return response({ message: 'Unable to load the account.' }, 500);

  return response({
    session: {
      access_token: signedIn.access_token,
      refresh_token: signedIn.refresh_token,
      expires_in: signedIn.expires_in,
      expires_at: signedIn.expires_at,
      token_type: signedIn.token_type,
      user: signedIn.user,
    },
    profile: currentProfile,
  });
});

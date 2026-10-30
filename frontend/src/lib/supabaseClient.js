import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { accessTokenStillValid, jwtSubject, normalizeExpiresAt } from './authSession.js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// User access tokens are ES256 JWTs. The publishable key must stay in the
// apikey header; the gateway rejects it as a Bearer token.
function shouldOmitBearer(token) {
  if (!token) return false;
  return token === anonKey || token.startsWith('sb_');
}

function isTokenRefresh(requestUrl) {
  return String(requestUrl).includes('/auth/v1/token');
}

function headersToObject(headers) {
  const plain = {};
  headers.forEach((value, key) => {
    plain[key] = value;
  });
  return plain;
}

let liveSession = null;
const SESSION_KEY = 'fil-foods.supabase.session';
const GLOBAL_KEY = '__filFoodsAuthSession';

function authStorageKey() {
  try {
    const ref = new URL(url).hostname.split('.')[0];
    return ref ? `sb-${ref}-auth-token` : null;
  } catch {
    return null;
  }
}

function fetchWithApiKey(input, init) {
  const request = typeof Request !== 'undefined' && input instanceof Request ? input : null;
  const headers = new Headers(request?.headers ?? undefined);
  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  }
  if (anonKey && !headers.get('apikey')) headers.set('apikey', anonKey);
  const token = (headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (shouldOmitBearer(token)) headers.delete('Authorization');
  const requestUrl = request?.url ?? input;
  const sessionToken = readSyncSession()?.access_token;
  // A refresh call authenticates with the refresh token in the body. An expired
  // access token in Authorization is rejected by the gateway before refresh runs.
  if (!headers.get('Authorization') && sessionToken && !isTokenRefresh(requestUrl)) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }
  const method = init?.method || request?.method || 'GET';
  const body = init?.body ?? (request && method !== 'GET' && method !== 'HEAD' ? request.body : undefined);
  const next = { ...init, method, headers: headersToObject(headers) };
  if (body !== undefined) next.body = body;
  return fetch(requestUrl, next);
}

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      fetch: fetchWithApiKey,
    },
  })
  : null;

export async function rememberSession(session) {
  if (!session?.access_token) return null;
  const userId = session.user?.id || jwtSubject(session.access_token);
  const stored = {
    access_token: session.access_token,
    refresh_token: session.refresh_token ?? null,
    expires_at: normalizeExpiresAt(session),
    expires_in: session.expires_in,
    token_type: session.token_type || 'bearer',
    user: userId ? { id: userId } : undefined,
  };
  liveSession = stored;
  globalThis[GLOBAL_KEY] = stored;
  const pairs = [[SESSION_KEY, JSON.stringify(stored)]];
  if (authStorageKey() && stored.refresh_token && stored.expires_at) {
    pairs.push([authStorageKey(), JSON.stringify(stored)]);
  }
  try {
    await AsyncStorage.multiSet(pairs);
  } catch {
    // The in-memory copy still authorizes this visit.
  }
  return stored;
}

export async function forgetSession() {
  liveSession = null;
  delete globalThis[GLOBAL_KEY];
  const keys = [SESSION_KEY, authStorageKey()].filter(Boolean);
  await AsyncStorage.multiRemove(keys);
}

function readSyncSession() {
  if (liveSession?.access_token) return liveSession;
  const saved = globalThis[GLOBAL_KEY];
  if (saved?.access_token) {
    liveSession = saved;
    return saved;
  }
  return null;
}

async function readStoredSession(key) {
  if (!key) return null;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.access_token) return null;
    if (!parsed.user?.id) {
      const userId = jwtSubject(parsed.access_token);
      if (userId) parsed.user = { id: userId };
    }
    liveSession = parsed;
    globalThis[GLOBAL_KEY] = parsed;
    return parsed;
  } catch {
    return null;
  }
}

async function readRememberedSession() {
  const cached = readSyncSession();
  if (cached?.access_token) return cached;
  return await readStoredSession(SESSION_KEY) || await readStoredSession(authStorageKey());
}

async function refreshAccessToken(refreshToken) {
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.access_token ? data : null;
}

if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.access_token) rememberSession(session);
  });
}

export async function ensureSession(preferred) {
  requireSupabase();
  // The order screen's signed-in user can outlive the module that stored the
  // token. Put the token from that screen back before reading storage.
  if (preferred?.access_token) await rememberSession(preferred);
  // Use the login token directly. getSession() refreshes through the auth
  // client, and a failed refresh deletes that client's copy.
  const remembered = await readRememberedSession();
  if (accessTokenStillValid(remembered)) return remembered;

  const refreshToken = remembered?.refresh_token;
  if (refreshToken) {
    try {
      const refreshed = await refreshAccessToken(refreshToken);
      if (refreshed?.access_token) return rememberSession(refreshed);
    } catch {
      // The saved access token can still be sent until the server rejects it.
    }
  }

  if (remembered?.access_token) return remembered;

  try {
    const { data, error } = await requireSupabase().auth.getSession();
    if (!error && data.session?.access_token) return rememberSession(data.session);
  } catch {
    // Login's saved token is the one checkout can still send.
  }
  return null;
}

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}

export async function getCurrentSupabaseProfile() {
  const client = requireSupabase();
  const session = await ensureSession();
  const userId = session?.user?.id;
  if (!userId) return null;

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .setHeader('Authorization', `Bearer ${session.access_token}`)
    .single();
  if (error) throw error;
  return data;
}

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// This project verifies Authorization as a user access token signed with ES256.
// The API key and any older HS256 session belong in apikey only, never Bearer.
function isEs256Jwt(token) {
  const segment = token.split('.')[0];
  if (!segment) return false;
  try {
    const json = globalThis.atob(segment.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json).alg === 'ES256';
  } catch {
    return false;
  }
}

function fetchWithApiKey(input, init) {
  const headers = new Headers(init?.headers ?? {});
  const token = (headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (token && !isEs256Jwt(token)) headers.delete('Authorization');
  const plainHeaders = {};
  headers.forEach((value, key) => {
    plainHeaders[key] = value;
  });
  const url = typeof input === 'string' ? input : input.url;
  return fetch(url, { ...init, headers: plainHeaders });
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
  const storageKeys = await AsyncStorage.getAllKeys();
  const authKeys = storageKeys.filter((key) => key.startsWith('sb-jmayfxgpxzgyilyvnbju-'));
  if (authKeys.length) {
    const pairs = await AsyncStorage.multiGet(authKeys);
    const stale = pairs
      .filter(([, value]) => value && !value.includes('eyJhbGciOiJFUzI1NiI'))
      .map(([key]) => key);
    if (stale.length) await AsyncStorage.multiRemove(stale);
  }
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session?.user) return null;

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', sessionData.session.user.id)
    .single();
  if (error) throw error;
  return data;
}

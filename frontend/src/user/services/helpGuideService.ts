import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, requireSupabase } from '../../lib/supabaseClient';

const KEY = 'filfoods.helpGuideSeen';

function storageKey(userId?: string | null) {
  return userId ? `${KEY}.${userId}` : KEY;
}

let testStore: Map<string, string> | null = null;

export function __setTestStore(store: Map<string, string> | null) {
  testStore = store;
}

async function readRaw(userId?: string | null) {
  const key = storageKey(userId);
  if (testStore) return testStore.get(key) ?? null;
  return AsyncStorage.getItem(key);
}

export async function hasSeenHelpGuide(userId?: string | null) {
  const raw = await readRaw(userId);
  if (raw === '1') return true;
  if (!userId || !isSupabaseConfigured || testStore) return false;
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('guide_seen_at')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data?.guide_seen_at) return false;
  return true;
}

export async function markHelpGuideSeen(userId?: string | null) {
  const key = storageKey(userId);
  if (testStore) {
    testStore.set(key, '1');
    return;
  }
  await AsyncStorage.setItem(key, '1');
  if (!userId || !isSupabaseConfigured) return;
  await requireSupabase()
    .from('profiles')
    .update({ guide_seen_at: new Date().toISOString() })
    .eq('id', userId);
}

export async function clearHelpGuideSeen(userId?: string | null) {
  const key = storageKey(userId);
  if (testStore) {
    testStore.delete(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PersistedSession } from '../types';

const KEY = 'filfoods.persistentSession';

let testStore: Map<string, string> | null = null;

export function __setTestStore(store: Map<string, string> | null) {
  testStore = store;
}

async function readRaw() {
  if (testStore) return testStore.get(KEY) ?? null;
  return AsyncStorage.getItem(KEY);
}

export async function persistSession(session: PersistedSession) {
  const json = JSON.stringify(session);
  if (testStore) {
    testStore.set(KEY, json);
    return;
  }
  await AsyncStorage.setItem(KEY, json);
}

export async function clearPersistedSession() {
  if (testStore) {
    testStore.delete(KEY);
    return;
  }
  await AsyncStorage.removeItem(KEY);
}

export async function readPersistedSession(): Promise<PersistedSession | null> {
  const raw = await readRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedSession;
  } catch {
    return null;
  }
}

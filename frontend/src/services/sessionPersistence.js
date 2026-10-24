import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'filfoods.persistentSession';

/** @type {Map<string, string> | null} */
let testStore = null;

export function __setTestStore(store) {
  testStore = store;
}

async function readRaw() {
  if (testStore) return testStore.get(KEY) ?? null;
  return AsyncStorage.getItem(KEY);
}

export async function persistSession(session) {
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

export async function readPersistedSession() {
  const raw = await readRaw();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'filfoods.helpGuideSeen';

/** @type {Map<string, string> | null} */
let testStore = null;

export function __setTestStore(store) {
  testStore = store;
}

async function readRaw() {
  if (testStore) return testStore.get(KEY) ?? null;
  return AsyncStorage.getItem(KEY);
}

export async function hasSeenHelpGuide() {
  const raw = await readRaw();
  return raw === '1';
}

export async function markHelpGuideSeen() {
  if (testStore) {
    testStore.set(KEY, '1');
    return;
  }
  await AsyncStorage.setItem(KEY, '1');
}

export async function clearHelpGuideSeen() {
  if (testStore) {
    testStore.delete(KEY);
    return;
  }
  await AsyncStorage.removeItem(KEY);
}

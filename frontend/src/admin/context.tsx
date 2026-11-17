import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { restoreStaffSession, signOutStaffFromSupabase } from '../lib/staffAuth.js';
import { forgetSession, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { endBackendSession, findPublic, syncStaffData } from './data/store.js';
import { translate } from './i18n.js';
import { lightPalette, paletteFor, resolvedMode, type Palette } from './theme.js';
import type { Preferences, StaffPublic, StaffRole } from './types';

const KEY = 'filfoods.adminSession';
const PREFS_KEY = (accountId: string) => `filfoods.staffPrefs.${accountId}`;

async function storedPrefs(accountId: string, fallback: Preferences): Promise<Preferences> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY(accountId));
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<Preferences>) } : fallback;
  } catch {
    return fallback;
  }
}

export interface AdminSession {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  sessionVersion: number;
}

interface AdminContextValue {
  ready: boolean;
  session: AdminSession | null;
  flash: string | null;
  showFlash: (message: string) => void;
  clearFlash: () => void;
  highlighted: StaffRole | null;
  setHighlighted: (role: StaffRole | null) => void;
  prefs: Preferences;
  colors: Palette;
  t: (key: string) => string;
  revision: number;
  signIn: (account: StaffPublic, remember: boolean, backend?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  applyPrefs: (preferences: Preferences) => void;
  patchSession: (patch: Partial<Pick<AdminSession, 'name' | 'email'>>) => void;
  bump: () => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

function toSession(account: StaffPublic): AdminSession {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    sessionVersion: account.sessionVersion,
  };
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const device = useColorScheme();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [prefs, setPrefs] = useState<Preferences>({ language: 'en', appearance: 'light' });
  const [highlighted, setHighlighted] = useState<StaffRole | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await Promise.race([
          AsyncStorage.getItem(KEY),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 400)),
        ]);
        if (raw) {
          const saved = JSON.parse(raw) as { accountId: string; sessionVersion: number; backend?: boolean };
          if (saved.backend) {
            const remote = await restoreStaffSession();
            if (remote && remote.id === saved.accountId) {
              await syncStaffData({ id: remote.id, name: remote.name, email: remote.email, role: remote.role });
              const restored = await storedPrefs(remote.id, remote.preferences);
              if (!cancelled) {
                setSession(toSession(remote));
                setPrefs(restored);
                setHighlighted(remote.role);
              }
            } else {
              await AsyncStorage.removeItem(KEY);
            }
            if (!cancelled) setReady(true);
            return;
          }
          // A demo (sample-data) session is never restored once Supabase is configured.
          if (isSupabaseConfigured) {
            await AsyncStorage.removeItem(KEY);
            if (!cancelled) setReady(true);
            return;
          }
          const account = findPublic(saved.accountId);
          if (account && account.sessionVersion === saved.sessionVersion) {
            const restored = await storedPrefs(account.id, account.preferences);
            if (!cancelled) {
              setSession(toSession(account));
              setPrefs(restored);
              setHighlighted(account.role);
            }
          } else {
            await AsyncStorage.removeItem(KEY);
          }
        }
      } catch {
        // A broken saved session just starts at role select.
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(timer);
  }, [flash]);

  const showFlash = useCallback((message: string) => setFlash(message), []);
  const colors = session ? paletteFor(resolvedMode(prefs.appearance, device)) : lightPalette;

  const value = useMemo<AdminContextValue>(() => ({
    ready,
    session,
    flash,
    showFlash,
    clearFlash: () => setFlash(null),
    highlighted,
    setHighlighted,
    prefs,
    colors,
    t: (key: string) => translate(session ? prefs.language : 'en', key),
    revision,
    signIn: async (account, remember, backend = false) => {
      setSession(toSession(account));
      setPrefs(await storedPrefs(account.id, account.preferences));
      setHighlighted(account.role);
      if (remember) {
        await AsyncStorage.setItem(KEY, JSON.stringify({
          accountId: account.id,
          sessionVersion: account.sessionVersion,
          backend,
        }));
      } else {
        await AsyncStorage.removeItem(KEY);
      }
    },
    signOut: async () => {
      setSession(null);
      setPrefs({ language: 'en', appearance: 'light' });
      setHighlighted(null);
      await AsyncStorage.removeItem(KEY);
      endBackendSession();
      if (isSupabaseConfigured) {
        await signOutStaffFromSupabase();
        await forgetSession();
      }
    },
    applyPrefs: (preferences) => {
      setPrefs(preferences);
      if (session) void AsyncStorage.setItem(PREFS_KEY(session.id), JSON.stringify(preferences)).catch(() => undefined);
    },
    patchSession: (patch) => setSession((current) => (current ? { ...current, ...patch } : current)),
    bump: () => setRevision((count) => count + 1),
  }), [ready, session, flash, highlighted, prefs, colors, revision, showFlash]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdmin must be used in the staff app');
  return value;
}

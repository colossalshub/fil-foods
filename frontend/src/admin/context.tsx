import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { findPublic } from './data/store.js';
import { translate } from './i18n.js';
import { lightPalette, paletteFor, resolvedMode, type Palette } from './theme.js';
import type { Preferences, StaffPublic, StaffRole } from './types';

const KEY = 'filfoods.adminSession';

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
  highlighted: StaffRole;
  setHighlighted: (role: StaffRole) => void;
  prefs: Preferences;
  colors: Palette;
  t: (key: string) => string;
  revision: number;
  signIn: (account: StaffPublic, remember: boolean) => Promise<void>;
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
  const [highlighted, setHighlighted] = useState<StaffRole>('admin');
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
          const saved = JSON.parse(raw) as { accountId: string; sessionVersion: number };
          const account = findPublic(saved.accountId);
          if (account && account.sessionVersion === saved.sessionVersion) {
            if (!cancelled) {
              setSession(toSession(account));
              setPrefs(account.preferences);
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

  const colors = session ? paletteFor(resolvedMode(prefs.appearance, device)) : lightPalette;

  const value = useMemo<AdminContextValue>(() => ({
    ready,
    session,
    flash,
    showFlash: (message: string) => setFlash(message),
    clearFlash: () => setFlash(null),
    highlighted,
    setHighlighted,
    prefs,
    colors,
    t: (key: string) => translate(session ? prefs.language : 'en', key),
    revision,
    signIn: async (account, remember) => {
      setSession(toSession(account));
      setPrefs(account.preferences);
      setHighlighted(account.role);
      if (remember) {
        await AsyncStorage.setItem(KEY, JSON.stringify({
          accountId: account.id,
          sessionVersion: account.sessionVersion,
        }));
      } else {
        await AsyncStorage.removeItem(KEY);
      }
    },
    signOut: async () => {
      setSession(null);
      setPrefs({ language: 'en', appearance: 'light' });
      await AsyncStorage.removeItem(KEY);
    },
    applyPrefs: (preferences) => setPrefs(preferences),
    patchSession: (patch) => setSession((current) => (current ? { ...current, ...patch } : current)),
    bump: () => setRevision((count) => count + 1),
  }), [ready, session, flash, highlighted, prefs, colors, revision]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error('useAdmin must be used in the staff app');
  return value;
}

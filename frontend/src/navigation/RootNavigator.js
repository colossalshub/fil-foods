import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';
import MainTabs from './MainTabs';
import VisitorTabs from './VisitorTabs';
import LoginScreen from '../screens/auth/LoginScreen';
import CreateAccountScreen from '../screens/auth/CreateAccountScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import NewPasswordScreen from '../screens/auth/NewPasswordScreen';
import VerifyAccountScreen from '../screens/auth/VerifyAccountScreen';
import CompleteProfileScreen from '../screens/auth/CompleteProfileScreen';
import LinkGoogleScreen from '../screens/auth/LinkGoogleScreen';
import { getUser, getPublicUser } from '../services/authService';
import { buildPersistedSession, evaluateSessionRestore, shouldEndSession, shouldPersistSession } from '../services/sessionPolicy';
import { clearPersistedSession, persistSession, readPersistedSession } from '../services/sessionPersistence';
import HelpScreen from '../screens/HelpScreen';
import AboutScreen from '../screens/visitor/AboutScreen';
import HelpGuideGate from '../components/HelpGuideGate';
import { colors } from '../theme/theme';
import { ensureSession, getCurrentSupabaseProfile, isSupabaseConfigured, supabase, forgetSession, rememberSession } from '../lib/supabaseClient.js';

const Stack = createNativeStackNavigator();
const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.primary } };

export default function RootNavigator() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [booting, setBooting] = useState(true);
  const lastActiveRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isSupabaseConfigured) {
        try {
          const restoredSession = await ensureSession();
          const profile = restoredSession?.access_token
            ? await getCurrentSupabaseProfile()
            : null;
          if (!cancelled && profile && restoredSession?.access_token) {
            setSession(restoredSession);
            setUser({
              ...profile,
              verified: profile.is_verified,
              profileComplete: profile.profile_complete,
              inactive: !profile.is_active,
              accessToken: restoredSession.access_token,
              refreshToken: restoredSession.refresh_token,
              expiresAt: restoredSession.expires_at,
            });
            setKeepLoggedIn(true);
            if (!cancelled) setBooting(false);
            return;
          }
          if (!cancelled) {
            setSession(null);
            setUser(null);
          }
        } catch (error) {
          console.warn('Unable to restore the Supabase session.', error);
        }
        if (!cancelled) setBooting(false);
        return;
      }
      const stored = await readPersistedSession();
      if (stored) {
        const dbUser = getUser(stored.userId);
        const decision = evaluateSessionRestore(stored, dbUser);
        if (decision.restore) {
          const restored = getPublicUser(stored.userId);
          if (!cancelled && restored) {
            setUser(restored);
            setKeepLoggedIn(true);
          }
        } else {
          await clearPersistedSession();
        }
      }
      if (!cancelled) setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (nextUser, options = {}) => {
    if (!nextUser) return;
    const incoming = options.session?.access_token
      ? options.session
      : (nextUser.accessToken
        ? {
          access_token: nextUser.accessToken,
          refresh_token: nextUser.refreshToken,
          expires_at: nextUser.expiresAt,
        }
        : null);
    const kept = incoming?.access_token ? incoming : (session?.access_token ? session : null);
    const userWithToken = kept?.access_token
      ? {
        ...nextUser,
        accessToken: kept.access_token,
        refreshToken: kept.refresh_token,
        expiresAt: kept.expires_at,
      }
      : nextUser;
    const persist = shouldPersistSession(options.keepLoggedIn);
    setKeepLoggedIn(persist);
    if (kept?.access_token) setSession(kept);
    setUser(userWithToken);

    if (kept?.access_token) {
      const stored = await rememberSession(kept);
      if (stored?.access_token) setSession(stored);
    }

    if (persist && nextUser?.id && nextUser.role !== 'visitor') {
      const dbUser = getUser(nextUser.id);
      await persistSession(buildPersistedSession({
        userId: nextUser.id,
        username: nextUser.username,
        sessionVersion: dbUser?.sessionVersion ?? 1,
      }));
    } else {
      await clearPersistedSession();
    }
  }, [session]);

  const signOut = useCallback(async () => {
    setUser(null);
    setSession(null);
    setKeepLoggedIn(false);
    try {
      if (isSupabaseConfigured) await supabase.auth.signOut();
    } catch {
      // The saved token is still removed below.
    }
    await forgetSession().catch(() => {});
    await clearPersistedSession().catch(() => {});
  }, []);

  const auth = useMemo(
    () => ({ user, session, keepLoggedIn, signIn, signOut }),
    [user, session, keepLoggedIn, signIn, signOut],
  );

  useEffect(() => {
    if (!user || user.role === 'visitor' || keepLoggedIn) return undefined;
    lastActiveRef.current = Date.now();
    const timer = setInterval(() => {
      if (shouldEndSession({
        keepLoggedIn: false,
        lastActiveAt: lastActiveRef.current,
        now: Date.now(),
      })) {
        signOut();
      }
    }, 30000);
    let backgroundTimer;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        lastActiveRef.current = Date.now();
        clearTimeout(backgroundTimer);
        return;
      }
      if (next !== 'background') return;
      clearTimeout(backgroundTimer);
      backgroundTimer = setTimeout(() => {
        if (AppState.currentState !== 'background') return;
        if (shouldEndSession({ keepLoggedIn: false, appBackgrounded: true })) signOut();
      }, 1500);
    });
    return () => {
      clearInterval(timer);
      clearTimeout(backgroundTimer);
      sub.remove();
    };
  }, [user, keepLoggedIn, signOut]);

  if (booting) {
    return null;
  }

  return (
    <AuthContext.Provider value={auth}>
      <NavigationContainer
        theme={navTheme}
        onStateChange={() => {
          lastActiveRef.current = Date.now();
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user && user.role !== 'visitor' ? (
            user.profileComplete ? (
              <Stack.Screen name="Main" component={MainTabs} />
            ) : (
              <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
            )
          ) : (
            <>
              {user?.role === 'visitor' ? <Stack.Screen name="Visitor" component={VisitorTabs} /> : null}
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
              <Stack.Screen name="LinkGoogle" component={LinkGoogleScreen} />
              <Stack.Screen name="VerifyAccount" component={VerifyAccountScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="NewPassword" component={NewPasswordScreen} />
            </>
          )}
          <Stack.Screen name="Help" component={HelpScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
        </Stack.Navigator>
        <HelpGuideGate />
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

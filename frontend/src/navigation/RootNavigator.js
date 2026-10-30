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
import HelpGuideGate from '../components/HelpGuideGate';
import { colors } from '../theme/theme';
import { getCurrentSupabaseProfile, isSupabaseConfigured, supabase } from '../lib/supabaseClient.js';

const Stack = createNativeStackNavigator();
const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.primary } };

export default function RootNavigator() {
  const [user, setUser] = useState(null);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [booting, setBooting] = useState(true);
  const lastActiveRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isSupabaseConfigured) {
        try {
          const profile = await getCurrentSupabaseProfile();
          if (!cancelled && profile) {
            setUser({
              ...profile,
              verified: profile.is_verified,
              profileComplete: profile.profile_complete,
              inactive: !profile.is_active,
            });
            setKeepLoggedIn(true);
            if (!cancelled) setBooting(false);
            return;
          }
        } catch (error) {
          console.warn('Unable to restore the Supabase session.', error);
          await supabase?.auth.signOut();
        }
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
    const persist = shouldPersistSession(options.keepLoggedIn);
    setKeepLoggedIn(persist);

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

    setUser(nextUser);
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    await clearPersistedSession();
    setKeepLoggedIn(false);
    setUser(null);
  }, []);

  const auth = useMemo(
    () => ({ user, keepLoggedIn, signIn, signOut }),
    [user, keepLoggedIn, signIn, signOut],
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
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') lastActiveRef.current = Date.now();
      if (shouldEndSession({ keepLoggedIn: false, appBackgrounded: next === 'background' })) {
        signOut();
      }
    });
    return () => {
      clearInterval(timer);
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
        </Stack.Navigator>
        <HelpGuideGate />
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

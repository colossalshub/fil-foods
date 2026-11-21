import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthTokenSession, AuthUser, PublicUser } from '../types';
import { AppState, Linking, Platform } from 'react-native';
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
import TermsUpdateScreen from '../screens/auth/TermsUpdateScreen';
import LinkGoogleScreen from '../screens/auth/LinkGoogleScreen';
import { getUser, getPublicUser, termsUpdateRequired } from '../services/authService';
import { buildPersistedSession, evaluateSessionRestore, shouldEndSession, shouldPersistSession } from '../services/sessionPolicy';
import { clearPersistedSession, persistSession, readPersistedSession } from '../services/sessionPersistence';
import HelpScreen from '../screens/HelpScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import FaqScreen from '../screens/FaqScreen';
import AboutScreen from '../screens/visitor/AboutScreen';
import HelpGuideGate from '../components/HelpGuideGate';
import StaffNavigator from '../../admin/navigation';
import { colors } from '../theme/theme';
import { isStaffProfileRole } from '../../lib/staffAuth.js';
import { fetchRemoteMeals } from '../../lib/mealCatalogBackend.js';
import { syncMealsWithRemoteMenu } from '../data/meals.js';
import { configureAuthRedirect, ensureRecordedTermsVersion, liveUserFromProfile, loadLiveRecipient } from '../services/liveAuthService.js';
import { completeAuthLink, type LinkOutcome } from '../services/emailLinkAuth.js';
import { authRedirectUrl } from '../../lib/authRedirect';
import { stripAuthParams } from '../../lib/authLink.js';
import { setLoginNotice } from './loginNotice';
import { recoveryModeActive, setRecoveryMode, subscribeRecoveryMode } from './recoveryMode';
import { MSG } from '../data/messages';
import { ensureSession, getCurrentSupabaseProfile, isSupabaseConfigured, supabase, forgetSession, rememberSession } from '../../lib/supabaseClient.js';

const Stack = createNativeStackNavigator();

// Sign-up confirmation and password-reset emails link back here (USR-01/USR-04).
if (isSupabaseConfigured) configureAuthRedirect(authRedirectUrl());

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.page, primary: colors.primary } };

export default function RootNavigator() {
  const [user, setUser] = useState<AuthUser | PublicUser | null>(null);
  const [session, setSession] = useState<AuthTokenSession | null>(null);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [booting, setBooting] = useState(true);
  const [recovery, setRecovery] = useState(recoveryModeActive());
  const lastActiveRef = useRef(0);
  const handledLinks = useRef(new Set<string>());

  useEffect(() => subscribeRecoveryMode(setRecovery), []);

  useEffect(() => {
    if (!supabase) return undefined;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // ADM-17/18 → USR-16: staff menu edits (availability, price, allergens) reach the user menu.
  useEffect(() => {
    if (!isSupabaseConfigured || !session?.access_token) return;
    fetchRemoteMeals()
      .then((rows) => { syncMealsWithRemoteMenu(rows); })
      .catch(() => { /* keep the bundled menu when offline */ });
  }, [session?.access_token]);

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
            if (isStaffProfileRole(profile.role as string)) {
              // Staff panel sign-in uses the same Supabase session store; do not open the client app.
              setSession(null);
              setUser(null);
              setKeepLoggedIn(false);
            } else {
              setSession(restoredSession);
              const profileWithTerms = await ensureRecordedTermsVersion(profile, restoredSession.access_token);
              const recipient = await loadLiveRecipient(profileWithTerms, restoredSession.access_token).catch(() => null);
              setUser({
                ...liveUserFromProfile(profileWithTerms, recipient),
                accessToken: restoredSession.access_token,
                refreshToken: restoredSession.refresh_token,
                expiresAt: restoredSession.expires_at,
              });
              setKeepLoggedIn(true);
            }
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

  const signIn = useCallback(async (nextUser: AuthUser | PublicUser | null | undefined, options: {
    session?: AuthTokenSession | null;
    keepLoggedIn?: boolean;
  } = {}) => {
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
    const persist = shouldPersistSession(!!options.keepLoggedIn);
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

  // Email links (confirm sign-up, reset password) open the app or the web page with auth parameters.
  useEffect(() => {
    if (booting || !isSupabaseConfigured) return undefined;
    let alive = true;
    const handle = async (url: string | null | undefined) => {
      if (!url || handledLinks.current.has(url)) return;
      handledLinks.current.add(url);
      const outcome: LinkOutcome = await completeAuthLink(url)
        .catch(() => ({ status: 'notice', message: MSG.linkExpired }) as LinkOutcome);
      if (outcome.status !== 'none' && Platform.OS === 'web' && typeof window !== 'undefined') {
        window.history.replaceState(null, '', stripAuthParams(window.location.href));
      }
      if (!alive) return;
      if (outcome.status === 'signed_in') await signIn(outcome.user, { session: outcome.session, keepLoggedIn: false });
      else if (outcome.status === 'recovery') setRecoveryMode(true);
      else if (outcome.status === 'notice') setLoginNotice(outcome.message);
    };
    Linking.getInitialURL().then(handle).catch(() => {});
    const sub = Linking.addEventListener('url', ({ url }) => {
      void handle(url);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [booting, signIn]);

  const signOut = useCallback(async () => {
    setUser(null);
    setSession(null);
    setKeepLoggedIn(false);
    try {
      if (isSupabaseConfigured && supabase) await supabase.auth.signOut({ scope: 'global' });
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
    let backgroundTimer: ReturnType<typeof setTimeout> | undefined;
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
          {recovery ? (
            <Stack.Screen name="NewPassword" component={NewPasswordScreen} initialParams={{ grantId: 'live', fromLink: true }} />
          ) : user && user.role !== 'visitor' ? (
            user.profileComplete ? (
              termsUpdateRequired(user) ? (
                <Stack.Screen name="TermsUpdate" component={TermsUpdateScreen} />
              ) : (
                <Stack.Screen name="Main" component={MainTabs} />
              )
            ) : (
              <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
            )
          ) : (
            <>
              {user?.role === 'visitor' ? <Stack.Screen name="Visitor" component={VisitorTabs} /> : null}
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Staff" component={StaffNavigator} />
              <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
              <Stack.Screen name="LinkGoogle" component={LinkGoogleScreen} />
              <Stack.Screen name="VerifyAccount" component={VerifyAccountScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="NewPassword" component={NewPasswordScreen} />
            </>
          )}
          <Stack.Screen name="Help" component={HelpScreen} />
          <Stack.Screen name="Faq" component={FaqScreen} />
          <Stack.Screen name="Feedback" component={FeedbackScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
        </Stack.Navigator>
        <HelpGuideGate />
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { buildPersistedSession, evaluateSessionRestore, shouldPersistSession } from '../services/sessionPolicy';
import { clearPersistedSession, persistSession, readPersistedSession } from '../services/sessionPersistence';
import HelpScreen from '../screens/HelpScreen';
import HelpGuideGate from '../components/HelpGuideGate';
import { colors } from '../theme/theme';

const Stack = createNativeStackNavigator();
const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.primary } };

export default function RootNavigator() {
  const [user, setUser] = useState(null);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
    await clearPersistedSession();
    setKeepLoggedIn(false);
    setUser(null);
  }, []);

  const auth = useMemo(
    () => ({ user, keepLoggedIn, signIn, signOut }),
    [user, keepLoggedIn, signIn, signOut],
  );

  if (booting) {
    return null;
  }

  return (
    <AuthContext.Provider value={auth}>
      <NavigationContainer theme={navTheme}>
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

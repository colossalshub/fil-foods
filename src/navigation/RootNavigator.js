import { useMemo, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';
import MainTabs from './MainTabs';
import LoginScreen from '../screens/auth/LoginScreen';
import CreateAccountScreen from '../screens/auth/CreateAccountScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import { colors } from '../theme/theme';

const Stack = createNativeStackNavigator();
const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.background, primary: colors.primary } };

export default function RootNavigator() {
  const [user, setUser] = useState(null);
  const auth = useMemo(() => ({ user, signIn: setUser, signOut: () => setUser(null) }), [user]);

  return (
    <AuthContext.Provider value={auth}>
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <Stack.Screen name="Main" component={MainTabs} />
          ) : (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}

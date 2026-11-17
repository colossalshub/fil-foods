// Where Supabase sends the user after they tap the sign-up or password-reset link in the email.
// Each value must be listed in Supabase → Authentication → URL Configuration → Redirect URLs,
// otherwise Supabase falls back to the Site URL (the email is still confirmed).
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';

export const AUTH_LINK_PATH = 'auth/confirm';

export function authRedirectUrl() {
  const override = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL;
  if (override) return override;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // The web build is a single page: come back to its root and read the link there.
    return `${window.location.origin}/`;
  }
  // APK / development build: filfoods://auth/confirm. Expo Go: exp://<host>:8081/--/auth/confirm.
  return AuthSession.makeRedirectUri({ scheme: 'filfoods', path: AUTH_LINK_PATH });
}

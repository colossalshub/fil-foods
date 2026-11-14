import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { AccountFor, AuthUser } from '../types';
import { forgetSession, getCurrentSupabaseProfile, isSupabaseConfigured, rememberSession, requireSupabase } from '../lib/supabaseClient.js';
import { MSG } from '../data/messages.js';

WebBrowser.maybeCompleteAuthSession();

const redirectTo = AuthSession.makeRedirectUri({
  scheme: 'filfoods',
  path: 'auth/callback',
});

function errorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : MSG.googleConnection;
}

export async function continueWithGoogle({ accountFor = 'self' }: {
  accountFor?: AccountFor;
}): Promise<{ ok: true; user: AuthUser } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Google sign-in needs Supabase configured. Set the Supabase URL and anon key, then enable Google in Supabase Auth.',
    };
  }

  const client = requireSupabase();
  try {
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) return { ok: false, message: error.message || MSG.googleConnection };
    if (!data.url) return { ok: false, message: MSG.googleConnection };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') {
      return { ok: false, message: MSG.googleCancelled };
    }

    const callback = new URL(result.url);
    const providerError = callback.searchParams.get('error_description')
      || callback.searchParams.get('error');
    if (providerError) return { ok: false, message: providerError };

    const code = callback.searchParams.get('code');
    if (!code) return { ok: false, message: MSG.googleConnection };

    const { data: sessionData, error: sessionError } = await client.auth.exchangeCodeForSession(code);
    if (sessionError) return { ok: false, message: sessionError.message || MSG.googleConnection };
    const session = await rememberSession(sessionData.session);
    if (!session?.access_token) return { ok: false, message: MSG.googleConnection };

    const profile = await getCurrentSupabaseProfile();
    if (!profile) {
      await client.auth.signOut();
      await forgetSession();
      return {
        ok: false,
        message: 'Google sign-in completed, but your F.I.L. Foods profile could not be loaded. Please try again or contact support.',
      };
    }
    if (!profile.is_active) {
      await client.auth.signOut();
      await forgetSession();
      return { ok: false, message: MSG.inactive };
    }

    return {
      ok: true,
      user: {
        id: profile.id,
        role: profile.role,
        accountFor,
        firstName: profile.first_name,
        middleName: profile.middle_name || '',
        lastName: profile.last_name,
        suffix: profile.suffix || '',
        contactNumber: profile.contact_number || '',
        email: profile.email,
        username: profile.username,
        verified: profile.is_verified,
        profileComplete: profile.profile_complete,
        inactive: !profile.is_active,
        termsAcceptedAt: profile.terms_accepted_at,
        address: profile.address || '',
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at,
      },
    };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

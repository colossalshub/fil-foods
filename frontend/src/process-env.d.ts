declare const process: {
  env: {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    /** Optional fixed email-link redirect (e.g. the hosted web app URL). */
    EXPO_PUBLIC_AUTH_REDIRECT_URL?: string;
  };
};

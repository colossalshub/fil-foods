// Reads the Supabase Auth redirect that an email link opens (sign-up confirmation or password reset).
// Pure: no React Native or Supabase imports, so it runs under node:test.

export type AuthLinkType = 'signup' | 'recovery' | 'email_change' | 'magiclink' | 'invite' | 'email';

export type AuthLink =
  | { kind: 'code'; code: string; type: AuthLinkType | null }
  | { kind: 'tokens'; accessToken: string; refreshToken: string; type: AuthLinkType | null }
  | { kind: 'token_hash'; tokenHash: string; type: AuthLinkType }
  | { kind: 'error'; errorCode: string; description: string; type: AuthLinkType | null };

const LINK_TYPES: AuthLinkType[] = ['signup', 'recovery', 'email_change', 'magiclink', 'invite', 'email'];

function linkType(value: string | null | undefined): AuthLinkType | null {
  return value && (LINK_TYPES as string[]).includes(value) ? value as AuthLinkType : null;
}

function readParams(url: string) {
  const params = new Map<string, string>();
  const take = (part: string) => {
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const i = pair.indexOf('=');
      const key = decodeURIComponent((i < 0 ? pair : pair.slice(0, i)).replace(/\+/g, ' '));
      const value = i < 0 ? '' : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
      if (key && !params.has(key)) params.set(key, value);
    }
  };
  const hashAt = url.indexOf('#');
  const beforeHash = hashAt < 0 ? url : url.slice(0, hashAt);
  const queryAt = beforeHash.indexOf('?');
  // Implicit-flow tokens arrive in the hash, PKCE codes and errors in the query.
  if (hashAt >= 0) take(url.slice(hashAt + 1));
  if (queryAt >= 0) take(beforeHash.slice(queryAt + 1));
  return params;
}

/** null when the URL is not an auth redirect. */
export function parseAuthLink(url: string | null | undefined): AuthLink | null {
  if (!url) return null;
  let params: Map<string, string>;
  try {
    params = readParams(url);
  } catch {
    return null;
  }
  const type = linkType(params.get('type'));
  const errorCode = params.get('error_code') || params.get('error');
  if (errorCode) {
    return { kind: 'error', errorCode, description: params.get('error_description') || '', type };
  }
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) return { kind: 'tokens', accessToken, refreshToken, type };
  const tokenHash = params.get('token_hash');
  if (tokenHash && type) return { kind: 'token_hash', tokenHash, type };
  const code = params.get('code');
  if (code) return { kind: 'code', code, type };
  return null;
}

/** The same URL without its auth parameters (to clean the browser address bar). */
export function stripAuthParams(url: string) {
  const hashAt = url.indexOf('#');
  const base = hashAt < 0 ? url : url.slice(0, hashAt);
  const queryAt = base.indexOf('?');
  return queryAt < 0 ? base : base.slice(0, queryAt);
}

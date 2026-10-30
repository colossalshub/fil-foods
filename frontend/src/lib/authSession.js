// The order screen can still show a signed-in user after the Supabase client
// has dropped its stored session. Checkout keeps the access token from login
// and uses it until it is actually expired.

const EXPIRY_SKEW_MS = 15_000;

function decodeBase64Url(segment) {
  const base64 = String(segment).replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  if (typeof globalThis.atob !== 'function') return null;
  try {
    return globalThis.atob(padded);
  } catch {
    return null;
  }
}

function jwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length < 2) return null;
  const json = decodeBase64Url(parts[1]);
  if (!json) return null;
  try {
    const payload = JSON.parse(json);
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

export function jwtExp(token) {
  const exp = Number(jwtPayload(token)?.exp);
  return Number.isFinite(exp) && exp > 0 ? exp : null;
}

export function jwtSubject(token) {
  const sub = jwtPayload(token)?.sub;
  return typeof sub === 'string' && sub ? sub : null;
}

export function normalizeExpiresAt(session, now = Date.now()) {
  const raw = Number(session?.expires_at);
  if (Number.isFinite(raw) && raw > 0) {
    return raw > 10_000_000_000 ? Math.floor(raw / 1000) : Math.floor(raw);
  }
  const exp = jwtExp(session?.access_token);
  if (exp) return exp;
  const expiresIn = Number(session?.expires_in);
  if (Number.isFinite(expiresIn) && expiresIn > 0) {
    return Math.floor(now / 1000) + Math.floor(expiresIn);
  }
  return null;
}

export function accessTokenStillValid(session, now = Date.now()) {
  if (!session?.access_token) return false;
  const expiresAt = normalizeExpiresAt(session, now);
  if (!expiresAt) return true;
  return expiresAt * 1000 > now + EXPIRY_SKEW_MS;
}

export function chooseOrderSession(clientSession, remembered, now = Date.now()) {
  if (accessTokenStillValid(clientSession, now)) return clientSession;
  if (accessTokenStillValid(remembered, now)) return remembered;
  if (clientSession?.access_token) return clientSession;
  if (remembered?.access_token) return remembered;
  return null;
}

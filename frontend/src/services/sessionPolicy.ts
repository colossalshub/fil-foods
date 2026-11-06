import type { PersistedSession, User } from '../types';

// USR-03: without "Keep me logged in", the session ends when the app is closed
// or after 15 minutes without activity. The workbook does not name the minutes,
// so 15 is the inactivity window used by the client.
export const INACTIVITY_MS = 15 * 60 * 1000;

export function shouldEndSession({
  keepLoggedIn,
  appBackgrounded,
  lastActiveAt,
  now,
}: {
  keepLoggedIn?: boolean;
  appBackgrounded?: boolean;
  lastActiveAt?: number | null;
  now?: number | null;
}) {
  if (keepLoggedIn) return false;
  if (appBackgrounded) return true;
  if (!lastActiveAt || !now) return false;
  return now - lastActiveAt >= INACTIVITY_MS;
}

export function shouldPersistSession(keepLoggedIn: boolean) {
  return !!keepLoggedIn;
}

export function buildPersistedSession({
  userId,
  username,
  sessionVersion,
}: {
  userId: string;
  username?: string | null;
  sessionVersion: number;
}): PersistedSession {
  return {
    userId,
    username: username ?? null,
    sessionVersion,
    keepLoggedIn: true,
  };
}

export function evaluateSessionRestore(stored: PersistedSession | null | undefined, user: User | null | undefined) {
  if (!stored?.keepLoggedIn) {
    return { restore: false, reason: 'no-flag' };
  }
  if (!user) {
    return { restore: false, reason: 'missing-user' };
  }
  if (user.inactive) {
    return { restore: false, reason: 'inactive' };
  }
  if (user.locked) {
    return { restore: false, reason: 'locked' };
  }
  if (stored.sessionVersion !== user.sessionVersion) {
    return { restore: false, reason: 'session-version' };
  }
  return { restore: true };
}

// USR-03: without "Keep me logged in", the session ends when the app is closed
// or after 15 minutes without activity. The workbook does not name the minutes,
// so 15 is the inactivity window used by the client.
export const INACTIVITY_MS = 15 * 60 * 1000;

export function shouldEndSession({ keepLoggedIn, appBackgrounded, lastActiveAt, now }) {
  if (keepLoggedIn) return false;
  if (appBackgrounded) return true;
  if (!lastActiveAt || !now) return false;
  return now - lastActiveAt >= INACTIVITY_MS;
}

export function shouldPersistSession(keepLoggedIn) {
  return !!keepLoggedIn;
}

export function buildPersistedSession({ userId, username, sessionVersion }) {
  return {
    userId,
    username: username ?? null,
    sessionVersion,
    keepLoggedIn: true,
  };
}

export function evaluateSessionRestore(stored, user) {
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

// CLT-03 session restore rules. The story does not define an inactivity timeout, so none is applied.

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

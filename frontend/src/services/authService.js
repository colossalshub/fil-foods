// Temporary local stubs. Swap these bodies for real API calls once a backend is chosen.
// Screens only call these functions, so no screen code needs to change later.
import { getDb, nextId, stamp } from '../data/mockStore.js';
import { registerAccount, toPublicUser, trim, isValidContact, isValidEmail } from '../domain/registration.js';
import { MSG } from '../data/messages.js';
import { formatTimestamp } from '../utils/time.js';
import { verifyCode, sendCode } from './verificationService.js';
import { clearPersistedSession } from './sessionPersistence.js';
import { disableBiometricUnlock } from './biometricService.js';
import { comparePassword, comparePasswordSync, hashPasswordSync } from './securityService.js';

const wait = (ms = 400) => new Promise((r) => setTimeout(r, ms));

const MAX_FAILED_ATTEMPTS = 5;
const MAX_LOGIN_ATTEMPTS_PER_MINUTE = 10;
const MINUTE_MS = 60 * 1000;

export function getUser(userId) {
  return getDb().users.find((item) => item.id === userId) || null;
}

function sameEmail(a, b) {
  return trim(a).toLowerCase() === trim(b).toLowerCase();
}

export function normalizeContact(value) {
  let v = String(value ?? '').replace(/\s/g, '');
  if (v.startsWith('+639')) v = `0${v.slice(4)}`;
  else if (v.startsWith('639') && v.length === 12) v = `0${v.slice(2)}`;
  return v;
}

export function isGoogleOnlyAccount(user) {
  if (!user) return false;
  const noPassword = user.passwordHash == null || user.passwordHash === '';
  return noPassword && !!user.googleSub;
}

function pruneAttempts() {
  const cutoff = Date.now() - MINUTE_MS;
  getDb().attempts = getDb().attempts.filter((item) => item.atMs > cutoff);
}

function loginAttemptsInLastMinute() {
  pruneAttempts();
  return getDb().attempts.length;
}

function recordDeviceLoginAttempt(username) {
  pruneAttempts();
  getDb().attempts.push({ username, atMs: Date.now(), at: stamp() });
}

export async function login({ username, password }) {
  await wait();

  if (loginAttemptsInLastMinute() >= MAX_LOGIN_ATTEMPTS_PER_MINUTE) {
    return { ok: false, message: MSG.rateLimit };
  }

  recordDeviceLoginAttempt(username);

  const name = String(username ?? '').trim();
  const pass = String(password ?? '');
  if (!name || !pass) {
    return { ok: false, message: MSG.invalidCredentials };
  }

  const user = getDb().users.find((item) => item.username === name);
  if (!user) {
    return { ok: false, message: MSG.invalidCredentials };
  }

  if (user.inactive) {
    return { ok: false, message: MSG.inactive };
  }

  if (user.locked) {
    return { ok: false, message: MSG.locked };
  }

  const hasPassword = user.passwordHash != null && user.passwordHash !== '';
  if (!hasPassword) {
    return { ok: false, message: MSG.invalidCredentials };
  }

  if (!(await comparePassword(pass, user.passwordHash))) {
    user.failedAttempts += 1;
    if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      user.locked = true;
    }
    return { ok: false, message: MSG.invalidCredentials };
  }

  user.failedAttempts = 0;

  if (!user.verified) {
    return {
      ok: false,
      message: MSG.verifyFirst,
      verifyRequired: true,
      userId: user.id,
    };
  }

  user.authEvents.push({ type: 'login', at: stamp() });

  // CLT-41 (plans) and meal ordering must reject unverified accounts the same way.
  return { ok: true, user: toPublicUser(user) };
}

export function logout(userId) {
  const user = getUser(userId);
  if (!user) return;
  disableBiometricUnlock(userId);
  user.authEvents.push({ type: 'logout', at: stamp() });
}

export async function register(data) {
  return registerAccount(data, getDb(), { id: nextId('user'), now: stamp() });
}

export function getPublicUser(userId) {
  const user = getUser(userId);
  return toPublicUser(user);
}

export const publicUser = getPublicUser;

export function recordLogin(userId) {
  const user = getUser(userId);
  if (!user) return null;
  user.authEvents.push({ type: 'login', at: stamp() });
  return toPublicUser(user);
}

export async function linkGoogleAccount({ username, password, google }) {
  await wait();
  const name = String(username ?? '').trim();
  const pass = String(password ?? '');
  if (!name || !pass || !google?.sub) {
    return { ok: false, message: MSG.required };
  }

  const user = getDb().users.find((item) => item.username === name);
  if (!user) {
    return { ok: false, message: MSG.invalidCredentials };
  }

  if (user.inactive) {
    return { ok: false, message: MSG.inactive };
  }

  if (user.locked) {
    return { ok: false, message: MSG.locked };
  }

  const hasPassword = user.passwordHash != null && user.passwordHash !== '';
  if (!hasPassword) {
    return { ok: false, message: MSG.invalidCredentials };
  }

  if (!(await comparePassword(pass, user.passwordHash))) {
    user.failedAttempts += 1;
    if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      user.locked = true;
    }
    return { ok: false, message: MSG.invalidCredentials };
  }

  if (!user.verified) {
    return {
      ok: false,
      message: MSG.verifyFirst,
      status: 'unverified',
      userId: user.id,
    };
  }

  const linkedElsewhere = getDb().users.find(
    (item) => item.googleSub === google.sub && item.id !== user.id,
  );
  if (linkedElsewhere) {
    return { ok: false, message: MSG.googleAlreadyLinked };
  }

  if (user.googleSub && user.googleSub !== google.sub) {
    return { ok: false, message: MSG.googleAlreadyLinked };
  }

  user.googleSub = google.sub;
  user.failedAttempts = 0;
  const signedIn = recordLogin(user.id);
  return { ok: true, message: MSG.googleLinked, user: signedIn };
}

export function completeProfile(userId, input) {
  const user = getUser(userId);
  if (!user) {
    return { ok: false, messages: [MSG.required], fields: {} };
  }

  const firstName = trim(input.firstName);
  const lastName = trim(input.lastName);
  const contactNumber = normalizeContact(input.contactNumber);
  const acceptedTerms = !!input.acceptedTerms;
  const messages = [];
  const fields = {};

  if (!firstName || !lastName || !contactNumber) {
    pushOnce(messages, MSG.required);
    if (!firstName) fields.firstName = true;
    if (!lastName) fields.lastName = true;
    if (!contactNumber) fields.contactNumber = true;
  }

  if (contactNumber && !isValidContact(contactNumber)) {
    pushOnce(messages, MSG.invalidContact);
    fields.contactNumber = true;
  }

  if (!acceptedTerms) {
    pushOnce(messages, MSG.termsRequired);
    fields.terms = true;
  }

  const contactTaken = contactNumber && isValidContact(contactNumber)
    && getDb().users.some(
      (item) => item.id !== userId && item.contactNumber === contactNumber,
    );
  if (contactTaken) {
    pushOnce(messages, MSG.duplicateUser);
    fields.contactNumber = true;
  }

  const unique = [...new Set(messages)];
  if (unique.length) {
    return { ok: false, messages: unique, fields };
  }

  user.firstName = firstName;
  user.lastName = lastName;
  user.contactNumber = contactNumber;
  if (!user.termsAcceptedAt) {
    user.termsAcceptedAt = stamp();
  }
  user.profileComplete = true;

  return { ok: true, user: toPublicUser(user) };
}

function pushOnce(list, message) {
  if (message && !list.includes(message)) list.push(message);
}

export function findTermsAcceptance(username) {
  if (!username) return null;
  const user = getDb().users.find((item) => item.username === username);
  if (!user?.termsAcceptedAt) return null;
  return {
    acceptedAt: user.termsAcceptedAt,
    formatted: formatTimestamp(user.termsAcceptedAt),
  };
}

export function lookupPasswordReset({ mode, value }) {
  if (mode === 'contact') {
    const contactNumber = normalizeContact(value);
    if (!isValidContact(contactNumber)) {
      return { ok: false, message: MSG.invalidContact };
    }
    const user = getDb().users.find((item) => item.contactNumber === contactNumber);
    if (!user) {
      return { ok: false, message: MSG.noContact };
    }
    if (isGoogleOnlyAccount(user)) {
      return { ok: false, message: MSG.googleOnly };
    }
    return {
      ok: true,
      userId: user.id,
      phone: user.contactNumber,
      email: user.email,
    };
  }

  const email = trim(value).toLowerCase();
  if (!isValidEmail(email)) {
    return { ok: false, message: MSG.invalidEmail };
  }
  const user = getDb().users.find((item) => sameEmail(item.email, email));
  if (!user) {
    return { ok: false, message: MSG.noEmail };
  }
  if (isGoogleOnlyAccount(user)) {
    return { ok: false, message: MSG.googleOnly };
  }
  return {
    ok: true,
    userId: user.id,
    phone: user.contactNumber,
    email: user.email,
  };
}

export function verifyResetCode({ userId, code }) {
  const result = verifyCode({ userId, purpose: 'reset', code });
  if (!result.ok) return result;

  const grantId = nextId('grant');
  getDb().grants.push({
    id: grantId,
    userId,
    used: false,
    createdAtMs: Date.now(),
  });
  return { ok: true, grantId };
}

export function peekGrant(grantId) {
  if (!grantId) return null;
  return getDb().grants.find((item) => item.id === grantId && !item.used) || null;
}

export function updatePassword({ grantId, password, confirmPassword }) {
  const grant = peekGrant(grantId);
  if (!grant) {
    return { ok: false, code: 'no-grant', messages: [] };
  }

  const pass = String(password ?? '');
  const confirm = String(confirmPassword ?? '');
  const messages = [];

  if (!pass || !confirm) {
    messages.push(MSG.required);
  }
  if (pass !== confirm) {
    messages.push(MSG.passwordMismatch);
  }
  if (pass.length < 8) {
    messages.push(MSG.shortPassword);
  }

  const user = getUser(grant.userId);
  if (user && comparePasswordSync(pass, user.passwordHash)) {
    messages.push(MSG.samePassword);
  }

  const unique = [...new Set(messages)];
  if (unique.length) {
    return { ok: false, messages: unique };
  }

  grant.used = true;
  user.passwordHash = hashPasswordSync(pass);
  user.passwordStorage = 'bcrypt';
  user.sessionVersion += 1;
  user.locked = false;
  user.failedAttempts = 0;
  disableBiometricUnlock(grant.userId);

  void clearPersistedSession();

  return { ok: true, message: MSG.passwordUpdated };
}

// Re-export for tests that exercise the reset send path.
export { sendCode };

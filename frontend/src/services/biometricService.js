// CLT-44 Biometric unlock. No fingerprint or face data is stored — only { enabled } on the user.
import { getDb } from '../data/mockStore.js';
import { comparePasswordSync } from './securityService.js';
import { toPublicUser } from '../domain/registration.js';
import { MSG } from '../data/messages.js';

function getUser(userId) {
  return getDb().users.find((item) => item.id === userId) || null;
}

export const BIOMETRIC_FAIL_MESSAGE =
  'Biometric not recognised. Try again or use your password.';

export const MAX_BIOMETRIC_FAILURES = 3;
export const BACKGROUND_PROMPT_MS = 5 * 60 * 1000;

const DEFAULT_DEVICE = {
  supported: false,
  enrolled: false,
  changedEnrollment: false,
};

/** @type {{ supported: boolean, enrolled: boolean, changedEnrollment: boolean }} */
let deviceState = { ...DEFAULT_DEVICE };

/** @type {Map<string, { failures: number, requirePassword: boolean, lastActiveAtMs: number | null }>} */
const sessions = new Map();

function sessionFor(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { failures: 0, requirePassword: false, lastActiveAtMs: null });
  }
  return sessions.get(userId);
}

export function __resetBiometricSessions() {
  sessions.clear();
}

export function setBiometricDevice(device) {
  deviceState = { ...DEFAULT_DEVICE, ...device };
}

export function getBiometricDevice() {
  return { ...deviceState };
}

export function resetBiometricDevice() {
  deviceState = { ...DEFAULT_DEVICE };
}

export function isBiometricOptionVisible(device = getBiometricDevice()) {
  return Boolean(device.supported && device.enrolled);
}

export function shouldPrompt(lastActiveAt, now, enabled) {
  if (!enabled) return false;
  if (lastActiveAt == null) return true;
  return now - lastActiveAt >= BACKGROUND_PROMPT_MS;
}

export function getLastActiveAt(userId) {
  return sessionFor(userId).lastActiveAtMs;
}

export function touchLastActive(userId, nowMs = Date.now()) {
  sessionFor(userId).lastActiveAtMs = nowMs;
}

export function isBiometricEnabled(userId) {
  const user = getUser(userId);
  return Boolean(user?.biometricUnlock?.enabled);
}

export function biometricRequiresPassword(userId) {
  return sessionFor(userId).requirePassword;
}

function verifyCurrentPassword(userId, password) {
  const user = getUser(userId);
  if (!user) return false;
  const hasPassword = user.passwordHash != null && user.passwordHash !== '';
  if (!hasPassword) return false;
  return comparePasswordSync(password, user.passwordHash);
}

export function disableBiometricUnlock(userId) {
  const user = getUser(userId);
  if (!user) return;
  user.biometricUnlock = { enabled: false };
  const session = sessionFor(userId);
  session.failures = 0;
  session.requirePassword = false;
}

export function syncEnrollmentChange(userId, device = getBiometricDevice()) {
  if (!device.changedEnrollment) {
    return { changed: false, requirePassword: false };
  }
  const user = getUser(userId);
  if (!user?.biometricUnlock?.enabled) {
    return { changed: false, requirePassword: false };
  }
  disableBiometricUnlock(userId);
  sessionFor(userId).requirePassword = true;
  return { changed: true, requirePassword: true };
}

export function enableBiometricUnlock(userId, password, device = getBiometricDevice()) {
  if (!isBiometricOptionVisible(device)) {
    return { ok: false, hidden: true };
  }
  if (device.changedEnrollment) {
    disableBiometricUnlock(userId);
    sessionFor(userId).requirePassword = true;
    return { ok: false, requirePassword: true, message: MSG.invalidCredentials };
  }
  const user = getUser(userId);
  if (!user) {
    return { ok: false, message: MSG.invalidCredentials };
  }
  if (!verifyCurrentPassword(userId, password)) {
    return { ok: false, message: MSG.invalidCredentials };
  }
  user.biometricUnlock = { enabled: true };
  const session = sessionFor(userId);
  session.failures = 0;
  session.requirePassword = false;
  return { ok: true, user: toPublicUser(user) };
}

export function confirmBiometricSessionWithPassword(userId, password) {
  if (!verifyCurrentPassword(userId, password)) {
    return { ok: false, message: MSG.invalidCredentials };
  }
  const session = sessionFor(userId);
  session.failures = 0;
  session.requirePassword = false;
  touchLastActive(userId);
  return { ok: true };
}

export function recordBiometricCheck(userId, success) {
  const user = getUser(userId);
  if (!user) {
    return { ok: false, message: BIOMETRIC_FAIL_MESSAGE };
  }
  const session = sessionFor(userId);
  if (session.requirePassword) {
    return { ok: false, requirePassword: true, message: BIOMETRIC_FAIL_MESSAGE };
  }
  if (success) {
    session.failures = 0;
    session.requirePassword = false;
    touchLastActive(userId);
    return { ok: true };
  }
  session.failures += 1;
  if (session.failures >= MAX_BIOMETRIC_FAILURES) {
    session.requirePassword = true;
  }
  return {
    ok: false,
    message: BIOMETRIC_FAIL_MESSAGE,
    requirePassword: session.requirePassword,
    failures: session.failures,
  };
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { getDb, resetStore } from '../data/mockStore.js';
import { MSG } from '../data/messages.js';
import { registerAccount } from '../domain/registration.js';
import {
  login,
  logout,
  lookupPasswordReset,
  verifyResetCode,
  peekGrant,
  updatePassword,
  sendCode,
  linkGoogleAccount,
  completeProfile,
  register,
} from './authService.js';
import { MOCK_CODE } from './verificationService.js';
import { buildPersistedSession } from './sessionPolicy.js';
import { __setTestStore, persistSession, readPersistedSession } from './sessionPersistence.js';

function form(overrides = {}) {
  return {
    firstName: 'Juan',
    middleName: '',
    lastName: 'Reyes',
    suffix: '',
    contactNumber: '09181234567',
    email: 'juan.reyes@gmail.com',
    username: 'jreyes',
    password: 'Meal@2026',
    acceptedTerms: true,
    ...overrides,
  };
}

test('unverified account with correct password returns verifyFirst', async () => {
  resetStore();
  registerAccount(form(), getDb(), { id: 'user-u', now: '2026-10-24T00:00:00.000Z' });
  const result = await login({ username: 'jreyes', password: 'Meal@2026' });
  assert.equal(result.ok, false);
  assert.equal(result.message, MSG.verifyFirst);
  assert.equal(result.verifyRequired, true);
  assert.ok(result.userId);
});

test('five wrong passwords lock the account', async () => {
  resetStore();
  registerAccount(form(), getDb(), { id: 'user-lock', now: '2026-10-24T00:00:00.000Z' });
  for (let i = 0; i < 5; i += 1) {
    const r = await login({ username: 'jreyes', password: 'wrong-pass' });
    assert.equal(r.message, MSG.invalidCredentials);
  }
  const user = getDb().users.find((u) => u.username === 'jreyes');
  assert.equal(user.locked, true);
  const withCorrect = await login({ username: 'jreyes', password: 'Meal@2026' });
  assert.equal(withCorrect.message, MSG.locked);
});

test('ten device attempts per minute do not increment account lock counter', async () => {
  resetStore();
  registerAccount(form(), getDb(), { id: 'user-rate', now: '2026-10-24T00:00:00.000Z' });
  const now = Date.now();
  for (let i = 0; i < 10; i += 1) {
    getDb().attempts.push({ username: 'jreyes', atMs: now - i * 1000, at: '2026-10-24T00:00:00.000Z' });
  }
  const user = getDb().users.find((u) => u.username === 'jreyes');
  assert.equal(user.failedAttempts, 0);
  const blocked = await login({ username: 'jreyes', password: 'wrong-pass' });
  assert.equal(blocked.message, MSG.rateLimit);
  assert.equal(user.failedAttempts, 0);
  assert.equal(user.locked, false);
});

test('msantos logs in and records a login event', async () => {
  resetStore();
  const maria = getDb().users.find((u) => u.username === 'msantos');
  assert.ok(maria);
  const result = await login({ username: 'msantos', password: 'Meal@2026' });
  assert.equal(result.ok, true);
  assert.equal(result.user.username, 'msantos');
  assert.equal(result.user.firstName, 'Maria');
  assert.equal(result.user.verified, true);
  assert.equal(result.user.password, undefined);
  assert.ok(maria.authEvents.some((e) => e.type === 'login' && e.at));
});

test('logout records a logout timestamp on the account', () => {
  resetStore();
  const maria = getDb().users.find((u) => u.username === 'msantos');
  logout(maria.id);
  assert.ok(maria.authEvents.some((e) => e.type === 'logout' && e.at));
});

test('unknown contact number for password reset', () => {
  resetStore();
  const result = lookupPasswordReset({ mode: 'contact', value: '09999999999' });
  assert.equal(result.ok, false);
  assert.equal(result.message, MSG.noContact);
});

test('unknown email for password reset', () => {
  resetStore();
  const result = lookupPasswordReset({ mode: 'email', value: 'unknown@example.com' });
  assert.equal(result.ok, false);
  assert.equal(result.message, MSG.noEmail);
});

test('google-only account refuses password reset by contact or email', () => {
  resetStore();
  const byPhone = lookupPasswordReset({ mode: 'contact', value: '09175550142' });
  assert.equal(byPhone.message, MSG.googleOnly);
  const byEmail = lookupPasswordReset({ mode: 'email', value: 'ana.cruz@gmail.com' });
  assert.equal(byEmail.message, MSG.googleOnly);
});

test('reset code issues a one-time grant', () => {
  resetStore();
  const maria = getDb().users.find((u) => u.username === 'msantos');
  const sent = sendCode({ userId: maria.id, channel: 'sms', purpose: 'reset' });
  assert.equal(sent.ok, true);
  const verified = verifyResetCode({ userId: maria.id, code: MOCK_CODE });
  assert.equal(verified.ok, true);
  assert.ok(peekGrant(verified.grantId));
});

test('update password requires a grant', () => {
  resetStore();
  const result = updatePassword({
    grantId: 'missing-grant',
    password: 'NewMeal@2026',
    confirmPassword: 'NewMeal@2026',
  });
  assert.equal(result.code, 'no-grant');
});

test('password reset validation and success for msantos', async () => {
  resetStore();
  __setTestStore(new Map());
  const maria = getDb().users.find((u) => u.username === 'msantos');
  maria.locked = true;
  maria.failedAttempts = 5;
  const versionBefore = maria.sessionVersion;

  await persistSession(buildPersistedSession({
    userId: maria.id,
    username: maria.username,
    sessionVersion: versionBefore,
  }));

  sendCode({ userId: maria.id, channel: 'email', purpose: 'reset' });
  const { grantId } = verifyResetCode({ userId: maria.id, code: MOCK_CODE });

  const mismatch = updatePassword({ grantId, password: 'NewMeal@2026', confirmPassword: 'Other@2026' });
  assert.ok(mismatch.messages.includes(MSG.passwordMismatch));

  const short = updatePassword({ grantId, password: 'Meal@1', confirmPassword: 'Meal@1' });
  assert.ok(short.messages.includes(MSG.shortPassword));

  const same = updatePassword({ grantId, password: 'Meal@2026', confirmPassword: 'Meal@2026' });
  assert.ok(same.messages.includes(MSG.samePassword));

  const ok = updatePassword({ grantId, password: 'NewMeal@2026', confirmPassword: 'NewMeal@2026' });
  assert.equal(ok.ok, true);
  assert.equal(ok.message, MSG.passwordUpdated);
  assert.equal(maria.password, 'NewMeal@2026');
  assert.equal(maria.locked, false);
  assert.equal(maria.failedAttempts, 0);
  assert.equal(maria.sessionVersion, versionBefore + 1);
  assert.equal(peekGrant(grantId), null);

  const stored = await readPersistedSession();
  assert.equal(stored, null);

  __setTestStore(null);
});

test('password registration and login still work without Google', async () => {
  resetStore();
  const created = await register(form({ username: 'pcruz', email: 'p.cruz@gmail.com', contactNumber: '09181112233' }));
  assert.equal(created.ok, true);
  const user = getDb().users.find((u) => u.username === 'pcruz');
  user.verified = true;
  const signedIn = await login({ username: 'pcruz', password: 'Meal@2026' });
  assert.equal(signedIn.ok, true);
  assert.equal(signedIn.user.username, 'pcruz');
});

test('link Google requires correct password and records login', async () => {
  resetStore();
  const google = {
    sub: 'google-link-msantos',
    email: 'maria.santos@gmail.com',
    firstName: 'Maria',
    lastName: 'Santos',
  };
  const wrong = await linkGoogleAccount({ username: 'msantos', password: 'wrong', google });
  assert.equal(wrong.message, MSG.invalidCredentials);
  const ok = await linkGoogleAccount({ username: 'msantos', password: 'Meal@2026', google });
  assert.equal(ok.ok, true);
  assert.equal(ok.message, MSG.googleLinked);
  const maria = getDb().users.find((u) => u.username === 'msantos');
  assert.equal(maria.googleSub, google.sub);
  assert.ok(maria.authEvents.some((e) => e.type === 'login'));
});

test('five failed link attempts lock the account like login', async () => {
  resetStore();
  const google = {
    sub: 'google-lock-test',
    email: 'maria.santos@gmail.com',
    firstName: 'Maria',
    lastName: 'Santos',
  };
  for (let i = 0; i < 5; i += 1) {
    const r = await linkGoogleAccount({ username: 'msantos', password: 'bad', google });
    assert.equal(r.message, MSG.invalidCredentials);
  }
  const maria = getDb().users.find((u) => u.username === 'msantos');
  assert.equal(maria.locked, true);
});

test('Google sub already linked elsewhere is rejected on link', async () => {
  resetStore();
  const google = {
    sub: 'google-ana-cruz',
    email: 'maria.santos@gmail.com',
    firstName: 'Maria',
    lastName: 'Santos',
  };
  const result = await linkGoogleAccount({ username: 'msantos', password: 'Meal@2026', google });
  assert.equal(result.ok, false);
  assert.equal(result.message, MSG.googleAlreadyLinked);
});

test('complete profile validates and saves a Google user', () => {
  resetStore();
  getDb().users.push({
    id: 'user-google-incomplete',
    accountFor: 'self',
    firstName: 'Jamie',
    middleName: '',
    lastName: 'Lopez',
    suffix: '',
    contactNumber: '',
    email: 'jamie.lopez@gmail.com',
    username: null,
    password: null,
    verified: true,
    profileComplete: false,
    inactive: false,
    locked: false,
    failedAttempts: 0,
    googleSub: 'google-jamie',
    termsAcceptedAt: null,
    authEvents: [],
    sessionVersion: 1,
    createdAt: '2026-10-24T00:00:00.000Z',
  });

  const missing = completeProfile('user-google-incomplete', {
    firstName: '',
    lastName: 'Lopez',
    contactNumber: '',
    acceptedTerms: false,
  });
  assert.ok(missing.messages.includes(MSG.required));
  assert.ok(missing.messages.includes(MSG.termsRequired));

  const invalidContact = completeProfile('user-google-incomplete', {
    firstName: 'Jamie',
    lastName: 'Lopez',
    contactNumber: '123',
    acceptedTerms: true,
  });
  assert.ok(invalidContact.messages.includes(MSG.invalidContact));

  const duplicate = completeProfile('user-google-incomplete', {
    firstName: 'Jamie',
    lastName: 'Lopez',
    contactNumber: '09171234567',
    acceptedTerms: true,
  });
  assert.ok(duplicate.messages.includes(MSG.duplicateUser));

  const ok = completeProfile('user-google-incomplete', {
    firstName: 'Jamie',
    lastName: 'Lopez',
    contactNumber: '09179998877',
    acceptedTerms: true,
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.user.profileComplete, true);
  assert.ok(ok.user.termsAcceptedAt);
});

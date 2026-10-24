import assert from 'node:assert/strict';
import test from 'node:test';
import { getDb, resetStore } from '../data/mockStore.js';
import { MSG } from '../data/messages.js';
import { login, logout } from './authService.js';
import {
  BIOMETRIC_FAIL_MESSAGE,
  __resetBiometricSessions,
  enableBiometricUnlock,
  isBiometricEnabled,
  isBiometricOptionVisible,
  recordBiometricCheck,
  resetBiometricDevice,
  setBiometricDevice,
  shouldPrompt,
  syncEnrollmentChange,
} from './biometricService.js';

const supportedDevice = { supported: true, enrolled: true, changedEnrollment: false };

test('biometric option hidden when device unsupported or not enrolled', () => {
  resetBiometricDevice();
  assert.equal(isBiometricOptionVisible({ supported: false, enrolled: true }), false);
  assert.equal(isBiometricOptionVisible({ supported: true, enrolled: false }), false);
  assert.equal(isBiometricOptionVisible(supportedDevice), true);
});

test('enable biometric requires correct password and stores only enabled flag', () => {
  resetStore();
  __resetBiometricSessions();
  setBiometricDevice(supportedDevice);
  const maria = getDb().users.find((u) => u.username === 'msantos');
  const bad = enableBiometricUnlock(maria.id, 'wrong');
  assert.equal(bad.ok, false);
  assert.equal(bad.message, MSG.invalidCredentials);
  assert.equal(isBiometricEnabled(maria.id), false);
  assert.equal(maria.failedAttempts, 0);

  const good = enableBiometricUnlock(maria.id, 'Meal@2026');
  assert.equal(good.ok, true);
  assert.deepEqual(maria.biometricUnlock, { enabled: true });
  assert.equal('fingerprint' in maria.biometricUnlock, false);
  assert.equal(good.user.biometricUnlock.enabled, true);
});

test('three failed biometric checks require password and use the story message', () => {
  resetStore();
  __resetBiometricSessions();
  setBiometricDevice(supportedDevice);
  const maria = getDb().users.find((u) => u.username === 'msantos');
  maria.biometricUnlock = { enabled: true };

  for (let i = 0; i < 2; i += 1) {
    const r = recordBiometricCheck(maria.id, false);
    assert.equal(r.ok, false);
    assert.equal(r.message, BIOMETRIC_FAIL_MESSAGE);
    assert.equal(r.requirePassword, false);
  }
  const third = recordBiometricCheck(maria.id, false);
  assert.equal(third.requirePassword, true);
  assert.equal(third.message, BIOMETRIC_FAIL_MESSAGE);

  const blocked = recordBiometricCheck(maria.id, false);
  assert.equal(blocked.requirePassword, true);
});

test('failed biometric checks and enable attempts do not increment login lock counter', async () => {
  resetStore();
  __resetBiometricSessions();
  setBiometricDevice(supportedDevice);
  const maria = getDb().users.find((u) => u.username === 'msantos');
  maria.biometricUnlock = { enabled: true };

  for (let i = 0; i < 5; i += 1) {
    recordBiometricCheck(maria.id, false);
  }
  assert.equal(maria.failedAttempts, 0);
  assert.equal(maria.locked, false);

  for (let i = 0; i < 5; i += 1) {
    enableBiometricUnlock(maria.id, 'wrong-pass');
  }
  assert.equal(maria.failedAttempts, 0);
  assert.equal(maria.locked, false);

  const loginFail = await login({ username: 'msantos', password: 'wrong-pass' });
  assert.equal(loginFail.ok, false);
  assert.equal(maria.failedAttempts, 1);
});

test('logout disables biometric unlock', () => {
  resetStore();
  __resetBiometricSessions();
  setBiometricDevice(supportedDevice);
  const maria = getDb().users.find((u) => u.username === 'msantos');
  maria.biometricUnlock = { enabled: true };
  logout(maria.id);
  assert.equal(isBiometricEnabled(maria.id), false);
});

test('changed device enrollment disables biometric and requires password', () => {
  resetStore();
  __resetBiometricSessions();
  setBiometricDevice({ ...supportedDevice, changedEnrollment: true });
  const maria = getDb().users.find((u) => u.username === 'msantos');
  maria.biometricUnlock = { enabled: true };

  const result = syncEnrollmentChange(maria.id);
  assert.equal(result.changed, true);
  assert.equal(result.requirePassword, true);
  assert.equal(isBiometricEnabled(maria.id), false);
});

test('shouldPrompt after five minutes or on reopen when enabled', () => {
  const now = Date.parse('2026-10-24T12:00:00.000Z');
  assert.equal(shouldPrompt(null, now, true), true);
  assert.equal(shouldPrompt(now - 5 * 60 * 1000, now, true), true);
  assert.equal(shouldPrompt(now - 4 * 60 * 1000, now, true), false);
  assert.equal(shouldPrompt(null, now, false), false);
});

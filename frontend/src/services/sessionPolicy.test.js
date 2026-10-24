import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPersistedSession,
  evaluateSessionRestore,
  shouldPersistSession,
} from './sessionPolicy.js';

test('keep logged in persists only when the checkbox is ticked', () => {
  assert.equal(shouldPersistSession(true), true);
  assert.equal(shouldPersistSession(false), false);
  assert.equal(shouldPersistSession(undefined), false);
});

test('persisted session stores public fields only', () => {
  const stored = buildPersistedSession({
    userId: 'user-maria',
    username: 'msantos',
    sessionVersion: 1,
  });
  assert.deepEqual(stored, {
    userId: 'user-maria',
    username: 'msantos',
    sessionVersion: 1,
    keepLoggedIn: true,
  });
  assert.equal('password' in stored, false);
});

test('session restore rejects locked accounts and session version bumps', () => {
  const stored = buildPersistedSession({
    userId: 'user-maria',
    username: 'msantos',
    sessionVersion: 1,
  });
  const active = {
    id: 'user-maria',
    inactive: false,
    locked: false,
    sessionVersion: 1,
  };
  assert.equal(evaluateSessionRestore(stored, active).restore, true);

  assert.equal(evaluateSessionRestore(stored, { ...active, locked: true }).restore, false);
  assert.equal(evaluateSessionRestore(stored, { ...active, sessionVersion: 2 }).restore, false);
  assert.equal(evaluateSessionRestore(null, active).restore, false);
});

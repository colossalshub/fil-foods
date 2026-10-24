import assert from 'node:assert/strict';
import test from 'node:test';
import { getDb, resetStore } from '../data/mockStore.js';
import { MSG } from '../data/messages.js';
import {
  continueWithGoogle,
  resolveGoogleProfile,
  PICKER_ACCOUNTS,
} from './googleAuthService.js';

test('new Google user is created once for the same sub', () => {
  resetStore();
  const profile = {
    sub: 'google-stable-new',
    email: 'stable.new@gmail.com',
    firstName: 'Sam',
    lastName: 'Lee',
  };
  const first = resolveGoogleProfile(profile, 'self');
  assert.equal(first.ok, true);
  assert.equal(first.user.profileComplete, false);
  const countAfterFirst = getDb().users.filter((u) => u.googleSub === profile.sub).length;
  assert.equal(countAfterFirst, 1);

  const second = resolveGoogleProfile(profile, 'self');
  assert.equal(second.ok, true);
  assert.equal(second.user.id, first.user.id);
  assert.equal(getDb().users.filter((u) => u.googleSub === profile.sub).length, 1);
});

test('returning Google user with complete profile signs in', async () => {
  resetStore();
  const result = await continueWithGoogle({ outcome: 'returning' });
  assert.equal(result.ok, true);
  assert.equal(result.user.email, 'ana.cruz@gmail.com');
  assert.equal(result.user.profileComplete, true);
});

test('matching email without link does not create or sign in automatically', () => {
  resetStore();
  const profile = {
    sub: 'google-wants-maria',
    email: 'maria.santos@gmail.com',
    firstName: 'Maria',
    lastName: 'Santos',
  };
  const result = resolveGoogleProfile(profile, 'self');
  assert.equal(result.ok, false);
  assert.equal(result.status, 'link');
  assert.equal(result.message, MSG.linkPrompt);
  assert.equal(getDb().users.some((u) => u.googleSub === profile.sub), false);
});

test('Google cancel, refused, connection, and inactive messages', async () => {
  resetStore();
  assert.equal((await continueWithGoogle({ outcome: 'cancelled' })).message, MSG.googleCancelled);
  assert.equal((await continueWithGoogle({ outcome: 'refused' })).message, MSG.googleNeedsName);
  assert.equal((await continueWithGoogle({ outcome: 'no_connection' })).message, MSG.googleConnection);
  const inactive = await continueWithGoogle({ outcome: 'inactive' });
  assert.equal(inactive.ok, false);
  assert.equal(inactive.message, MSG.inactive);
});

test('account picker treats maria email and work email as separate clients', () => {
  resetStore();
  const mariaPicker = PICKER_ACCOUNTS[0];
  const workPicker = PICKER_ACCOUNTS[1];

  const linkMaria = resolveGoogleProfile(mariaPicker, 'self');
  assert.equal(linkMaria.status, 'link');

  const work = resolveGoogleProfile(workPicker, 'self');
  assert.equal(work.ok, true);
  assert.equal(work.user.email, 'msantos.work@gmail.com');
  assert.equal(work.user.profileComplete, false);
});

test('linked password account signs in again with the same Google sub', async () => {
  resetStore();
  const maria = getDb().users.find((u) => u.username === 'msantos');
  maria.googleSub = 'google-msantos-linked';
  const profile = {
    sub: 'google-msantos-linked',
    email: 'maria.santos@gmail.com',
    firstName: 'Maria',
    lastName: 'Santos',
  };
  const result = resolveGoogleProfile(profile, 'self');
  assert.equal(result.ok, true);
  assert.equal(result.user.id, maria.id);
});

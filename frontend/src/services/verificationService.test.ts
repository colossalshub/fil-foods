import assert from 'node:assert/strict';
import test from 'node:test';
import { getDb, resetStore } from '../data/mockStore.js';
import { MSG, waitForCode } from '../data/messages.js';
import { registerAccount } from '../domain/registration.js';
import {
  MOCK_CODE,
  expireActiveCode,
  fillHourlyLimit,
  maskEmail,
  maskPhone,
  sendCode,
  setNextSendShouldFail,
  verifyCode,
} from './verificationService.js';

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

function seedUser() {
  resetStore();
  const db = getDb();
  const result = registerAccount(form(), db, { id: 'user-test', now: '2026-10-24T00:00:00.000Z' });
  assert.equal(result.ok, true);
  return result.userId;
}

test('maskPhone and maskEmail match client story formats', () => {
  assert.equal(maskPhone('09171234567'), '0917*****67');
  assert.equal(maskEmail('maria.santos@gmail.com'), 'm*****s@gmail.com');
});

test('correct code verifies once and marks the account verified', () => {
  const userId = seedUser();
  const send = sendCode({ userId, channel: 'sms', purpose: 'account' });
  assert.equal(send.ok, true);
  assert.equal(send.sent, false);

  const ok = verifyCode({ userId, purpose: 'account', code: MOCK_CODE });
  assert.equal(ok.ok, true);
  assert.equal(getDb().users.find((u) => u.id === userId).verified, true);

  const again = verifyCode({ userId, purpose: 'account', code: MOCK_CODE });
  assert.equal(again.ok, false);
  assert.equal(again.message, MSG.wrongCode);
});

test('wrong code returns the incorrect message', () => {
  const userId = seedUser();
  sendCode({ userId, channel: 'email', purpose: 'account' });
  const result = verifyCode({ userId, purpose: 'account', code: '000000' });
  assert.equal(result.ok, false);
  assert.equal(result.message, MSG.wrongCode);
});

test('expired code returns the expiry message', () => {
  const userId = seedUser();
  sendCode({ userId, channel: 'sms', purpose: 'account' });
  expireActiveCode(userId, 'account');
  const result = verifyCode({ userId, purpose: 'account', code: MOCK_CODE });
  assert.equal(result.ok, false);
  assert.equal(result.message, MSG.codeExpired);
});

test('five wrong attempts require a new code', () => {
  const userId = seedUser();
  sendCode({ userId, channel: 'sms', purpose: 'account' });
  for (let i = 0; i < 4; i += 1) {
    const r = verifyCode({ userId, purpose: 'account', code: '000000' });
    assert.equal(r.message, MSG.wrongCode);
  }
  const fifth = verifyCode({ userId, purpose: 'account', code: '000000' });
  assert.equal(fifth.message, MSG.tooManyWrong);
});

test('resend invalidates the previous code', () => {
  const userId = seedUser();
  sendCode({ userId, channel: 'sms', purpose: 'account' });
  const db = getDb();
  const first = db.codes.filter((c) => c.userId === userId).sort((a, b) => a.createdAtMs - b.createdAtMs)[0];
  db.codes.forEach((c) => {
    if (c.id === first.id) c.createdAtMs = Date.now() - 70_000;
  });
  sendCode({ userId, channel: 'sms', purpose: 'account' });
  assert.equal(first.invalidated, true);
  const active = db.codes.filter((c) => c.userId === userId && !c.invalidated && !c.used);
  assert.equal(active.length, 1);
  assert.notEqual(active[0].id, first.id);
});

test('cooldown returns waitForCode message', () => {
  const userId = seedUser();
  sendCode({ userId, channel: 'sms', purpose: 'account' });
  const again = sendCode({ userId, channel: 'sms', purpose: 'account' });
  assert.equal(again.ok, false);
  assert.match(again.message, /^Please wait \d+ seconds before requesting a new code\.$/);
  assert.equal(again.message, waitForCode(parseInt(again.message.match(/\d+/)[0], 10)));
});

test('hourly cap returns too many code requests', () => {
  const userId = seedUser();
  fillHourlyLimit(userId, 'sms', 'account');
  const result = sendCode({ userId, channel: 'sms', purpose: 'account' });
  assert.equal(result.ok, false);
  assert.equal(result.message, MSG.tooManyCodeRequests);
});

test('send failure returns sendFailed and clears the dev hook', () => {
  const userId = seedUser();
  setNextSendShouldFail(true);
  const result = sendCode({ userId, channel: 'email', purpose: 'account' });
  assert.equal(result.ok, false);
  assert.equal(result.message, MSG.sendFailed);
  assert.equal(getDb().failNextCodeSend, false);
});

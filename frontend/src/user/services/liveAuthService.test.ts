import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authErrorMessage, liveSendBlock, liveUserFromProfile, newLiveCodeState, recordLiveSend, recordLiveWrong,
  validateNewPassword, waitMessage,
} from './liveAuthService.js';
import { MSG } from '../data/messages.js';

test('Supabase auth errors use the USR wording', () => {
  assert.equal(authErrorMessage({ message: 'For security purposes, you can only request this after 42 seconds.' }), waitMessage(42));
  assert.equal(authErrorMessage({ message: 'Email rate limit exceeded', code: 'over_email_send_rate_limit' }), MSG.tooManyCodeRequests);
  assert.equal(authErrorMessage({ message: 'Token has expired or is invalid', code: 'otp_expired' }, 'verify'), MSG.wrongCode);
  assert.equal(authErrorMessage({ message: 'User already registered', code: 'user_already_exists' }, 'signup'), MSG.duplicateEmail);
  assert.equal(authErrorMessage({ message: 'New password should be different from the old password.', code: 'same_password' }, 'password'), MSG.samePassword);
  assert.equal(authErrorMessage({ message: 'Error sending confirmation email' }, 'signup'), MSG.sendFailed);
});

test('live code rules: 60-second resend, five per hour, five wrong entries', () => {
  const t0 = 1_000_000;
  let state = recordLiveSend(newLiveCodeState(), t0);
  assert.equal(liveSendBlock(state, t0 + 10_000), waitMessage(50));
  assert.equal(liveSendBlock(state, t0 + 60_000), null);
  for (let i = 1; i < 5; i += 1) state = recordLiveSend(state, t0 + i * 61_000);
  assert.equal(liveSendBlock(state, t0 + 6 * 61_000), MSG.tooManyCodeRequests);
  let wrong = { state: newLiveCodeState(t0), message: '' };
  for (let i = 0; i < 4; i += 1) wrong = recordLiveWrong(wrong.state);
  assert.equal(wrong.message, MSG.wrongCode);
  assert.equal(recordLiveWrong(wrong.state).message, MSG.tooManyWrong);
  assert.equal(recordLiveSend(recordLiveWrong(wrong.state).state, t0).wrong, 0, 'a new code resets the wrong count');
});

test('profiles row maps to the app user, keeping the account holder and the recipient apart', () => {
  const user = liveUserFromProfile({
    id: 'u1', first_name: 'Carlos', last_name: 'Dizon', contact_number: '09175550123', email: 'carlos@example.com',
    username: 'carlos', is_verified: true, profile_complete: false, is_active: true, account_for: 'family',
    terms_accepted_at: '2026-11-17T01:00:00Z', terms_version: '1.0',
  }, { id: 'r1', first_name: 'Lia', last_name: 'Dizon', relationship: 'Parent', address: '42 Maharlika St' });
  assert.equal(user.firstName, 'Carlos');
  assert.equal(user.accountFor, 'family');
  assert.equal(user.mealRecipient?.firstName, 'Lia');
  assert.equal(user.mealRecipient?.deliveryAddress, '42 Maharlika St');
  assert.equal(user.verified, true);
  assert.equal(user.profileComplete, false);
  assert.equal(liveUserFromProfile({ id: 'u2', is_active: false }).inactive, true);
});

test('new password rules', () => {
  assert.deepEqual(validateNewPassword('', ''), [MSG.required, MSG.shortPassword]);
  assert.deepEqual(validateNewPassword('abcdefgh', 'abcdefgx'), [MSG.passwordMismatch]);
  assert.deepEqual(validateNewPassword('abcdefgh', 'abcdefgh'), []);
});

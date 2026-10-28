import assert from 'node:assert/strict';
import test from 'node:test';
import { MSG } from '../data/messages.js';
import { getDb, resetStore } from '../data/mockStore.js';
import { register } from '../services/authService.js';
import { registerAccount, toPublicUser, validateRegistration } from './registration.js';

const maria = {
  id: 'user-maria',
  username: 'msantos',
  contactNumber: '09171234567',
  email: 'maria.santos@gmail.com',
};

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

test('valid sample details are accepted and stay unverified', () => {
  const db = { users: [maria] };
  const result = registerAccount(form({
    firstName: 'Maria',
    lastName: 'Santos',
    contactNumber: '09180000000',
    email: 'maria.new@gmail.com',
    username: 'marias',
    password: 'Meal@2026',
  }), db, { id: 'user-2', now: '2026-10-24T00:00:00.000Z' });

  assert.equal(result.ok, true);
  assert.equal(result.user.verified, false);
  assert.equal(result.user.profileComplete, false);
  assert.equal(result.user.password, undefined);
  assert.equal(db.users[1].verified, false);
  assert.equal(db.users[1].termsAcceptedAt, '2026-10-24T00:00:00.000Z');
});

test('optional middle name is stored and a blank suffix is allowed', () => {
  const db = { users: [] };
  const result = registerAccount(form({
    firstName: 'Maria',
    middleName: 'Reyes',
    lastName: 'Santos',
    suffix: '',
    contactNumber: '09180000001',
    email: 'maria.reyes@gmail.com',
    username: 'mreyes',
  }), db, { id: 'user-3', now: '2026-10-24T00:00:00.000Z' });

  assert.equal(result.ok, true);
  assert.equal(db.users[0].middleName, 'Reyes');
  assert.equal(db.users[0].suffix, '');
});

test('blank required fields use the required-fields message', () => {
  const result = validateRegistration(form({ firstName: ' ', lastName: '', email: '' }), [maria]);
  assert.equal(result.ok, false);
  assert.ok(result.messages.includes(MSG.required));
  assert.equal(result.fields.firstName, MSG.required);
  assert.equal(result.fields.lastName, MSG.required);
  assert.equal(result.fields.email, MSG.required);
  assert.equal(result.messages.includes(MSG.invalidEmail), false);
});

test('short and lettered contact numbers are rejected', () => {
  for (const contactNumber of ['0917123', '0917ABC4567']) {
    const result = validateRegistration(form({ contactNumber }), []);
    assert.equal(result.fields.contactNumber, MSG.invalidContact);
  }
});

test('invalid email formats are rejected', () => {
  for (const email of ['maria.santos@', 'maria.santos.gmail.com']) {
    const result = validateRegistration(form({ email }), []);
    assert.equal(result.fields.email, MSG.invalidEmail);
  }
});

test('a duplicate username or contact number shares one message', () => {
  const byName = validateRegistration(form({ username: 'msantos' }), [maria]);
  const byPhone = validateRegistration(form({ contactNumber: '09171234567' }), [maria]);
  assert.equal(byName.fields.username, MSG.duplicateUser);
  assert.equal(byPhone.fields.contactNumber, MSG.duplicateUser);
  assert.equal(byName.messages.filter((message) => message === MSG.duplicateUser).length, 1);
});

test('a duplicate email has its own message and ignores letter case', () => {
  const result = validateRegistration(form({ email: 'Maria.Santos@Gmail.com' }), [maria]);
  assert.equal(result.fields.email, MSG.duplicateEmail);
});

test('a short password is rejected and an 8-character password is allowed', () => {
  const short = validateRegistration(form({ password: 'Abc123' }), []);
  assert.equal(short.fields.password, MSG.shortPassword);
  const ok = validateRegistration(form({ password: '12345678' }), []);
  assert.equal(ok.ok, true);
});

test('terms must be accepted with the specified message', () => {
  const result = validateRegistration(form({ acceptedTerms: false }), []);
  assert.equal(result.fields.terms, MSG.termsRequired);
  assert.equal(result.ok, false);
});

test('credentials are stored as bcrypt hashes and never exposed', () => {
  const db = { users: [] };
  const result = registerAccount(form(), db, { id: 'user-4', now: '2026-10-24T00:00:00.000Z' });
  const stored = db.users[0];
  assert.equal(result.user.password, undefined);
  assert.match(stored.passwordHash, /^\$2[aby]\$/);
  assert.equal(stored.passwordStorage, 'bcrypt');
  assert.equal(toPublicUser(stored).password, undefined);
});

test('register() saves an unverified account in the demo store', async () => {
  resetStore();
  const result = await register(form({
    username: 'jreyes',
    email: 'juan.reyes@gmail.com',
    contactNumber: '09181234567',
  }));
  assert.equal(result.ok, true);
  const saved = getDb().users.find((user) => user.id === result.userId);
  assert.equal(saved.verified, false);
  assert.equal(saved.passwordStorage, 'bcrypt');
  assert.equal(result.user.password, undefined);

  const again = await register(form({
    username: 'jreyes',
    email: 'other.reyes@gmail.com',
    contactNumber: '09189999999',
  }));
  assert.equal(again.ok, false);
  assert.ok(again.messages.includes(MSG.duplicateUser));
  resetStore();
});

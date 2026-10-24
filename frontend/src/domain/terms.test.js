import assert from 'node:assert/strict';
import test from 'node:test';
import { TERMS_TEXT } from '../data/legal.js';
import { MSG } from '../data/messages.js';
import { resetStore } from '../data/mockStore.js';
import { findTermsAcceptance, register } from '../services/authService.js';
import { formatTimestamp } from '../utils/time.js';

test('registration without acceptance uses the specified message', () => {
  assert.equal(MSG.termsRequired, 'You must accept the Terms and Conditions to continue.');
});

test('the terms state how health and dietary information is collected and used', () => {
  const text = TERMS_TEXT.toLowerCase();
  assert.match(text, /collect/);
  assert.match(text, /health/);
  assert.match(text, /dietary/);
  assert.match(text, /we use that information/);
});

test('acceptance time is stored and shown in the sample clock format', async () => {
  resetStore();
  const before = Date.now();
  const result = await register({
    firstName: 'Juan',
    lastName: 'Reyes',
    contactNumber: '09182223333',
    email: 'juan.terms@gmail.com',
    username: 'jterms',
    password: 'Meal@2026',
    acceptedTerms: true,
  });
  assert.equal(result.ok, true);
  const acceptance = findTermsAcceptance('jterms');
  assert.ok(acceptance);
  assert.ok(Date.parse(acceptance.acceptedAt) >= before);
  assert.match(acceptance.formatted, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/);

  const localNine = new Date(2026, 9, 12, 9, 15, 0).toISOString();
  assert.equal(formatTimestamp(localNine), '2026-10-12 09:15 AM');
  resetStore();
});

test('the sample client already has a saved acceptance time', () => {
  resetStore();
  const acceptance = findTermsAcceptance('msantos');
  assert.ok(acceptance.acceptedAt);
  assert.match(acceptance.formatted, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2} (AM|PM)$/);
});

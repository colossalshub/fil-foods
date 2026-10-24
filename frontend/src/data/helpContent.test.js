import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FAQ_NO_MATCH,
  FAQ_GROUP_TITLES,
  GUIDE_STEPS,
  contactInfo,
  getContactPhone,
  buildTelHref,
  searchFaq,
} from './helpContent.js';

test('FAQ groups include Account, Ordering, Delivery, and Health Information', () => {
  assert.deepEqual(FAQ_GROUP_TITLES, [
    'Account',
    'Ordering',
    'Delivery',
    'Health Information',
  ]);
});

test('FAQ search finds password-related question', () => {
  const hits = searchFaq('password');
  assert.ok(hits.length >= 1);
  assert.ok(hits.some((item) => item.question.toLowerCase().includes('password')));
});

test('FAQ search with no match is empty and message is defined', () => {
  const hits = searchFaq('xyzzy-no-such-topic');
  assert.equal(hits.length, 0);
  assert.equal(FAQ_NO_MATCH, 'No answers found.');
});

test('contact phone can be overridden for display and tel href', () => {
  const previous = contactInfo.phone;
  contactInfo.phone = '0917-555-0199';
  try {
    assert.equal(getContactPhone(), '0917-555-0199');
    assert.equal(buildTelHref(getContactPhone()), 'tel:09175550199');
  } finally {
    contactInfo.phone = previous;
  }
});

test('app guide is never empty', () => {
  assert.ok(GUIDE_STEPS.length > 0);
  assert.ok(GUIDE_STEPS.some((step) => step.title.includes('Menu: browse and search meals')));
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { TERMS_LAST_UPDATED, TERMS_SECTIONS, TERMS_VERSION } from './terms.js';
import { contactInfo } from './helpContent.js';

test('terms expose the required version, date, and numbered section list', () => {
  assert.equal(TERMS_VERSION, '1.0');
  assert.equal(TERMS_LAST_UPDATED, '2026-11-12');
  assert.deepEqual(
    TERMS_SECTIONS.map(({ number, title }) => `${number}. ${title}`),
    [
      '1. Using F.I.L. Foods',
      '2. Registering For Myself or for a Family Member',
      '3. Health, Dietary and Allergy Information',
      '4. Privacy and Data Protection',
      '5. Meals, Orders and Payment',
      '6. Delivery and Pickup',
      '7. Account Deletion',
      '8. Changes to These Terms',
      '9. Contact',
    ],
  );
});

test('terms state the required family, health, privacy, pricing, and delivery rules', () => {
  const content = TERMS_SECTIONS.map(({ text }) => text).join(' ').toLowerCase();
  assert.match(content, /one meal recipient is allowed per account/);
  assert.match(content, /the only person who logs in/);
  assert.match(content, /dietitian reviews each order before payment/);
  assert.match(content, /data privacy act of 2012 \(ra 10173\)/);
  assert.match(content, /₱300 per meal/);
  assert.match(content, /three meals per day/);
  assert.match(content, /valid delivery address and schedule/);
  assert.match(content, /new version is published/);
});

test('terms contact details match the help contact block', () => {
  const contactSection = TERMS_SECTIONS.find(({ number }) => number === 9);
  assert.ok(contactSection);
  assert.ok(contactSection.text.includes(contactInfo.phone));
  assert.ok(contactSection.text.includes(contactInfo.email));
  assert.ok(contactSection.text.includes(contactInfo.hours));
});

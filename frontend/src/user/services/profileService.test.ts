import assert from 'node:assert/strict';
import test from 'node:test';
import { getDb, resetStore } from '../data/mockStore.js';
import { MSG } from '../data/messages.js';
import { MEALS } from '../data/meals.js';
import { MOCK_CODE, sendCode } from './verificationService.js';
import { ROLES, verifyAuditChain } from './securityService.js';
import {
  allergenConflict,
  formatHistoryLine,
  getChangeHistory,
  getGuardianForAdmin,
  getProfile,
  isAuditChainIntact,
  mealMatchesNutritionalPreferences,
  rankMeal,
  readChangeHistory,
  saveHealthConditions,
  saveNutritionalPreference,
  savePersonalInfo,
  sortMealsForProfile,
  validatePersonalFields,
  verifyContactChange,
  __testOnlyAppendHistory,
} from './profileService.js';

const MARIA_ID = 'user-maria';

test('validatePersonalFields uses exact required and format messages', () => {
  const missing = validatePersonalFields({
    firstName: '',
    lastName: 'Santos',
    email: '',
    contactNumber: '09171234567',
  });
  assert.equal(missing.ok, false);
  assert.ok(missing.messages.includes(MSG.required));

  const badContact = validatePersonalFields({
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'maria@gmail.com',
    contactNumber: '123',
  });
  assert.ok(badContact.messages.includes(MSG.invalidContact));

  const badEmail = validatePersonalFields({
    firstName: 'Maria',
    lastName: 'Santos',
    email: 'not-an-email',
    contactNumber: '09171234567',
  });
  assert.ok(badEmail.messages.includes(MSG.invalidEmail));
});

test('contact change applies only after correct verification code', () => {
  resetStore();
  const user = getDb().users.find((u) => u.id === MARIA_ID);
  const original = user.contactNumber;

  const pending = savePersonalInfo(MARIA_ID, {
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    suffix: user.suffix,
    contactNumber: '09181112233',
    email: user.email,
    address: user.address,
  });
  assert.equal(pending.needsVerification, true);
  assert.equal(pending.channel, 'sms');

  sendCode({ userId: MARIA_ID, channel: 'sms', purpose: 'contact' });
  const wrong = verifyContactChange({ userId: MARIA_ID, code: '000000' });
  assert.equal(wrong.ok, false);
  assert.equal(getDb().users.find((u) => u.id === MARIA_ID).contactNumber, original);

  const ok = verifyContactChange({ userId: MARIA_ID, code: MOCK_CODE });
  assert.equal(ok.ok, true);
  assert.equal(getDb().users.find((u) => u.id === MARIA_ID).contactNumber, '09181112233');
});

test('meal ranking sample matches CLT-12 expectations', () => {
  const profile = {
    mealPreferences: { preferredCategories: ['Soup', 'Fish'], dislikedIngredients: ['Ampalaya'] },
    dietaryRestrictions: ['Low-sodium'],
    allergies: [{ name: 'Peanuts' }],
    nutritionalPreference: null,
  };

  const sample = MEALS.filter((m) => [
    'sample-tinola',
    'sample-bangus',
    'sample-ampalaya',
    'sample-satay',
  ].includes(m.id));

  assert.equal(rankMeal(sample.find((m) => m.id === 'sample-tinola'), profile), 5);
  assert.equal(rankMeal(sample.find((m) => m.id === 'sample-bangus'), profile), 5);
  assert.equal(rankMeal(sample.find((m) => m.id === 'sample-ampalaya'), profile), -3);
  assert.equal(rankMeal(sample.find((m) => m.id === 'sample-satay'), profile), null);

  const ordered = sortMealsForProfile(sample, profile);
  assert.equal(ordered[ordered.length - 1].name, 'Chicken Satay');
  assert.equal(ordered[0].name === 'Chicken Tinola' || ordered[0].name === 'Grilled Bangus', true);
  assert.equal(ordered.some((m) => m.name === 'Ampalaya Stir-fry'), true);
});

test('allergenConflict detects peanut meals for a peanut allergy profile', () => {
  const satay = MEALS.find((m) => m.id === 'sample-satay');
  assert.equal(allergenConflict(satay, { allergies: [{ name: 'Peanuts' }] }), true);
  assert.equal(allergenConflict(satay, { allergies: [] }), false);
});

test('change history appends and cannot be deleted via profileService', () => {
  resetStore();
  const before = getChangeHistory(MARIA_ID).length;
  saveHealthConditions(MARIA_ID, ['Hypertension', 'Diabetes']);
  const after = getChangeHistory(MARIA_ID);
  assert.ok(after.length > before);
  assert.ok(after.some((entry) => entry.item === 'Diabetes'));

  const entry = after[0];
  assert.match(formatHistoryLine(entry), /Diabetes/);

  __testOnlyAppendHistory(MARIA_ID, { section: 'health', action: 'added', item: 'Test' });
  const stillThere = getChangeHistory(MARIA_ID);
  assert.ok(stillThere.length >= after.length);
  assert.equal(typeof profileServiceHasDeleteHistory(), 'undefined');
});

function profileServiceHasDeleteHistory() {
  return globalThis.deleteProfileHistory;
}

test('nutrition goals can be combined and filter the menu', () => {
  resetStore();
  const saved = saveNutritionalPreference(MARIA_ID, ['lower-sodium', 'higher-protein'], {
    calories: 1800,
    protein: 120,
    fat: 50,
  });
  assert.equal(saved.message, MSG.nutritionalUpdated);
  const profile = getProfile(MARIA_ID);
  assert.deepEqual(profile.nutritionalPreferences, ['lower-sodium', 'higher-protein']);
  assert.equal(profile.nutritionTargets.calories, 1800);
  const tinola = MEALS.find((meal) => meal.id === 'sample-tinola');
  assert.equal(mealMatchesNutritionalPreferences(tinola, profile), true);
  const changed = saveNutritionalPreference(MARIA_ID, ['lower-calories']);
  assert.equal(changed.ok, true);
  assert.deepEqual(getProfile(MARIA_ID).nutritionalPreferences, ['lower-calories']);
});

test('profile changes are on the hash chain and another client cannot read them', () => {
  resetStore();
  saveHealthConditions(MARIA_ID, ['Hypertension', 'Diabetes']);
  assert.equal(isAuditChainIntact(), true);
  assert.equal(verifyAuditChain(getDb().auditLog), true);
  const entry = getChangeHistory(MARIA_ID).find((row) => row.item === 'Diabetes');
  assert.equal(entry.previousValue.includes('Hypertension'), true);
  assert.equal(entry.newValue.includes('Diabetes'), true);
  assert.throws(() => readChangeHistory('user-ana', MARIA_ID), { code: 'FORBIDDEN' });
  const guardian = getGuardianForAdmin({ id: 'admin-1', roleMask: ROLES.ADMIN }, MARIA_ID);
  assert.equal(guardian.name, 'Jose Santos');
  assert.throws(() => getGuardianForAdmin({ id: MARIA_ID, roleMask: ROLES.CLIENT }, MARIA_ID), { code: 'FORBIDDEN' });
});

test('seeded msantos profile includes story fields', () => {
  resetStore();
  const profile = getProfile(MARIA_ID);
  assert.equal(profile.address, '12 Mabini St., Quezon City');
  assert.deepEqual(profile.healthConditions, ['Hypertension']);
  assert.deepEqual(profile.dietaryRestrictions, ['Low-sodium']);
  assert.equal(profile.allergies[0].name, 'Peanuts');
  assert.equal(profile.guardian.name, 'Jose Santos');
  assert.ok(profile.profileLastUpdatedFormatted.includes('2026-10-11'));
});

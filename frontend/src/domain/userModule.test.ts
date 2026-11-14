import assert from 'node:assert/strict';
import test from 'node:test';
import { getDb, resetStore } from '../data/mockStore.js';
import { MSG } from '../data/messages.js';
import { mealsForLabel } from './audience.js';
import { deleteAccount, termsUpdateRequired } from '../services/authService.js';
import { submitFeedback } from '../services/feedbackService.js';
import { ORDER_MSG, getRecommendedMeals, validateOrderSelection } from '../services/orderService.js';
import { saveMealRecipient } from '../services/profileService.js';
import { MEALS } from '../data/meals.js';
import type { User } from '../types';

test('audience labels name the meal recipient for a family account', () => {
  assert.equal(mealsForLabel('self', 'Lia Dizon'), 'Meals for you');
  assert.equal(mealsForLabel('family', 'Lia Dizon'), 'Meals for Lia Dizon');
});

test('order selection allows one meal per meal time and three meals a day', () => {
  const breakfast = MEALS.find((meal) => meal.category === 'Breakfast');
  const lunch = MEALS.find((meal) => meal.category === 'Lunch');
  const dinner = MEALS.find((meal) => meal.category === 'Dinner');
  assert.equal(validateOrderSelection([
    { meal: breakfast!, quantity: 1 },
    { meal: lunch!, quantity: 1 },
    { meal: dinner!, quantity: 1 },
  ]).ok, true);
  assert.equal(validateOrderSelection([
    { meal: breakfast!, quantity: 1 },
    { meal: { ...breakfast!, id: 'breakfast-2' }, quantity: 1 },
  ]).message, ORDER_MSG.oneMealPerTime);
  assert.equal(validateOrderSelection([
    { meal: breakfast!, quantity: 2 },
  ]).message, ORDER_MSG.oneMealPerTime);
});

test('recommendations use recorded health conditions', () => {
  const onlyHealth = getRecommendedMeals(MEALS, {
    healthConditions: ['Hypertension'],
    dietaryRestrictions: [],
    allergies: [],
  }, 5);
  assert.equal(onlyHealth.emptyProfile, false);
  assert.equal(onlyHealth.items.some((row) => (row.meal.sodium || 0) > 500 && !(row.meal.dietaryTags || []).includes('Low-sodium')), false);
});

test('edit meal recipient does not change the account holder', () => {
  resetStore();
  const user = getDb().users.find((item) => item.username === 'msantos') as User;
  user.accountFor = 'family';
  user.mealRecipient = {
    id: 'recipient-lia',
    firstName: 'Lia',
    lastName: 'Dizon',
    relationship: 'Child',
    contactNumber: '09170000000',
    deliveryAddress: '8 Sampaguita St.',
    healthConditions: [],
    dietaryRestrictions: [],
    allergies: [],
    mealPreferences: { preferredCategories: [], dislikedIngredients: [] },
    nutritionalPreference: null,
    nutritionalPreferences: [],
    nutritionTargets: {},
  };
  const result = saveMealRecipient(user.id, {
    firstName: 'Lia',
    lastName: 'Dizon',
    relationship: 'Child',
    contactNumber: '09170000000',
    deliveryAddress: '15 Orchid St., Quezon City',
  });
  assert.equal(result.ok, true);
  assert.equal(result.message, MSG.recipientUpdated);
  assert.equal(user.firstName, 'Maria');
  assert.equal(user.mealRecipient?.deliveryAddress, '15 Orchid St., Quezon City');
  assert.equal(saveMealRecipient(user.id, {
    firstName: 'Lia',
    lastName: 'Dizon',
    relationship: 'Child',
    contactNumber: '0917ABC4567',
    deliveryAddress: '15 Orchid St.',
  }).messages?.[0], MSG.invalidContact);
  assert.equal(saveMealRecipient(user.id, {
    firstName: '',
    lastName: 'Dizon',
    relationship: 'Child',
    contactNumber: '09170000000',
    deliveryAddress: '15 Orchid St.',
  }).messages?.[0], MSG.required);
});

test('delete account keeps the account for a wrong password and removes it after the right one', async () => {
  resetStore();
  const user = getDb().users.find((item) => item.username === 'msantos')!;
  const wrong = await deleteAccount({ userId: user.id, password: 'Meal@2025' });
  assert.equal(wrong.ok, false);
  assert.equal(wrong.message, MSG.deleteWrongPassword);
  assert.ok(getDb().users.some((item) => item.username === 'msantos'));

  const removed = await deleteAccount({ userId: user.id, password: 'Meal@2026' });
  assert.equal(removed.ok, true);
  assert.equal(removed.message, MSG.accountDeleted);
  assert.equal(getDb().users.some((item) => item.username === 'msantos'), false);
});

test('delete account is blocked while an order is in progress', async () => {
  resetStore();
  const user = getDb().users.find((item) => item.username === 'msantos')!;
  const db = getDb() as { orders?: { userId: string; status: string }[] };
  db.orders = [{ userId: user.id, status: 'Out for Delivery' }];
  const blocked = await deleteAccount({ userId: user.id, password: 'Meal@2026' });
  assert.equal(blocked.message, MSG.orderInProgress);
  assert.ok(getDb().users.some((item) => item.id === user.id));
});

test('feedback rejects an empty comment and saves a signed-in comment', () => {
  resetStore();
  const user = getDb().users.find((item) => item.username === 'msantos')!;
  assert.equal(submitFeedback(user.id, '   ').message, MSG.enterComment);
  const saved = submitFeedback(user.id, 'More vegetable sides, please.');
  assert.equal(saved.ok, true);
  assert.equal(saved.message, MSG.commentSubmitted);
});

test('a newer terms version is required before Home', () => {
  assert.equal(termsUpdateRequired({
    profileComplete: true,
    termsAcceptedAt: '2026-11-12T01:00:00.000Z',
    termsAcceptedVersion: '1.0',
  }), false);
  assert.equal(termsUpdateRequired({
    profileComplete: true,
    termsAcceptedAt: '2026-11-12T01:00:00.000Z',
    termsAcceptedVersion: '0.9',
  }), true);
});

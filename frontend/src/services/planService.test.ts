import assert from 'node:assert/strict';
import test from 'node:test';
import { getDb, resetStore } from '../data/mockStore.js';
import { MSG } from '../data/messages.js';
import { registerAccount } from '../domain/registration.js';
import {
  PLAN_CATALOG,
  PLAN_MSG,
  __setPlanTestNow,
  beginChoosePlan,
  canChoosePlan,
  confirmCancelPlan,
  confirmChoosePlan,
  discountFor,
  formatPlanPrice,
  getPlanDefinition,
  listPlanPeriods,
} from './planService.js';

const MARIA_ID = 'user-maria';
const FIXED_START = '2026-10-24T00:00:00.000Z';

test('period switch exposes catalog prices from planService', () => {
  const weekly = getPlanDefinition('weekly');
  const monthly = getPlanDefinition('monthly');
  assert.equal(weekly.priceLabel, formatPlanPrice(PLAN_CATALOG.weekly.price, 'week'));
  assert.equal(monthly.priceLabel, formatPlanPrice(PLAN_CATALOG.monthly.price, 'month'));

  const original = PLAN_CATALOG.weekly.price;
  PLAN_CATALOG.weekly.price = 3500;
  assert.equal(getPlanDefinition('weekly').priceLabel, formatPlanPrice(3500, 'week'));
  PLAN_CATALOG.weekly.price = original;

  assert.equal(listPlanPeriods().length, 3);
});

test('visitor cannot activate a plan', () => {
  const gate = canChoosePlan({ role: 'visitor' });
  assert.equal(gate.ok, false);
  assert.equal(gate.message, PLAN_MSG.loginRequired);

  const attempt = beginChoosePlan('missing-user', 'weekly');
  assert.equal(attempt.ok, false);
});

test('unverified account is blocked from choosing a plan', () => {
  resetStore();
  registerAccount({
    firstName: 'Una',
    middleName: '',
    lastName: 'Verified',
    suffix: '',
    contactNumber: '09181230001',
    email: 'una@test.com',
    username: 'una',
    password: 'Meal@2026',
    acceptedTerms: true,
  }, getDb(), { id: 'user-una', now: FIXED_START });

  const user = getDb().users.find((u) => u.id === 'user-una');
  const gate = canChoosePlan(user);
  assert.equal(gate.ok, false);
  assert.equal(gate.message, MSG.verifyFirst);

  const begin = beginChoosePlan('user-una', 'weekly');
  assert.equal(begin.ok, false);
  assert.equal(begin.message, MSG.verifyFirst);
});

test('confirm sets active status and start and renewal dates', () => {
  resetStore();
  __setPlanTestNow(FIXED_START);
  const result = confirmChoosePlan(MARIA_ID, 'monthly');
  assert.equal(result.ok, true);
  assert.equal(result.message, 'Your Monthly plan is active.');
  assert.equal(result.startDate, '2026-10-24');
  assert.equal(result.renewalDate, '2026-11-24');

  const user = getDb().users.find((u) => u.id === MARIA_ID);
  assert.equal(user.plan.status, 'active');
  assert.equal(user.plan.discountRate, 0.15);
  __setPlanTestNow(null);
});

test('cancel keeps plan access until renewal date', () => {
  resetStore();
  __setPlanTestNow(FIXED_START);
  confirmChoosePlan(MARIA_ID, 'monthly');
  const prompt = confirmCancelPlan(MARIA_ID);
  assert.equal(prompt.ok, true);
  assert.match(prompt.message, /2026-11-24/);

  const user = getDb().users.find((u) => u.id === MARIA_ID);
  assert.equal(user.plan.status, 'cancelled');
  assert.ok(user.plan.renewalDate);
  __setPlanTestNow(null);
});

test('discountFor applies plan caps on 480 subtotal', () => {
  const weeklyPlan = { status: 'active', periodId: 'weekly', discountRate: 0.05 };
  const weekly = discountFor(480, weeklyPlan);
  assert.equal(weekly.discount, 24);
  assert.equal(weekly.total, 456);

  const monthlyPlan = { status: 'active', periodId: 'monthly', discountRate: 0.15 };
  const monthly = discountFor(480, monthlyPlan);
  assert.equal(monthly.discount, 72);
  assert.equal(monthly.total, 408);

  const yearlyPlan = { status: 'active', periodId: 'yearly', discountRate: 0.75 };
  const yearly = discountFor(480, yearlyPlan);
  assert.equal(yearly.discount, 360);
  assert.equal(yearly.total, 120);

  const none = discountFor(480, null);
  assert.equal(none.discount, null);
  assert.equal(none.total, 480);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { SUBSCRIPTION_COPY, subscriptionSection } from './subscriptionStatus.js';

test('USR subscription: an active plan shows the status, plan, and renewal, with no offer', () => {
  const view = subscriptionSection({
    status: 'active',
    planName: 'Weekly plan',
    renewalDate: '2026-12-22',
    recipientName: 'Maria',
  });
  assert.equal(view.kind, 'subscribed');
  if (view.kind !== 'subscribed') return;
  assert.equal(view.heading, 'Subscription: Subscribed');
  assert.equal(view.planName, 'Weekly plan');
  assert.equal(view.renews, 'renews 2026-12-22');
  assert.equal(view.covers, '');
});

test('USR subscription: a family account without a plan names the meal recipient in the offer', () => {
  const view = subscriptionSection({
    status: 'cancelled',
    recipientName: 'Lia',
    family: true,
  });
  assert.equal(view.kind, 'offer');
  if (view.kind !== 'offer') return;
  assert.equal(view.heading, 'Not subscribed');
  assert.equal(view.covers, 'Meals for Lia');
  assert.equal(
    view.body,
    "You are not subscribed yet. Subscribe to get meals that fit Lia's allergies and health needs.",
  );
  assert.equal(view.action, 'Subscribe');
});

test('USR subscription: a failed load keeps the quoted retry and hides the offer', () => {
  const view = subscriptionSection({ loadError: true, status: 'active', recipientName: 'Maria' });
  assert.deepEqual(view, {
    kind: 'error',
    message: SUBSCRIPTION_COPY.loadError,
    tryAgain: 'Try again',
  });
});

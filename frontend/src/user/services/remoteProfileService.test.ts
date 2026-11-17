import assert from 'node:assert/strict';
import test from 'node:test';
import { planHealthChange, removalRequestedMessage } from './remoteProfileService.js';

test('removing a health condition becomes a Dietitian request; adding saves directly (DIT-17)', () => {
  const plan = planHealthChange(['Diabetes', 'HTN'], ['htn', 'Gout']);
  assert.deepEqual(plan.add, ['Gout']);
  assert.deepEqual(plan.remove, ['Diabetes']);
  assert.match(removalRequestedMessage(plan.remove), /Diabetes needs Dietitian approval/);
  assert.deepEqual(planHealthChange(['HTN'], ['HTN']), { add: [], remove: [] });
});

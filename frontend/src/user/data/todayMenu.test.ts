import assert from 'node:assert/strict';
import test from 'node:test';
import { openDaySlots, slotIsOpen, slotWindowLabel } from './todayMenu.js';

test('breakfast is open before 9:00 and closed after', () => {
  const morning = new Date('2026-11-23T08:30:00');
  const after = new Date('2026-11-23T09:00:00');
  assert.equal(slotIsOpen('Breakfast', morning), true);
  assert.equal(slotIsOpen('Breakfast', after), false);
  assert.equal(slotIsOpen('Lunch', after), true);
  assert.deepEqual(openDaySlots(after), ['Lunch', 'Dinner']);
});

test('Sunday has no open meal times', () => {
  assert.deepEqual(openDaySlots(new Date('2026-11-22T10:00:00')), []);
});

test('slot labels name the cutoff the way the meal screen shows it', () => {
  assert.equal(slotWindowLabel('Breakfast'), 'Ends at 9:00 AM');
  assert.equal(slotWindowLabel('Lunch'), 'Order until 1:00 PM');
  assert.equal(slotWindowLabel('Dinner'), 'Order until 5:00 PM');
});

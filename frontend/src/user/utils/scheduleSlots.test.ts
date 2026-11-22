import assert from 'node:assert/strict';
import test from 'node:test';
import {
  closedTodayNotes,
  dateIsBookable,
  timeIsBookable,
  upcomingScheduleDates,
} from './scheduleSlots.js';

const mondayLate = new Date('2026-11-23T11:30:00');
const mondayMorning = new Date('2026-11-23T08:00:00');

function day(isoDay: string, hour: number) {
  const [year, month, date] = isoDay.split('-').map(Number);
  return new Date(year, month - 1, date, hour, 0, 0, 0);
}

test('upcoming dates skip Sunday', () => {
  const dates = upcomingScheduleDates(6);
  assert.equal(dates.some((date) => date.getDay() === 0), false);
});

test('a meal time that has ended today cannot be selected', () => {
  const today = day('2026-11-23', 0);
  assert.equal(dateIsBookable(today, ['Breakfast'], mondayLate), false);
  assert.equal(timeIsBookable(today, day('2026-11-23', 8), ['Breakfast'], mondayLate), false);
  const notes = closedTodayNotes(['Breakfast'], mondayLate);
  assert.equal(notes.length, 1);
  assert.match(notes[0], /Breakfast for today ended at 9:00 AM/);
});

test('today stays closed for breakfast even before the cutoff when the 24 hour lead has not passed', () => {
  const today = day('2026-11-23', 0);
  assert.equal(dateIsBookable(today, ['Breakfast'], mondayMorning), false);
  assert.equal(timeIsBookable(today, day('2026-11-23', 8), ['Breakfast'], mondayMorning), false);
  assert.equal(closedTodayNotes(['Breakfast'], mondayMorning).length, 0);
});

test('a later kitchen day in the meal window can be selected', () => {
  const wednesday = day('2026-11-25', 0);
  const breakfast = day('2026-11-25', 8);
  assert.equal(dateIsBookable(wednesday, ['Breakfast'], mondayLate), true);
  assert.equal(timeIsBookable(wednesday, breakfast, ['Breakfast'], mondayLate), true);
  assert.equal(timeIsBookable(wednesday, day('2026-11-25', 12), ['Breakfast'], mondayLate), false);
});

test('lunch and dinner use their own windows for delivery and pickup', () => {
  const wednesday = day('2026-11-25', 0);
  assert.equal(timeIsBookable(wednesday, day('2026-11-25', 12), ['Lunch'], mondayLate), true);
  assert.equal(timeIsBookable(wednesday, day('2026-11-25', 8), ['Lunch'], mondayLate), false);
  assert.equal(timeIsBookable(wednesday, day('2026-11-25', 15), ['Dinner'], mondayLate), true);
  assert.equal(dateIsBookable(day('2026-11-22', 0), ['Dinner'], mondayLate), false);
});

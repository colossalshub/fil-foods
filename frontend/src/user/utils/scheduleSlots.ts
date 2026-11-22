/** Upcoming schedule options for checkout pill pickers (Mon–Sat kitchen hours). */

import type { DaySlot } from '../data/todayMenu.js';
import { combineSchedule } from '../components/scheduleValue.js';
import { validateSchedule } from '../services/orderService.js';

const KITCHEN_OPEN_HOUR = 7;
const KITCHEN_CLOSE_HOUR = 18;

/** Windows from the pickup and delivery screens. The end hour is the order cutoff. */
export const MEAL_WINDOWS: Record<DaySlot, {
  startHour: number;
  endHour: number;
  cutoffLabel: string;
  windowLabel: string;
}> = {
  Breakfast: { startHour: 7, endHour: 9, cutoffLabel: '9:00 AM', windowLabel: '7:00–9:00 AM' },
  Lunch: { startHour: 10, endHour: 13, cutoffLabel: '1:00 PM', windowLabel: '10:00 AM–1:00 PM' },
  Dinner: { startHour: 14, endHour: 17, cutoffLabel: '5:00 PM', windowLabel: '2:00–5:00 PM' },
};

function isKitchenDay(date: Date) {
  const day = date.getDay();
  return day >= 1 && day <= 6;
}

export function upcomingScheduleDates(max = 6): Date[] {
  const dates: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  let guard = 0;
  while (dates.length < max && guard < 30) {
    guard += 1;
    if (isKitchenDay(cursor)) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function scheduleDatePillLabel(date: Date) {
  return new Intl.DateTimeFormat('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export type ScheduleTimeSlot = {
  key: string;
  label: string;
  time: Date;
};

export function kitchenTimeSlots(): ScheduleTimeSlot[] {
  const base = new Date();
  base.setMinutes(0, 0, 0);
  const slots: ScheduleTimeSlot[] = [];
  for (let hour = KITCHEN_OPEN_HOUR; hour < KITCHEN_CLOSE_HOUR; hour += 1) {
    const start = new Date(base);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(hour + 1, 0, 0, 0);
    const startLabel = new Intl.DateTimeFormat('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(start);
    const endLabel = new Intl.DateTimeFormat('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(end);
    slots.push({
      key: `${hour}`,
      label: `${startLabel}–${endLabel}`,
      time: start,
    });
  }
  return slots;
}

export function sameCalendarDay(a: Date | null | undefined, b: Date | null | undefined) {
  if (!(a instanceof Date) || !(b instanceof Date)) return false;
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function sameClockHour(a: Date | null | undefined, b: Date | null | undefined) {
  if (!(a instanceof Date) || !(b instanceof Date)) return false;
  return a.getHours() === b.getHours() && a.getMinutes() === b.getMinutes();
}

function hourRange(startHour: number, endHour: number) {
  const hours: number[] = [];
  for (let hour = startHour; hour < endHour; hour += 1) hours.push(hour);
  return hours;
}

/** Time chips for the meal times on this order. With none chosen, kitchen hours stay available. */
export function scheduleTimeSlots(mealSlots: DaySlot[] = []): ScheduleTimeSlot[] {
  const hours = mealSlots.length
    ? [...new Set(mealSlots.flatMap((slot) => hourRange(MEAL_WINDOWS[slot].startHour, MEAL_WINDOWS[slot].endHour)))]
    : hourRange(KITCHEN_OPEN_HOUR, KITCHEN_CLOSE_HOUR);
  hours.sort((a, b) => a - b);
  return hours.map((hour) => {
    const match = kitchenTimeSlots().find((slot) => slot.time.getHours() === hour);
    return match || kitchenTimeSlots()[0];
  });
}

function slotsCoveringHour(hour: number, mealSlots: DaySlot[]) {
  if (!mealSlots.length) return mealSlots;
  return mealSlots.filter((slot) => {
    const window = MEAL_WINDOWS[slot];
    return hour >= window.startHour && hour < window.endHour;
  });
}

/** Same-day meal times close at their cutoff. Later kitchen days stay open until the order rules say otherwise. */
export function mealCutoffPassed(date: Date, slot: DaySlot, now: Date) {
  if (!sameCalendarDay(date, now)) return false;
  const cutoff = new Date(now);
  cutoff.setHours(MEAL_WINDOWS[slot].endHour, 0, 0, 0);
  return now.getTime() >= cutoff.getTime();
}

/**
 * A time can be chosen only when it sits in the meal window, that window is still open,
 * and the shared order check accepts it. That check is the same one the database and the
 * offline store use: not in the past, at least 24 hours ahead, Monday to Saturday, 7:00 AM to 6:00 PM.
 */
export function timeIsBookable(date: Date, time: Date, mealSlots: DaySlot[], now = new Date()) {
  const hour = time.getHours();
  const covered = slotsCoveringHour(hour, mealSlots);
  if (mealSlots.length && !covered.length) return false;
  if (covered.some((slot) => mealCutoffPassed(date, slot, now))) return false;
  const scheduled = combineSchedule(date, time);
  return validateSchedule(scheduled, now).ok === true;
}

/** A date the user cannot order is not clickable. */
export function dateIsBookable(date: Date, mealSlots: DaySlot[], now = new Date()) {
  return scheduleTimeSlots(mealSlots).some((slot) => timeIsBookable(date, slot.time, mealSlots, now));
}

export function clockLabel(date: Date) {
  return new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' }).format(date);
}

export function closedTodayNotes(mealSlots: DaySlot[], now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (!isKitchenDay(today)) return [];
  return mealSlots.filter((slot) => mealCutoffPassed(today, slot, now)).map((slot) => {
    const window = MEAL_WINDOWS[slot];
    return `It's already ${clockLabel(now)}. ${slot} for today ended at ${window.cutoffLabel}. Choose another date to order ${slot.toLowerCase()}.`;
  });
}

export function timeHeading(mealSlots: DaySlot[]) {
  if (mealSlots.length === 1) {
    const slot = mealSlots[0];
    return `Time (${slot} · ${MEAL_WINDOWS[slot].windowLabel})`;
  }
  if (mealSlots.length > 1) {
    return mealSlots.map((slot) => `${slot} ${MEAL_WINDOWS[slot].windowLabel}`).join(' · ');
  }
  return 'Time (Monday to Saturday, 7:00 AM to 6:00 PM)';
}
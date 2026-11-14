/** Upcoming schedule options for checkout pill pickers (Mon–Sat kitchen hours). */

const KITCHEN_OPEN_HOUR = 7;
const KITCHEN_CLOSE_HOUR = 18;

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
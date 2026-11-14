export function combineSchedule(date: Date | null | undefined, time: Date | null | undefined) {
  if (!(date instanceof Date) || !(time instanceof Date)) return '';
  if (Number.isNaN(date.getTime()) || Number.isNaN(time.getTime())) return '';
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.getHours(),
    time.getMinutes(),
    0,
    0,
  );
}

export function formatScheduleDate(date: Date) {
  return new Intl.DateTimeFormat('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatScheduleTime(date: Date) {
  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatScheduleSummary(date: Date | null | undefined, time: Date | null | undefined) {
  if (!(date instanceof Date) || !(time instanceof Date)) return '';
  if (Number.isNaN(date.getTime()) || Number.isNaN(time.getTime())) return '';
  const day = formatScheduleDate(date);
  const start = formatScheduleTime(time);
  const endDate = new Date(time);
  endDate.setHours(endDate.getHours() + 1);
  const end = formatScheduleTime(endDate);
  return `${day} · ${start}–${end}`;
}

export function pickerValue(selected: Date | null | undefined) {
  if (selected instanceof Date && !Number.isNaN(selected.getTime())) return selected;
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(10, 0, 0, 0);
  return next;
}

export function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function dateFromIsoDay(value: string | null | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const scheduled = new Date(year, month - 1, day);
  if (scheduled.getFullYear() !== year || scheduled.getMonth() !== month - 1 || scheduled.getDate() !== day) {
    return null;
  }
  return scheduled;
}

export function timeFromClock(value: string | null | undefined) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value ?? ''));
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  const scheduled = new Date();
  scheduled.setHours(hour, minute, 0, 0);
  return scheduled;
}

export function toIsoDay(date: Date | null | undefined) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function toClock(date: Date | null | undefined) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 22 Nov 2026 customer module: estimated waiting time.
// The PDF numbers this USR-51. This app already uses USR-51 for special requests.
// The PDF does not give the arithmetic. These bases match its samples when nobody
// is ahead (approval 30, preparing 25, out for delivery 15). Ready for Pickup has
// no sample, so it uses 20. Each order already in the same process adds 10 minutes.

import { ORDERS_COPY } from '../data/messages.js';

export const WAITING_COPY = {
  label: ORDERS_COPY.estimatedWait,
  unavailable: ORDERS_COPY.estimatedWaitUnavailable,
  longer: ORDERS_COPY.estimatedWaitLonger,
};

export const PROCESS_MINUTES: Record<string, number> = {
  'For Dietitian Review': 30,
  Preparing: 25,
  'Ready for Pickup': 20,
  'Out for Delivery': 15,
};

export const MINUTES_PER_ORDER_AHEAD = 10;

const TERMINAL = new Set(['Completed', 'Cancelled']);

export type WaitOrder = {
  id: string;
  status: string;
  statusHistory?: { status?: string; at?: string }[];
  lastUpdatedAt?: string;
  placedAt?: string;
};

export type WaitingView = {
  visible: boolean;
  label: string;
  value: string;
};

export function facingStatus(status: string) {
  return status === 'Confirmed' ? 'Preparing' : status;
}

function processStartedAt(order: WaitOrder) {
  const key = facingStatus(order.status);
  const hits = (order.statusHistory || []).filter((row) => facingStatus(row.status || '') === key && row.at);
  if (hits.length) return hits[hits.length - 1].at || null;
  return order.lastUpdatedAt || order.placedAt || null;
}

/** Orders already in this process, entered earlier. Null when the queue is unknown. */
export function ordersAhead(order: WaitOrder, queue: WaitOrder[] | null) {
  const key = facingStatus(order.status);
  if (!PROCESS_MINUTES[key] || queue == null) return null;
  const started = processStartedAt(order);
  const startMs = started ? Date.parse(started) : NaN;
  if (Number.isNaN(startMs)) return null;
  return queue.filter((other) => {
    if (other.id === order.id) return false;
    if (facingStatus(other.status) !== key) return false;
    const otherStart = processStartedAt(other);
    const otherMs = otherStart ? Date.parse(otherStart) : NaN;
    return !Number.isNaN(otherMs) && otherMs < startMs;
  }).length;
}

export function formatWaitDuration(minutes: number) {
  if (minutes <= 60) return minutes === 1 ? '1 minute' : `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourLabel = hours === 1 ? '1 hour' : `${hours} hours`;
  if (rest === 0) return hourLabel;
  return `${hourLabel} ${rest === 1 ? '1 minute' : `${rest} minutes`}`;
}

export function waitingTimeFor(
  order: WaitOrder,
  queue: WaitOrder[] | null,
  nowIso: string,
): WaitingView | null {
  const status = facingStatus(order.status);
  if (TERMINAL.has(order.status) || TERMINAL.has(status)) return null;
  const base = PROCESS_MINUTES[status];
  const ahead = ordersAhead(order, queue);
  if (base == null || ahead == null) {
    return { visible: true, label: WAITING_COPY.label, value: WAITING_COPY.unavailable };
  }
  const minutes = base + ahead * MINUTES_PER_ORDER_AHEAD;
  const started = processStartedAt(order);
  const elapsed = started ? Date.parse(nowIso) - Date.parse(started) : NaN;
  if (!Number.isNaN(elapsed) && elapsed > minutes * 60_000) {
    return { visible: true, label: WAITING_COPY.label, value: WAITING_COPY.longer };
  }
  return {
    visible: true,
    label: WAITING_COPY.label,
    value: ORDERS_COPY.estimatedWaitAbout(formatWaitDuration(minutes)),
  };
}

/** Sentence appended to a status notification. Empty once the order is finished. */
export function waitingUpdateSentence(view: WaitingView | null) {
  if (!view?.visible) return '';
  if (view.value === WAITING_COPY.unavailable) return ` ${view.value}`;
  return ` ${view.label}: ${view.value}.`;
}

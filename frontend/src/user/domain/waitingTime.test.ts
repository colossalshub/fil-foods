import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MINUTES_PER_ORDER_AHEAD,
  PROCESS_MINUTES,
  WAITING_COPY,
  waitingTimeFor,
  waitingUpdateSentence,
  type WaitOrder,
} from './waitingTime.js';

function order(partial: Partial<WaitOrder> & { id: string; status: string }): WaitOrder {
  return { statusHistory: [], ...partial };
}

test('USR waiting time: samples match the 22 Nov customer module when nobody is ahead', () => {
  const preparing = order({
    id: 'ORD-2026-0002',
    status: 'Preparing',
    statusHistory: [{ status: 'Preparing', at: '2026-11-22T01:00:00.000Z' }],
  });
  const preparingView = waitingTimeFor(preparing, [preparing], '2026-11-22T01:10:00.000Z');
  assert.equal(preparingView?.label, 'Estimated waiting time');
  assert.equal(preparingView?.value, 'About 25 minutes');

  const delivery = order({
    id: 'ORD-2026-0002',
    status: 'Out for Delivery',
    statusHistory: [{ status: 'Out for Delivery', at: '2026-11-22T02:00:00.000Z' }],
  });
  assert.equal(
    waitingTimeFor(delivery, [delivery], '2026-11-22T02:05:00.000Z')?.value,
    'About 15 minutes',
  );

  const review = order({
    id: 'ORD-2026-0003',
    status: 'For Dietitian Review',
    statusHistory: [{ status: 'For Dietitian Review', at: '2026-11-22T03:00:00.000Z' }],
  });
  assert.equal(
    waitingTimeFor(review, [review], '2026-11-22T03:00:00.000Z')?.value,
    'About 30 minutes',
  );
  assert.equal(PROCESS_MINUTES.Preparing, 25);
  assert.equal(PROCESS_MINUTES['Out for Delivery'], 15);
  assert.equal(PROCESS_MINUTES['For Dietitian Review'], 30);
});

test('USR waiting time: orders already in the same process add ten minutes each', () => {
  const ahead = order({
    id: 'earlier',
    status: 'Preparing',
    statusHistory: [{ status: 'Preparing', at: '2026-11-22T01:00:00.000Z' }],
  });
  const current = order({
    id: 'later',
    status: 'Preparing',
    statusHistory: [{ status: 'Preparing', at: '2026-11-22T01:20:00.000Z' }],
  });
  const view = waitingTimeFor(current, [ahead, current], '2026-11-22T01:25:00.000Z');
  assert.equal(view?.value, `About ${25 + MINUTES_PER_ORDER_AHEAD} minutes`);
});

test('USR waiting time: past an hour the estimate is in hours and minutes', () => {
  const current = order({
    id: 'later',
    status: 'Preparing',
    statusHistory: [{ status: 'Preparing', at: '2026-11-22T01:00:00.000Z' }],
  });
  const queue = [current];
  for (let i = 0; i < 5; i += 1) {
    queue.push(order({
      id: `ahead-${i}`,
      status: 'Preparing',
      statusHistory: [{ status: 'Preparing', at: `2026-11-22T00:0${i}:00.000Z` }],
    }));
  }
  const view = waitingTimeFor(current, queue, '2026-11-22T01:05:00.000Z');
  assert.equal(view?.value, 'About 1 hour 15 minutes');
});

test('USR waiting time: a passed estimate says it is taking longer', () => {
  const preparing = order({
    id: 'late',
    status: 'Preparing',
    statusHistory: [{ status: 'Preparing', at: '2026-11-22T01:00:00.000Z' }],
  });
  const view = waitingTimeFor(preparing, [preparing], '2026-11-22T01:26:00.000Z');
  assert.equal(view?.value, WAITING_COPY.longer);
});

test('USR waiting time: finished orders hide it, and other statuses say it is not available', () => {
  const done = order({ id: 'done', status: 'Completed' });
  assert.equal(waitingTimeFor(done, [done], '2026-11-22T01:00:00.000Z'), null);
  assert.equal(waitingUpdateSentence(null), '');

  const payment = order({
    id: 'pay',
    status: 'Awaiting Payment',
    statusHistory: [{ status: 'Awaiting Payment', at: '2026-11-22T01:00:00.000Z' }],
  });
  const view = waitingTimeFor(payment, [payment], '2026-11-22T01:00:00.000Z');
  assert.equal(view?.value, WAITING_COPY.unavailable);
  assert.equal(waitingUpdateSentence(view), ` ${WAITING_COPY.unavailable}`);

  const unknownQueue = order({
    id: 'queue',
    status: 'Preparing',
    statusHistory: [{ status: 'Preparing', at: '2026-11-22T01:00:00.000Z' }],
  });
  assert.equal(
    waitingTimeFor(unknownQueue, null, '2026-11-22T01:00:00.000Z')?.value,
    WAITING_COPY.unavailable,
  );
});

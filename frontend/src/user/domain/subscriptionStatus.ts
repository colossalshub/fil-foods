// 22 Nov 2026 customer module: subscription status on Account (PDF USR-52).
// Plans, price, and payment are not defined in that story. This only describes
// the Account section. An active plan already stored on the account counts as subscribed.

import { ACCOUNT_COPY } from '../data/messages.js';

export const SUBSCRIPTION_COPY = {
  section: ACCOUNT_COPY.subscription,
  subscribed: ACCOUNT_COPY.subscribedLine,
  notSubscribed: ACCOUNT_COPY.notSubscribed,
  offer: ACCOUNT_COPY.subscribeOffer,
  subscribe: ACCOUNT_COPY.subscribe,
  renews: ACCOUNT_COPY.planRenews,
  covers: ACCOUNT_COPY.subscriptionCovers,
  loadError: ACCOUNT_COPY.subscriptionLoadError,
  tryAgain: ACCOUNT_COPY.tryAgain,
  changeOrCancel: ACCOUNT_COPY.changeOrCancel,
};

export type SubscriptionView =
  | { kind: 'error'; message: string; tryAgain: string }
  | {
    kind: 'subscribed';
    heading: string;
    planName: string;
    renews: string;
    covers: string;
    action: string;
  }
  | { kind: 'offer'; heading: string; body: string; action: string; covers: string };

export function subscriptionSection(input: {
  loadError?: boolean;
  status?: string | null;
  planName?: string | null;
  renewalDate?: string | null;
  recipientName?: string | null;
  family?: boolean;
}): SubscriptionView {
  if (input.loadError) {
    return {
      kind: 'error',
      message: SUBSCRIPTION_COPY.loadError,
      tryAgain: SUBSCRIPTION_COPY.tryAgain,
    };
  }
  const covers = input.family && input.recipientName
    ? SUBSCRIPTION_COPY.covers(input.recipientName)
    : '';
  if (input.status === 'active') {
    return {
      kind: 'subscribed',
      heading: SUBSCRIPTION_COPY.subscribed,
      planName: input.planName?.trim() || '',
      renews: input.renewalDate ? SUBSCRIPTION_COPY.renews(input.renewalDate) : '',
      covers,
      action: SUBSCRIPTION_COPY.changeOrCancel,
    };
  }
  return {
    kind: 'offer',
    heading: SUBSCRIPTION_COPY.notSubscribed,
    body: SUBSCRIPTION_COPY.offer(input.recipientName?.trim() || 'the meal recipient'),
    action: SUBSCRIPTION_COPY.subscribe,
    covers,
  };
}

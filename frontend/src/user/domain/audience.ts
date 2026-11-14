import type { AccountFor } from '../types';

export function recipientDisplayName(parts: {
  firstName?: string;
  lastName?: string;
} | null | undefined) {
  return [parts?.firstName, parts?.lastName].map((part) => String(part || '').trim()).filter(Boolean).join(' ');
}

export function mealsForLabel(accountFor: AccountFor | undefined, recipientName: string) {
  if (accountFor === 'family' && recipientName) return `Meals for ${recipientName}`;
  return 'Meals for you';
}

export function healthSectionTitle(accountFor: AccountFor | undefined, recipientName: string) {
  if (accountFor === 'family' && recipientName) return `Health conditions of ${recipientName}`;
  return 'Your health conditions';
}

export function dietSectionTitle(accountFor: AccountFor | undefined, recipientName: string) {
  if (accountFor === 'family' && recipientName) return `Dietary restrictions of ${recipientName}`;
  return 'Your dietary restrictions';
}

export function allergySectionTitle(accountFor: AccountFor | undefined, recipientName: string) {
  if (accountFor === 'family' && recipientName) return `Food allergies of ${recipientName}`;
  return 'Your food allergies';
}

export function orderPartyLines(input: {
  accountFor?: AccountFor;
  orderedByName?: string;
  mealRecipientName?: string;
  mealRecipientAddress?: string;
}) {
  if (input.accountFor === 'family') {
    return [
      { label: 'Ordered by', value: input.orderedByName || '' },
      {
        label: 'Meal recipient',
        value: [input.mealRecipientName, input.mealRecipientAddress].filter(Boolean).join(', '),
      },
    ];
  }
  const who = input.orderedByName || input.mealRecipientName || '';
  return [{ label: 'Ordered by and for', value: who }];
}

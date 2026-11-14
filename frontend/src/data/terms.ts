import { contactInfo } from './helpContent.js';

import { MSG } from './messages.js';

export const TERMS_VERSION = '1.0';
export const TERMS_LAST_UPDATED = '2026-11-12';

let forceLoadFailure = false;

export function __testSetTermsLoadFailure(value: boolean) {
  forceLoadFailure = value;
}

export function loadTerms() {
  if (forceLoadFailure) {
    return { ok: false as const, message: MSG.termsLoadFailed };
  }
  return {
    ok: true as const,
    sections: TERMS_SECTIONS,
    version: TERMS_VERSION,
    lastUpdated: TERMS_LAST_UPDATED,
  };
}

export const TERMS_SECTIONS = [
  {
    number: 1,
    title: 'Using F.I.L. Foods',
    text: 'F.I.L. Foods helps users browse meals, record dietary information, and place delivery or pickup orders. Use the service with accurate information. Meal suggestions are not medical advice and do not replace guidance from your doctor or dietitian.',
  },
  {
    number: 2,
    title: 'Registering For Myself or for a Family Member',
    text: 'Choose whether the subscription is for yourself or for one family member. If you register for a family member, you must be allowed to manage that person’s meals and health information. You are the only person who logs in to the account; the family member is the meal recipient. One meal recipient is allowed per account. Your account details remain separate from the recipient’s details.',
  },
  {
    number: 3,
    title: 'Health, Dietary and Allergy Information',
    text: 'Health conditions, dietary restrictions, and allergies are used only to recommend suitable meals and prepare orders safely. A Dietitian reviews each order before payment. Allergies are visible to the Admin, Dietitian, Kitchen Staff, and Delivery Staff when needed to prepare and deliver the order safely. F.I.L. Foods does not replace a doctor’s advice.',
  },
  {
    number: 4,
    title: 'Privacy and Data Protection',
    text: 'F.I.L. Foods collects account and contact details, the meal recipient’s health and dietary information, delivery details, and order information to provide and protect the meal service. Access is limited to people who need the information for their role. The delivery address is visible only to Delivery Staff and the Admin. Passwords are stored only in hashed form. Personal information is handled under the Data Privacy Act of 2012 (RA 10173).',
  },
  {
    number: 5,
    title: 'Meals, Orders and Payment',
    text: 'The standard meal price is ₱300 per meal. You may order no more than one meal per meal time and three meals per day. Each order goes to the Dietitian for review. Payment is requested only after approval, and only paid orders are prepared.',
  },
  {
    number: 6,
    title: 'Delivery and Pickup',
    text: 'Choose Delivery or Pickup when ordering. Delivery requires a valid delivery address and schedule. Pickup orders show the pickup details and schedule.',
  },
  {
    number: 7,
    title: 'Account Deletion',
    text: 'You can request account deletion from Account. An account cannot be deleted while an order is in progress. Deleting a Family Member account also deletes the meal recipient’s information. Past orders may remain available to the Admin with the customer shown as “Deleted user” and without contact, address, or health information.',
  },
  {
    number: 8,
    title: 'Changes to These Terms',
    text: 'These Terms and Conditions may change. When a new version is published, you will be asked to review and accept it before continuing to use F.I.L. Foods.',
  },
  {
    number: 9,
    title: 'Contact',
    text: `For help, contact F.I.L. Foods at ${contactInfo.phone}, ${contactInfo.email}, or ${contactInfo.hours}.`,
  },
] as const;

export const TERMS_TEXT = TERMS_SECTIONS
  .map(({ number, title, text }) => `${number}. ${title}\n${text}`)
  .join('\n\n');

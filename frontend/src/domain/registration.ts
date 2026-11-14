// CLT-01 registration rules. This module does not talk to React Native.
// The local stand-in uses bcrypt so its credential contract matches the backend.

import type { AppDatabase, FieldMap, PublicUser, RegistrationInput, User } from '../types';
import { MSG } from '../data/messages.js';
import { appendAuditEvent, hashPasswordSync, ROLES } from '../services/securityService.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function trim(value: unknown) {
  return String(value ?? '').trim();
}

export function isValidEmail(value: string) {
  return EMAIL.test(value);
}

export function isValidContact(value: string) {
  return /^\d{11}$/.test(value);
}

function sameEmail(a: unknown, b: unknown) {
  return trim(a).toLowerCase() === trim(b).toLowerCase();
}

function pushOnce(list: string[], message: string) {
  if (message && !list.includes(message)) list.push(message);
}

/**
 * Validate a registration form against existing accounts.
 * Email comparison ignores letter case. Username and contact number match exactly
 * after trimming. The password is not trimmed, because spaces can be intentional.
 */
export function validateRegistration(input: RegistrationInput, users: User[] = []) {
  const firstName = trim(input.firstName);
  const lastName = trim(input.lastName);
  const contactNumber = trim(input.contactNumber);
  const email = trim(input.email);
  const username = trim(input.username);
  const password = String(input.password ?? '');
  const accountFor = input.accountFor;
  const address = trim(input.address);
  const messages: string[] = [];
  const fields: FieldMap = {};

  const missing = !firstName || !lastName || !contactNumber || !email || !username || !password;
  if (missing) {
    pushOnce(messages, MSG.required);
    if (!firstName) fields.firstName = MSG.required;
    if (!lastName) fields.lastName = MSG.required;
    if (!contactNumber) fields.contactNumber = MSG.required;
    if (!email) fields.email = MSG.required;
    if (!username) fields.username = MSG.required;
    if (!password) fields.password = MSG.required;
  }

  if (contactNumber && !isValidContact(contactNumber)) {
    pushOnce(messages, MSG.invalidContact);
    fields.contactNumber = MSG.invalidContact;
  }

  if (email && !isValidEmail(email)) {
    pushOnce(messages, MSG.invalidEmail);
    fields.email = MSG.invalidEmail;
  }

  const usernameTaken = username && users.some((user) => user.username === username);
  const contactTaken = contactNumber && isValidContact(contactNumber)
    && users.some((user) => user.contactNumber === contactNumber);
  if (usernameTaken || contactTaken) {
    pushOnce(messages, MSG.duplicateUser);
    if (usernameTaken) fields.username = MSG.duplicateUser;
    if (contactTaken) fields.contactNumber = MSG.duplicateUser;
  }

  if (email && isValidEmail(email) && users.some((user) => user.email && sameEmail(user.email, email))) {
    pushOnce(messages, MSG.duplicateEmail);
    fields.email = MSG.duplicateEmail;
  }

  if (password && password.length < 8) {
    pushOnce(messages, MSG.shortPassword);
    fields.password = MSG.shortPassword;
  }

  if (accountFor === 'self' && !address) {
    pushOnce(messages, MSG.required);
    fields.address = MSG.required;
  }

  if (!input.acceptedTerms) {
    pushOnce(messages, MSG.termsRequired);
    fields.terms = MSG.termsRequired;
  }

  return { ok: messages.length === 0, messages, fields };
}

export function buildUnverifiedAccount(input: RegistrationInput, { id, now }: { id: string; now: string }): User {
  return {
    id,
    accountFor: input.accountFor || 'self',
    firstName: trim(input.firstName),
    middleName: trim(input.middleName),
    lastName: trim(input.lastName),
    suffix: trim(input.suffix),
    contactNumber: trim(input.contactNumber),
    address: trim(input.address),
    email: trim(input.email),
    username: trim(input.username),
    passwordHash: hashPasswordSync(input.password),
    passwordStorage: 'bcrypt',
    roleMask: ROLES.CLIENT,
    verified: false,
    profileComplete: false,
    inactive: false,
    locked: false,
    failedAttempts: 0,
    googleSub: null,
    termsAcceptedAt: now,
    authEvents: [],
    sessionVersion: 1,
    createdAt: now,
  };
}

export function toPublicUser(user: User | null | undefined): PublicUser | null {
  if (!user) return null;
  return {
    id: user.id,
    accountFor: user.accountFor || 'self',
    mealRecipient: user.mealRecipient ? {
      ...user.mealRecipient,
      healthConditions: [...user.mealRecipient.healthConditions],
      dietaryRestrictions: [...user.mealRecipient.dietaryRestrictions],
      allergies: user.mealRecipient.allergies.map((allergy) => ({ ...allergy })),
      mealPreferences: {
        preferredCategories: [...user.mealRecipient.mealPreferences.preferredCategories],
        dislikedIngredients: [...user.mealRecipient.mealPreferences.dislikedIngredients],
      },
      nutritionalPreferences: [...user.mealRecipient.nutritionalPreferences],
      nutritionTargets: { ...user.mealRecipient.nutritionTargets },
    } : undefined,
    firstName: user.firstName,
    middleName: user.middleName,
    lastName: user.lastName,
    suffix: user.suffix,
    contactNumber: user.contactNumber,
    email: user.email,
    username: user.username,
    verified: user.verified,
    profileComplete: user.profileComplete,
    termsAcceptedAt: user.termsAcceptedAt,
    address: user.address,
    plan: user.plan
      ? {
        status: user.plan.status,
        periodId: user.plan.periodId,
        periodLabel: user.plan.periodLabel,
        discountRate: user.plan.discountRate,
        name: user.plan.name,
        priceLabel: user.plan.priceLabel,
        renewalDate: user.plan.renewalDate,
        startDate: user.plan.startDate,
        pendingPeriodId: user.plan.pendingPeriodId,
      }
      : null,
    biometricUnlock: {
      enabled: Boolean(user.biometricUnlock?.enabled),
    },
  };
}

export function registerAccount(
  input: RegistrationInput,
  db: AppDatabase,
  { id, now }: { id: string; now: string },
) {
  const validation = validateRegistration(input, db.users);
  if (!validation.ok) return { ok: false, messages: validation.messages, fields: validation.fields };
  const user = buildUnverifiedAccount(input, { id, now });
  db.users.push(user);
  appendAuditEvent(db, {
    action: 'account.created',
    userId: user.id,
    targetId: user.id,
    metadata: { username: user.username },
    at: now,
  });
  return { ok: true, userId: user.id, user: toPublicUser(user) };
}

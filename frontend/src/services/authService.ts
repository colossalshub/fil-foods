// Temporary local stubs. Swap these bodies for real API calls once a backend is chosen.
// Screens only call these functions, so no screen code needs to change later.
import type { FieldMap, GoogleProfile, OnboardingInput, RegistrationInput, ServiceResult, User } from '../types';
import { getDb, nextId, stamp } from '../data/mockStore.js';
import { registerAccount, toPublicUser, trim, isValidContact, isValidEmail } from '../domain/registration.js';
import { MSG } from '../data/messages.js';
import { formatTimestamp } from '../utils/time.js';
import { verifyCode, sendCode } from './verificationService.js';
import { clearPersistedSession } from './sessionPersistence.js';
import { disableBiometricUnlock } from './biometricService.js';
import { appendAuditEvent, comparePassword, comparePasswordSync, hashPasswordSync } from './securityService.js';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
import { loginWithSupabase } from './supabaseAuthService.js';

const wait = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

const MAX_FAILED_ATTEMPTS = 5;
const MAX_LOGIN_ATTEMPTS_PER_MINUTE = 10;
const MINUTE_MS = 60 * 1000;

export function getUser(userId: string | null | undefined): User | null {
  return getDb().users.find((item) => item.id === userId) || null;
}

function sameEmail(a: unknown, b: unknown) {
  return trim(a).toLowerCase() === trim(b).toLowerCase();
}

export function normalizeContact(value: unknown) {
  let v = String(value ?? '').replace(/\s/g, '');
  if (v.startsWith('+639')) v = `0${v.slice(4)}`;
  else if (v.startsWith('639') && v.length === 12) v = `0${v.slice(2)}`;
  return v;
}

export function isGoogleOnlyAccount(user: User | null | undefined) {
  if (!user) return false;
  const noPassword = user.passwordHash == null || user.passwordHash === '';
  return noPassword && !!user.googleSub;
}

function pruneAttempts() {
  const cutoff = Date.now() - MINUTE_MS;
  getDb().attempts = getDb().attempts.filter((item) => item.atMs > cutoff);
}

function loginAttemptsInLastMinute() {
  pruneAttempts();
  return getDb().attempts.length;
}

function recordDeviceLoginAttempt(username: string | undefined) {
  pruneAttempts();
  getDb().attempts.push({ username, atMs: Date.now(), at: stamp() });
}

export async function login({ username, password }: {
  username?: string;
  password?: string;
  keepLoggedIn?: boolean;
}): Promise<ServiceResult> {
  if (isSupabaseConfigured) {
    return loginWithSupabase({
      username,
      password,
      deviceKey: 'expo-device',
    });
  }
  await wait();

  if (loginAttemptsInLastMinute() >= MAX_LOGIN_ATTEMPTS_PER_MINUTE) {
    return { ok: false, message: MSG.rateLimit };
  }

  recordDeviceLoginAttempt(username);

  const name = String(username ?? '').trim();
  const pass = String(password ?? '');
  if (!name || !pass) {
    return { ok: false, message: MSG.invalidCredentials };
  }

  const user = getDb().users.find((item) => item.username === name);
  if (!user) {
    return { ok: false, message: MSG.invalidCredentials };
  }

  if (user.inactive) {
    return { ok: false, message: MSG.inactive };
  }

  if (user.locked) {
    return { ok: false, message: MSG.locked };
  }

  const hasPassword = user.passwordHash != null && user.passwordHash !== '';
  if (!hasPassword) {
    return { ok: false, message: MSG.invalidCredentials };
  }

  if (!(await comparePassword(pass, user.passwordHash))) {
    user.failedAttempts += 1;
    if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      user.locked = true;
    }
    return { ok: false, message: MSG.invalidCredentials };
  }

  user.failedAttempts = 0;

  if (!user.verified) {
    return {
      ok: false,
      message: MSG.verifyFirst,
      verifyRequired: true,
      userId: user.id,
    };
  }

  user.authEvents.push({ type: 'login', at: stamp() });
  appendAuditEvent(getDb(), {
    action: 'login',
    userId: user.id,
    targetId: user.id,
    metadata: { type: 'auth' },
  });

  // CLT-41 (plans) and meal ordering must reject unverified accounts the same way.
  return { ok: true, user: toPublicUser(user) };
}

export function logout(userId: string) {
  const user = getUser(userId);
  if (!user) return;
  disableBiometricUnlock(userId);
  user.authEvents.push({ type: 'logout', at: stamp() });
  appendAuditEvent(getDb(), {
    action: 'logout',
    userId: user.id,
    targetId: user.id,
    metadata: { type: 'auth' },
  });
}

export async function register(data: RegistrationInput) {
  return registerAccount(data, getDb(), { id: nextId('user'), now: stamp() });
}

export function getPublicUser(userId: string | null | undefined) {
  const user = getUser(userId);
  return toPublicUser(user);
}

export const publicUser = getPublicUser;

export function completeOnboarding(userId: string, input: OnboardingInput): ServiceResult {
  const user = getUser(userId);
  if (!user) return { ok: false, messages: [MSG.required], fields: {} };

  const accountFor = user.accountFor || 'self';
  const fields: FieldMap = {};
  const messages: string[] = [];
  const details = input.personal || {};
  const firstName = trim(details.firstName || user.firstName);
  const lastName = trim(details.lastName || user.lastName);
  const contactNumber = normalizeContact(details.contactNumber || user.contactNumber);
  const address = trim(details.address || user.address);
  if (!firstName || !lastName || !contactNumber || (accountFor === 'self' && !address)) {
    messages.push(MSG.required);
    if (!firstName) fields.firstName = MSG.required;
    if (!lastName) fields.lastName = MSG.required;
    if (!contactNumber) fields.contactNumber = MSG.required;
    if (accountFor === 'self' && !address) fields.address = MSG.required;
  }
  if (contactNumber && !isValidContact(contactNumber)) {
    messages.push(MSG.invalidContact);
    fields.contactNumber = MSG.invalidContact;
  }
  if (contactNumber && isValidContact(contactNumber)
    && getDb().users.some((item) => item.id !== userId && item.contactNumber === contactNumber)) {
    messages.push(MSG.duplicateUser);
    fields.contactNumber = MSG.duplicateUser;
  }
  const personal = {
    firstName,
    middleName: trim(details.middleName || user.middleName),
    lastName,
    suffix: trim(details.suffix || user.suffix),
    contactNumber,
    address,
  };
  let recipient: NonNullable<User['mealRecipient']> | null = null;

  if (accountFor === 'family') {
    const firstName = trim(input.recipient?.firstName);
    const lastName = trim(input.recipient?.lastName);
    const relationshipCategory = trim(input.recipient?.relationship);
    const relationship = relationshipCategory === 'Other'
      ? trim(input.recipient?.relationshipOther)
      : relationshipCategory;
    const deliveryAddress = trim(input.recipient?.deliveryAddress);
    const recipientContactNumber = normalizeContact(input.recipient?.contactNumber);
    if (!firstName || !lastName || !relationship || !deliveryAddress) {
      messages.push(MSG.required);
      if (!firstName) fields.recipientFirstName = MSG.required;
      if (!lastName) fields.recipientLastName = MSG.required;
      if (!relationship) fields.relationship = MSG.required;
      if (!deliveryAddress) fields.deliveryAddress = MSG.required;
    }
    if (relationshipCategory && !['Child', 'Parent', 'Spouse', 'Sibling', 'Grandparent', 'Other'].includes(relationshipCategory)) {
      messages.push(MSG.required);
      fields.relationship = MSG.required;
    }
    if (relationshipCategory === 'Other' && !relationship) {
      messages.push(MSG.required);
      fields.relationship = MSG.required;
    }
    if (recipientContactNumber && !isValidContact(recipientContactNumber)) {
      messages.push(MSG.invalidContact);
      fields.recipientContactNumber = MSG.invalidContact;
    }
    if (!input.recipient?.consentConfirmed) {
      messages.push("Please confirm that you are allowed to manage this person's information.");
      fields.recipientConsent = "Please confirm that you are allowed to manage this person's information.";
    }
    if (firstName && lastName && relationship && deliveryAddress
      && (!recipientContactNumber || isValidContact(recipientContactNumber))
      && input.recipient?.consentConfirmed) {
      recipient = {
        id: user.mealRecipient?.id || nextId('recipient'),
        firstName,
        middleName: trim(input.recipient?.middleName),
        lastName,
        suffix: trim(input.recipient?.suffix),
        contactNumber: recipientContactNumber || undefined,
        relationship,
        deliveryAddress,
        consentAt: user.mealRecipient?.consentAt || stamp(),
        healthConditions: [...new Set((input.healthConditions || []).map(trim).filter(Boolean))],
        dietaryRestrictions: [...new Set((input.dietaryRestrictions || []).map(trim).filter(Boolean))],
        allergies: (input.allergies || [])
          .map((item) => ({ name: trim(item.name), note: trim(item.note) }))
          .filter((item) => item.name),
        mealPreferences: user.mealRecipient?.mealPreferences || {
          preferredCategories: [],
          dislikedIngredients: [],
        },
        nutritionalPreference: user.mealRecipient?.nutritionalPreference || null,
        nutritionalPreferences: user.mealRecipient?.nutritionalPreferences || [],
        nutritionTargets: user.mealRecipient?.nutritionTargets || {},
      };
    }
  }

  if (!user.termsAcceptedAt && !input.acceptedTerms) {
    messages.push(MSG.termsRequired);
    fields.terms = MSG.termsRequired;
  }
  if (messages.length) return { ok: false, messages: [...new Set(messages)], fields };

  Object.assign(user, personal);
  if (accountFor === 'self') {
    Object.assign(user, {
      healthConditions: [...new Set((input.healthConditions || []).map(trim).filter(Boolean))],
      dietaryRestrictions: [...new Set((input.dietaryRestrictions || []).map(trim).filter(Boolean))],
      allergies: (input.allergies || [])
        .map((item) => ({ name: trim(item.name), note: trim(item.note) }))
        .filter((item) => item.name),
    });
  }
  if (recipient) user.mealRecipient = recipient;
  if (!user.termsAcceptedAt) user.termsAcceptedAt = stamp();
  user.profileComplete = true;
  user.profileLastUpdated = stamp();
  appendAuditEvent(getDb(), {
    action: 'profile.onboarding_completed',
    userId,
    targetId: recipient?.id || userId,
    metadata: {
      accountFor,
      mealRecipientId: recipient?.id || null,
    },
  });
  return { ok: true, user: toPublicUser(user) };
}

export function recordLogin(userId: string) {
  const user = getUser(userId);
  if (!user) return null;
  user.authEvents.push({ type: 'login', at: stamp() });
  appendAuditEvent(getDb(), {
    action: 'login',
    userId: user.id,
    targetId: user.id,
    metadata: { type: 'auth' },
  });
  return toPublicUser(user);
}

export async function linkGoogleAccount({
  username,
  password,
  google,
}: {
  username?: string;
  password?: string;
  google?: GoogleProfile | null;
}): Promise<ServiceResult> {
  await wait();
  const name = String(username ?? '').trim();
  const pass = String(password ?? '');
  if (!name || !pass || !google?.sub) {
    return { ok: false, message: MSG.required };
  }

  const user = getDb().users.find((item) => item.username === name);
  if (!user) {
    return { ok: false, message: MSG.invalidCredentials };
  }

  if (user.inactive) {
    return { ok: false, message: MSG.inactive };
  }

  if (user.locked) {
    return { ok: false, message: MSG.locked };
  }

  const hasPassword = user.passwordHash != null && user.passwordHash !== '';
  if (!hasPassword) {
    return { ok: false, message: MSG.invalidCredentials };
  }

  if (!(await comparePassword(pass, user.passwordHash))) {
    user.failedAttempts += 1;
    if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      user.locked = true;
    }
    return { ok: false, message: MSG.invalidCredentials };
  }

  if (!user.verified) {
    return {
      ok: false,
      message: MSG.verifyFirst,
      status: 'unverified',
      userId: user.id,
    };
  }

  const linkedElsewhere = getDb().users.find(
    (item) => item.googleSub === google.sub && item.id !== user.id,
  );
  if (linkedElsewhere) {
    return { ok: false, message: MSG.googleAlreadyLinked };
  }

  if (user.googleSub && user.googleSub !== google.sub) {
    return { ok: false, message: MSG.googleAlreadyLinked };
  }

  user.googleSub = google.sub;
  user.failedAttempts = 0;
  const signedIn = recordLogin(user.id);
  return { ok: true, message: MSG.googleLinked, user: signedIn };
}

export function completeProfile(userId: string, input: RegistrationInput): ServiceResult {
  const user = getUser(userId);
  if (!user) {
    return { ok: false, messages: [MSG.required], fields: {} };
  }

  const firstName = trim(input.firstName);
  const lastName = trim(input.lastName);
  const contactNumber = normalizeContact(input.contactNumber);
  const acceptedTerms = !!input.acceptedTerms;
  const messages: string[] = [];
  const fields: FieldMap = {};

  if (!firstName || !lastName || !contactNumber) {
    pushOnce(messages, MSG.required);
    if (!firstName) fields.firstName = true;
    if (!lastName) fields.lastName = true;
    if (!contactNumber) fields.contactNumber = true;
  }

  if (contactNumber && !isValidContact(contactNumber)) {
    pushOnce(messages, MSG.invalidContact);
    fields.contactNumber = true;
  }

  if (!acceptedTerms) {
    pushOnce(messages, MSG.termsRequired);
    fields.terms = true;
  }

  const contactTaken = contactNumber && isValidContact(contactNumber)
    && getDb().users.some(
      (item) => item.id !== userId && item.contactNumber === contactNumber,
    );
  if (contactTaken) {
    pushOnce(messages, MSG.duplicateUser);
    fields.contactNumber = true;
  }

  const unique = [...new Set(messages)];
  if (unique.length) {
    return { ok: false, messages: unique, fields };
  }

  user.firstName = firstName;
  user.lastName = lastName;
  user.contactNumber = contactNumber;
  if (!user.termsAcceptedAt) {
    user.termsAcceptedAt = stamp();
  }
  user.profileComplete = true;

  return { ok: true, user: toPublicUser(user) };
}

function pushOnce(list: string[], message: string) {
  if (message && !list.includes(message)) list.push(message);
}

export function findTermsAcceptance(username: string | null | undefined) {
  if (!username) return null;
  const user = getDb().users.find((item) => item.username === username);
  if (!user?.termsAcceptedAt) return null;
  return {
    acceptedAt: user.termsAcceptedAt,
    formatted: formatTimestamp(user.termsAcceptedAt),
  };
}

export function lookupPasswordReset({ mode, value }: { mode: string; value?: string }): ServiceResult {
  if (mode === 'contact') {
    const contactNumber = normalizeContact(value);
    if (!isValidContact(contactNumber)) {
      return { ok: false, message: MSG.invalidContact };
    }
    const user = getDb().users.find((item) => item.contactNumber === contactNumber);
    if (!user) {
      return { ok: false, message: MSG.noContact };
    }
    if (isGoogleOnlyAccount(user)) {
      return { ok: false, message: MSG.googleOnly };
    }
    return {
      ok: true,
      userId: user.id,
      phone: user.contactNumber,
      email: user.email,
    };
  }

  const email = trim(value).toLowerCase();
  if (!isValidEmail(email)) {
    return { ok: false, message: MSG.invalidEmail };
  }
  const user = getDb().users.find((item) => sameEmail(item.email, email));
  if (!user) {
    return { ok: false, message: MSG.noEmail };
  }
  if (isGoogleOnlyAccount(user)) {
    return { ok: false, message: MSG.googleOnly };
  }
  return {
    ok: true,
    userId: user.id,
    phone: user.contactNumber,
    email: user.email,
  };
}

export function verifyResetCode({ userId, code }: { userId: string; code?: string | null }): ServiceResult {
  const result = verifyCode({ userId, purpose: 'reset', code });
  if (!result.ok) return result;

  const grantId = nextId('grant');
  getDb().grants.push({
    id: grantId,
    userId,
    used: false,
    createdAtMs: Date.now(),
  });
  return { ok: true, grantId };
}

export function peekGrant(grantId: string | null | undefined) {
  if (!grantId) return null;
  return getDb().grants.find((item) => item.id === grantId && !item.used) || null;
}

export function updatePassword({
  grantId,
  password,
  confirmPassword,
}: {
  grantId?: string | null;
  password?: string;
  confirmPassword?: string;
}): ServiceResult {
  const grant = peekGrant(grantId);
  if (!grant) {
    return { ok: false, code: 'no-grant', messages: [] };
  }

  const pass = String(password ?? '');
  const confirm = String(confirmPassword ?? '');
  const messages: string[] = [];

  if (!pass || !confirm) {
    messages.push(MSG.required);
  }
  if (pass !== confirm) {
    messages.push(MSG.passwordMismatch);
  }
  if (pass.length < 8) {
    messages.push(MSG.shortPassword);
  }

  const user = getUser(grant.userId);
  if (user && comparePasswordSync(pass, user.passwordHash)) {
    messages.push(MSG.samePassword);
  }

  const unique = [...new Set(messages)];
  if (unique.length) {
    return { ok: false, messages: unique };
  }

  grant.used = true;
  const account = user!;
  account.passwordHash = hashPasswordSync(pass);
  account.passwordStorage = 'bcrypt';
  account.sessionVersion += 1;
  account.locked = false;
  account.failedAttempts = 0;
  disableBiometricUnlock(grant.userId);

  void clearPersistedSession();

  return { ok: true, message: MSG.passwordUpdated };
}

// Re-export for tests that exercise the reset send path.
export { sendCode };

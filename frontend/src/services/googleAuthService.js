// Mocked Google sign-in. There is no Google SDK. Pick an outcome in dev to demo each branch.
// A real backend still must not store a password for these accounts.

import { getDb, nextId, stamp } from '../data/mockStore.js';
import { MSG } from '../data/messages.js';
import { recordLogin } from './authService.js';

export const GOOGLE_OUTCOMES = [
  { id: 'new_user', label: 'New user' },
  { id: 'returning', label: 'Returning user' },
  { id: 'email_conflict', label: 'Email already registered' },
  { id: 'account_picker', label: 'Account picker (two accounts)' },
  { id: 'already_linked', label: 'Google already linked elsewhere' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'refused', label: 'Refused name or email' },
  { id: 'no_connection', label: 'No connection' },
  { id: 'inactive', label: 'Inactive account' },
];

export const PICKER_ACCOUNTS = [
  {
    sub: 'google-picker-maria',
    email: 'maria.santos@gmail.com',
    firstName: 'Maria',
    lastName: 'Santos',
  },
  {
    sub: 'google-picker-work',
    email: 'msantos.work@gmail.com',
    firstName: 'Maria',
    lastName: 'Santos',
  },
];

function sameEmail(a, b) {
  return (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
}

function scenarioProfile(outcome) {
  if (outcome === 'returning') {
    return { sub: 'google-ana-cruz', email: 'ana.cruz@gmail.com', firstName: 'Ana', lastName: 'Cruz' };
  }
  if (outcome === 'email_conflict') {
    return { sub: `google-maria-${Date.now()}`, email: 'maria.santos@gmail.com', firstName: 'Maria', lastName: 'Santos' };
  }
  if (outcome === 'inactive') {
    return { sub: 'google-inactive', email: 'inactive.client@gmail.com', firstName: 'Rita', lastName: 'Diaz' };
  }
  if (outcome === 'new_user') {
    return {
      sub: `google-new-${Date.now()}`,
      email: `new.client.${Date.now()}@gmail.com`,
      firstName: 'Jamie',
      lastName: 'Lopez',
    };
  }
  return null;
}

function createGoogleUser(profile, accountFor) {
  const createdAt = stamp();
  const user = {
    id: nextId('user'),
    accountFor: accountFor === 'family' ? 'family' : 'self',
    firstName: profile.firstName,
    middleName: '',
    lastName: profile.lastName,
    suffix: '',
    contactNumber: '',
    email: profile.email.toLowerCase(),
    username: null,
    password: null,
    verified: true,
    profileComplete: false,
    inactive: false,
    locked: false,
    failedAttempts: 0,
    googleSub: profile.sub,
    termsAcceptedAt: null,
    authEvents: [],
    sessionVersion: 1,
    createdAt,
  };
  getDb().users.push(user);
  return user;
}

export function resolveGoogleProfile(profile, accountFor) {
  if (!profile?.email || !profile?.firstName || !profile?.lastName) {
    return { ok: false, message: MSG.googleNeedsName };
  }

  const users = getDb().users;
  const bySub = users.find((user) => user.googleSub && user.googleSub === profile.sub);
  if (bySub) {
    if (bySub.inactive) return { ok: false, message: MSG.inactive };
    return { ok: true, user: recordLogin(bySub.id) };
  }

  const byEmail = users.find((user) => sameEmail(user.email, profile.email));
  if (byEmail) {
    if (byEmail.inactive) return { ok: false, message: MSG.inactive };
    if (byEmail.googleSub) {
      if (byEmail.googleSub !== profile.sub) {
        return { ok: false, message: MSG.googleAlreadyLinked };
      }
      return { ok: true, user: recordLogin(byEmail.id) };
    }
    return { ok: false, status: 'link', message: MSG.linkPrompt, google: profile };
  }

  const created = createGoogleUser(profile, accountFor);
  return { ok: true, user: recordLogin(created.id) };
}

export async function continueWithGoogle({ outcome, profile, accountFor }) {
  await new Promise((resolve) => setTimeout(resolve, 350));

  if (outcome === 'cancelled') return { ok: false, message: MSG.googleCancelled };
  if (outcome === 'refused') return { ok: false, message: MSG.googleNeedsName };
  if (outcome === 'no_connection') return { ok: false, message: MSG.googleConnection };
  if (outcome === 'already_linked') {
    return {
      ok: false,
      status: 'link',
      message: MSG.linkPrompt,
      google: {
        sub: 'google-ana-cruz',
        email: 'maria.santos@gmail.com',
        firstName: 'Maria',
        lastName: 'Santos',
      },
    };
  }

  const google = profile || scenarioProfile(outcome);
  if (!google) return { ok: false, message: MSG.googleConnection };
  return resolveGoogleProfile(google, accountFor);
}

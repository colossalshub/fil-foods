// In-memory stand-in for the backend. Screens must not import this file.
// Passwords below are readable ONLY so the demo can sign in as msantos / Meal@2026.
// A real backend must store an Argon2id or bcrypt hash and must never write the
// password to disk, AsyncStorage, or logs.

import { nowIso } from '../utils/time.js';

function sampleUsers() {
  const accepted = '2026-10-11T01:00:00.000Z';
  return [
    {
      id: 'user-maria',
      accountFor: 'self',
      firstName: 'Maria',
      middleName: '',
      lastName: 'Santos',
      suffix: '',
      contactNumber: '09171234567',
      email: 'maria.santos@gmail.com',
      username: 'msantos',
      password: 'Meal@2026',
      verified: true,
      profileComplete: true,
      inactive: false,
      locked: false,
      failedAttempts: 0,
      googleSub: null,
      termsAcceptedAt: accepted,
      authEvents: [],
      sessionVersion: 1,
      createdAt: accepted,
      address: '12 Mabini St., Quezon City',
      healthConditions: ['Hypertension'],
      dietaryRestrictions: ['Low-sodium'],
      allergies: [{ name: 'Peanuts', note: 'Skin rash and swelling' }],
      mealPreferences: { preferredCategories: [], dislikedIngredients: [] },
      nutritionalPreference: null,
      guardian: { name: 'Jose Santos', relationship: 'Son', contactNumber: '09189876543' },
      profileLastUpdated: '2026-10-11T08:00:00.000Z',
      profileHistory: [
        {
          id: 'hist-sample-peanuts',
          section: 'allergies',
          action: 'added',
          item: 'Peanuts',
          at: '2026-10-12T01:00:00.000Z',
          whoName: 'Maria Santos',
          role: 'client',
        },
      ],
      pendingContactChange: null,
    },
    {
      // Google-only sample from CLT-04. The story gives the contact number, not the email.
      id: 'user-ana',
      accountFor: 'self',
      firstName: 'Ana',
      middleName: '',
      lastName: 'Cruz',
      suffix: '',
      contactNumber: '09175550142',
      email: 'ana.cruz@gmail.com',
      username: null,
      password: null,
      verified: true,
      profileComplete: true,
      inactive: false,
      locked: false,
      failedAttempts: 0,
      googleSub: 'google-ana-cruz',
      termsAcceptedAt: accepted,
      authEvents: [],
      sessionVersion: 1,
      createdAt: accepted,
    },
    {
      id: 'user-inactive',
      accountFor: 'self',
      firstName: 'Rita',
      middleName: '',
      lastName: 'Diaz',
      suffix: '',
      contactNumber: '09170001122',
      email: 'inactive.client@gmail.com',
      username: null,
      password: null,
      verified: true,
      profileComplete: true,
      inactive: true,
      locked: false,
      failedAttempts: 0,
      googleSub: 'google-inactive',
      termsAcceptedAt: accepted,
      authEvents: [],
      sessionVersion: 1,
      createdAt: accepted,
    },
  ];
}

function emptyDb() {
  return {
    users: sampleUsers(),
    codes: [],
    grants: [],
    // Login attempts in the last minute, for the rate limit. This app is one device.
    attempts: [],
    failNextCodeSend: false,
    seq: 1,
  };
}

let db = emptyDb();

export function getDb() {
  return db;
}

export function resetStore() {
  db = emptyDb();
}

export function nextId(prefix) {
  db.seq += 1;
  return `${prefix}-${db.seq}`;
}

export function stamp() {
  return nowIso();
}

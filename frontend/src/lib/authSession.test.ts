import assert from 'node:assert/strict';
import test from 'node:test';
import { accessTokenStillValid, chooseOrderSession, jwtSubject, normalizeExpiresAt } from './authSession.js';

const now = Date.parse('2026-10-31T00:00:00.000Z');

function base64url(value) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function tokenExpiringAt(expSeconds) {
  const header = base64url(JSON.stringify({ alg: 'ES256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ exp: expSeconds }));
  return `${header}.${payload}.sig`;
}

test('expiry accepts unix seconds and millisecond timestamps', () => {
  assert.equal(normalizeExpiresAt({ expires_at: 1_700_000_000 }), 1_700_000_000);
  assert.equal(normalizeExpiresAt({ expires_at: 1_700_000_000_000 }), 1_700_000_000);
});

test('a token is usable until shortly before it expires', () => {
  const expiresAt = Math.floor(now / 1000) + 3600;
  assert.equal(accessTokenStillValid({ access_token: 'a.b.c', expires_at: expiresAt }, now), true);
  assert.equal(accessTokenStillValid({
    access_token: 'a.b.c',
    expires_at: Math.floor(now / 1000),
  }, now), false);
});

test('checkout keeps the login token when the Supabase client has no session', () => {
  const remembered = {
    access_token: tokenExpiringAt(Math.floor(now / 1000) + 3600),
    refresh_token: 'refresh',
  };
  const chosen = chooseOrderSession(null, remembered, now);
  assert.equal(chosen, remembered);
});

test('checkout prefers a live client session over the saved login token', () => {
  const clientSession = { access_token: 'client.token.value', expires_at: Math.floor(now / 1000) + 3600 };
  const remembered = { access_token: 'saved.token.value', expires_at: Math.floor(now / 1000) + 3600 };
  assert.equal(chooseOrderSession(clientSession, remembered, now), clientSession);
});

test('user id is read from the access token when the session has no user', () => {
  const header = base64url(JSON.stringify({ alg: 'ES256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ sub: 'user-1', exp: Math.floor(now / 1000) + 3600 }));
  assert.equal(jwtSubject(`${header}.${payload}.sig`), 'user-1');
  assert.equal(jwtSubject('not-a-jwt'), null);
});

test('missing tokens do not count as a session', () => {
  assert.equal(chooseOrderSession(null, null, now), null);
  assert.equal(chooseOrderSession({ refresh_token: 'only-refresh' }, {}, now), null);
});

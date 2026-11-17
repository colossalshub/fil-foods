import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAuthLink, stripAuthParams } from './authLink.js';

test('PKCE confirmation link gives the code', () => {
  assert.deepEqual(parseAuthLink('filfoods://auth/confirm?code=abc-123'), { kind: 'code', code: 'abc-123', type: null });
  assert.deepEqual(parseAuthLink('http://localhost:8081/?code=xyz'), { kind: 'code', code: 'xyz', type: null });
});

test('implicit tokens in the hash, with the link type', () => {
  const link = parseAuthLink('https://app.example/#access_token=a.b.c&refresh_token=r1&expires_in=3600&type=recovery');
  assert.deepEqual(link, { kind: 'tokens', accessToken: 'a.b.c', refreshToken: 'r1', type: 'recovery' });
});

test('token_hash links (custom email templates)', () => {
  assert.deepEqual(parseAuthLink('filfoods://auth/confirm?token_hash=h1&type=signup'), { kind: 'token_hash', tokenHash: 'h1', type: 'signup' });
  assert.equal(parseAuthLink('filfoods://auth/confirm?token_hash=h1'), null);
});

test('expired or used links report the error', () => {
  const link = parseAuthLink('http://localhost:3000/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  assert.deepEqual(link, { kind: 'error', errorCode: 'otp_expired', description: 'Email link is invalid or has expired', type: null });
});

test('ordinary URLs are not auth links', () => {
  assert.equal(parseAuthLink('filfoods://'), null);
  assert.equal(parseAuthLink('http://localhost:8081/menu?tab=1'), null);
  assert.equal(parseAuthLink(null), null);
});

test('stripAuthParams keeps only the path', () => {
  assert.equal(stripAuthParams('http://localhost:8081/?code=1#x=2'), 'http://localhost:8081/');
});

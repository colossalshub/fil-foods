// One code flow for account verification (CLT-34), password reset (CLT-04),
// and later for a changed contact number or email (CLT-08). Nothing is sent.

import { getDb, nextId, stamp } from '../data/mockStore.js';
import { EMAIL_SUBJECT, EMAIL_TEMPLATE, MSG, SMS_TEMPLATE, waitForCode } from '../data/messages.js';
import { getUser } from './authService.js';

const TEN_MINUTES = 10 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MAX_CODES_PER_HOUR = 5;
const MAX_WRONG = 5;
export const MOCK_CODE = '123456';

export function maskPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 6) return digits;
  return `${digits.slice(0, 4)}*****${digits.slice(-2)}`;
}

export function maskEmail(email) {
  const [local, domain] = (email || '').split('@');
  if (!local || !domain) return email || '';
  if (local.length === 1) return `*@${domain}`;
  return `${local[0]}*****${local[local.length - 1]}@${domain}`;
}

function targetFor(user, channel, purpose) {
  if (purpose === 'contact' && user.pendingContactChange) {
    const pending = user.pendingContactChange;
    if (channel === 'sms') {
      return pending.contactNumber || user.contactNumber;
    }
    return (pending.email || user.email || '').toLowerCase();
  }
  if (channel === 'sms') return user.contactNumber;
  return (user.email || '').toLowerCase();
}

function codesForTarget(target) {
  return getDb().codes.filter((item) => item.target === target);
}

export function secondsUntilCanSend(target) {
  const last = codesForTarget(target).sort((a, b) => b.createdAtMs - a.createdAtMs)[0];
  if (!last) return 0;
  const remain = COOLDOWN_MS - (Date.now() - last.createdAtMs);
  return remain > 0 ? Math.ceil(remain / 1000) : 0;
}

export function setNextSendShouldFail(value) {
  getDb().failNextCodeSend = !!value;
}

export function expireActiveCode(userId, purpose) {
  const active = latestCode(userId, purpose);
  if (active && !active.used && !active.invalidated) active.expiresAtMs = Date.now() - 1000;
}

// Inserts five sends just outside the 60-second cooldown so the next request hits the hourly cap.
export function fillHourlyLimit(userId, channel, purpose) {
  const user = getUser(userId);
  if (!user) return;
  const target = targetFor(user, channel, purpose);
  const now = Date.now();
  for (let i = 0; i < MAX_CODES_PER_HOUR; i += 1) {
    getDb().codes.push({
      id: nextId('code'),
      userId,
      purpose,
      channel,
      target,
      code: MOCK_CODE,
      createdAtMs: now - (90 + i) * 1000,
      expiresAtMs: now,
      used: false,
      invalidated: true,
      wrongAttempts: 0,
    });
  }
}

function latestCode(userId, purpose) {
  return getDb().codes
    .filter((item) => item.userId === userId && item.purpose === purpose)
    .sort((a, b) => b.createdAtMs - a.createdAtMs)[0] || null;
}

export function sendCode({ userId, channel, purpose }) {
  const user = getUser(userId);
  if (!user) return { ok: false, message: MSG.sendFailed };
  const target = targetFor(user, channel, purpose);
  if (!target) return { ok: false, message: MSG.sendFailed };

  const now = Date.now();
  const inHour = codesForTarget(target).filter((item) => now - item.createdAtMs < HOUR_MS);
  if (inHour.length >= MAX_CODES_PER_HOUR) {
    return { ok: false, message: MSG.tooManyCodeRequests };
  }
  const wait = secondsUntilCanSend(target);
  if (wait > 0) return { ok: false, message: waitForCode(wait) };

  if (getDb().failNextCodeSend) {
    getDb().failNextCodeSend = false;
    return { ok: false, message: MSG.sendFailed };
  }

  getDb().codes.forEach((item) => {
    if (item.userId === userId && item.purpose === purpose && !item.used) item.invalidated = true;
  });

  const entry = {
    id: nextId('code'),
    userId,
    purpose,
    channel,
    target,
    // Fixed test code from CLT-34. Delivery is not implemented.
    code: MOCK_CODE,
    createdAtMs: now,
    createdAt: stamp(),
    expiresAtMs: now + TEN_MINUTES,
    used: false,
    invalidated: false,
    wrongAttempts: 0,
    smsText: SMS_TEMPLATE,
    emailSubject: EMAIL_SUBJECT,
    emailBody: EMAIL_TEMPLATE,
  };
  getDb().codes.push(entry);
  return {
    ok: true,
    sent: false,
    codeId: entry.id,
    channel,
    masked: channel === 'sms' ? maskPhone(target) : maskEmail(target),
  };
}

export function verifyCode({ userId, purpose, code }) {
  const value = (code || '').trim();
  if (!value) return { ok: false, message: MSG.required };

  const latest = latestCode(userId, purpose);
  if (!latest || latest.invalidated || latest.used) {
    return { ok: false, message: MSG.wrongCode };
  }
  if (latest.wrongAttempts >= MAX_WRONG) {
    return { ok: false, message: MSG.tooManyWrong };
  }
  if (Date.now() > latest.expiresAtMs) {
    return { ok: false, message: MSG.codeExpired };
  }
  if (value !== latest.code) {
    latest.wrongAttempts += 1;
    if (latest.wrongAttempts >= MAX_WRONG) return { ok: false, message: MSG.tooManyWrong };
    return { ok: false, message: MSG.wrongCode };
  }

  latest.used = true;
  if (purpose === 'account') {
    const user = getUser(userId);
    if (user) user.verified = true;
  }
  return { ok: true };
}

export function activeCodeInfo(userId, purpose) {
  const latest = latestCode(userId, purpose);
  if (!latest || latest.used || latest.invalidated) return null;
  return { id: latest.id, channel: latest.channel, target: latest.target, wrongAttempts: latest.wrongAttempts };
}

import bcrypt from 'bcryptjs';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';
import type { AppDatabase, AuditEvent, CodedError, User } from '../types';

declare const require: (id: string) => { getRandomBytes: (length: number) => Uint8Array };

// bcryptjs 3 only accepts Web Crypto or Node's crypto module. React Native has
// neither while the sample account is hashed at startup, so salt bytes come
// from Expo Crypto. Node tests keep using Web Crypto and never load this module.
bcrypt.setRandomFallback((length: number) => {
  const { getRandomBytes } = require('expo-crypto');
  return getRandomBytes(length) as unknown as number[];
});

export const ROLES = Object.freeze({
  CLIENT: 1,
  STAFF: 2,
  ADMIN: 4,
});

export function hasRole(user: { roleMask?: number } | null | undefined, requiredRole: number) {
  return Boolean((Number(user?.roleMask) & Number(requiredRole)) === Number(requiredRole));
}

export function requireRole(user: { roleMask?: number } | null | undefined, requiredRole: number) {
  if (!hasRole(user, requiredRole)) {
    const error = new Error('Forbidden') as CodedError;
    error.code = 'FORBIDDEN';
    throw error;
  }
  return true;
}

export function assertClientOwns(sessionUserId: string | null | undefined, ownerId: string | null | undefined) {
  if (!sessionUserId || sessionUserId !== ownerId) {
    const error = new Error('Forbidden') as CodedError;
    error.code = 'FORBIDDEN';
    throw error;
  }
  return true;
}

export function canViewKitchenRecord(actor: { roleMask?: number } | null | undefined) {
  return hasRole(actor, ROLES.STAFF) || hasRole(actor, ROLES.ADMIN);
}

export async function hashPassword(password: unknown) {
  return bcrypt.hash(String(password), 12);
}

export function hashPasswordSync(password: unknown) {
  return bcrypt.hashSync(String(password), 12);
}

export function comparePassword(password: string, passwordHash: string | null | undefined) {
  return bcrypt.compare(String(password), String(passwordHash || ''));
}

export function comparePasswordSync(password: string, passwordHash: string | null | undefined) {
  return bcrypt.compareSync(String(password), String(passwordHash || ''));
}

export function hashAuditEntry(entry: {
  at: string;
  action: string;
  userId: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}, previousHash = '') {
  const payload = JSON.stringify({
    at: entry.at,
    action: entry.action,
    userId: entry.userId,
    targetId: entry.targetId || null,
    metadata: entry.metadata || {},
    previousHash,
  });
  return bytesToHex(sha256(utf8ToBytes(payload)));
}

export function appendAuditEvent(db: AppDatabase, {
  action, userId, targetId = null, metadata = {}, at,
}: {
  action: string;
  userId: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  at?: string;
}) {
  if (!Array.isArray(db.auditLog)) db.auditLog = [];
  const previous = db.auditLog[db.auditLog.length - 1];
  const entry: AuditEvent = {
    id: `audit-${db.auditLog.length + 1}`,
    at: at || new Date().toISOString(),
    action,
    userId,
    targetId,
    metadata,
    previousHash: previous?.hash || null,
    hash: '',
  };
  entry.hash = hashAuditEntry(entry, entry.previousHash || '');
  db.auditLog.push(entry);
  return entry;
}

export function auditAdminAction(db: AppDatabase, actor: User, action: string, details: {
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  at?: string;
} = {}) {
  requireRole(actor, ROLES.ADMIN);
  return appendAuditEvent(db, {
    action,
    userId: actor.id,
    targetId: details.targetId || null,
    metadata: details.metadata || {},
    at: details.at,
  });
}

export function verifyAuditChain(entries: AuditEvent[] | null | undefined) {
  let previousHash = '';
  for (const entry of entries || []) {
    if (entry.previousHash !== (previousHash || null)) return false;
    if (hashAuditEntry(entry, previousHash) !== entry.hash) return false;
    previousHash = entry.hash;
  }
  return true;
}

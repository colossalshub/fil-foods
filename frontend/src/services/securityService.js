import bcrypt from 'bcryptjs';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

export const ROLES = Object.freeze({
  CLIENT: 1,
  STAFF: 2,
  ADMIN: 4,
});

export function hasRole(user, requiredRole) {
  return Boolean((Number(user?.roleMask) & Number(requiredRole)) === Number(requiredRole));
}

export function requireRole(user, requiredRole) {
  if (!hasRole(user, requiredRole)) {
    const error = new Error('Forbidden');
    error.code = 'FORBIDDEN';
    throw error;
  }
  return true;
}

export async function hashPassword(password) {
  return bcrypt.hash(String(password), 12);
}

export function hashPasswordSync(password) {
  return bcrypt.hashSync(String(password), 12);
}

export function comparePassword(password, passwordHash) {
  return bcrypt.compare(String(password), String(passwordHash || ''));
}

export function comparePasswordSync(password, passwordHash) {
  return bcrypt.compareSync(String(password), String(passwordHash || ''));
}

export function hashAuditEntry(entry, previousHash = '') {
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

export function appendAuditEvent(db, { action, userId, targetId = null, metadata = {}, at }) {
  if (!Array.isArray(db.auditLog)) db.auditLog = [];
  const previous = db.auditLog[db.auditLog.length - 1];
  const entry = {
    id: `audit-${db.auditLog.length + 1}`,
    at: at || new Date().toISOString(),
    action,
    userId,
    targetId,
    metadata,
    previousHash: previous?.hash || null,
  };
  entry.hash = hashAuditEntry(entry, entry.previousHash || '');
  db.auditLog.push(entry);
  return entry;
}

export function auditAdminAction(db, actor, action, details = {}) {
  requireRole(actor, ROLES.ADMIN);
  return appendAuditEvent(db, {
    action,
    userId: actor.id,
    targetId: details.targetId || null,
    metadata: details.metadata || {},
    at: details.at,
  });
}

export function verifyAuditChain(entries) {
  let previousHash = '';
  for (const entry of entries || []) {
    if (entry.previousHash !== (previousHash || null)) return false;
    if (hashAuditEntry(entry, previousHash) !== entry.hash) return false;
    previousHash = entry.hash;
  }
  return true;
}

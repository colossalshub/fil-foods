import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendAuditEvent, auditAdminAction, hasRole, requireRole, ROLES, verifyAuditChain,
} from './securityService.js';
import { solveNutritionPlan } from './nutritionService.js';

test('audit chain detects tampering and links each event to its predecessor', () => {
  const db = { auditLog: [] };
  appendAuditEvent(db, { action: 'file.uploaded', userId: 'admin-1', targetId: 'file-1', at: '2026-10-28T00:00:00.000Z' });
  appendAuditEvent(db, { action: 'record.updated', userId: 'admin-1', targetId: 'meal-1', at: '2026-10-28T00:01:00.000Z' });
  assert.equal(verifyAuditChain(db.auditLog), true);
  db.auditLog[0].metadata = { changed: true };
  assert.equal(verifyAuditChain(db.auditLog), false);
});

test('admin audit actions require the admin bit', () => {
  const db = { auditLog: [] };
  const admin = { id: 'admin-1', roleMask: ROLES.ADMIN };
  assert.equal(hasRole({ roleMask: ROLES.ADMIN | ROLES.STAFF }, ROLES.ADMIN), true);
  assert.throws(() => requireRole({ roleMask: ROLES.CLIENT }, ROLES.ADMIN), { code: 'FORBIDDEN' });
  auditAdminAction(db, admin, 'record.updated', { targetId: 'meal-1' });
  assert.equal(db.auditLog[0].userId, admin.id);
});

test('nutrition solver returns one meal per slot under hard ceilings', () => {
  const result = solveNutritionPlan([
    { id: 'breakfast', category: 'Breakfast', calories: 400, protein: 25, fat: 10 },
    { id: 'lunch', category: 'Lunch', calories: 600, protein: 40, fat: 15 },
    { id: 'dinner', category: 'Dinner', calories: 700, protein: 55, fat: 20 },
  ], { calories: 1800, protein: 120, fat: 50 });
  assert.equal(result.ok, true);
  assert.equal(result.meals.length, 3);
  assert.ok(result.totals.calories <= 1800);
  assert.ok(result.totals.fat <= 50);
});

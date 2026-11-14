import { MSG } from '../data/messages.js';
import { getDb, nextId, stamp } from '../data/mockStore.js';
import { getUser } from './authService.js';

export interface FeedbackRecord {
  id: string;
  userId: string;
  message: string;
  at: string;
}

function feedbackList(): FeedbackRecord[] {
  const db = getDb() as { feedback?: FeedbackRecord[] };
  if (!Array.isArray(db.feedback)) db.feedback = [];
  return db.feedback;
}

export function submitFeedback(userId: string, message: string) {
  const user = getUser(userId);
  if (!user) return { ok: false as const, message: MSG.guestGate };
  const text = String(message || '').trim();
  if (!text) return { ok: false as const, message: MSG.enterComment };
  const row = { id: nextId('feedback'), userId, message: text, at: stamp() };
  feedbackList().push(row);
  return { ok: true as const, message: MSG.commentSubmitted, feedback: row };
}

export function listFeedbackForAdmin() {
  return feedbackList().map((row) => ({ ...row }));
}

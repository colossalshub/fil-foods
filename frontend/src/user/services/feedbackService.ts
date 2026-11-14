import { MSG } from '../data/messages.js';
import { getDb, nextId, stamp } from '../data/mockStore.js';
import { ensureSession, isSupabaseConfigured, requireSupabase } from '../../lib/supabaseClient.js';
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

export async function submitFeedback(userId: string, message: string) {
  const user = getUser(userId);
  if (!user) return { ok: false as const, message: MSG.guestGate };
  const text = String(message || '').trim();
  if (!text) return { ok: false as const, message: MSG.enterComment };

  if (isSupabaseConfigured) {
    const session = await ensureSession().catch(() => null);
    if (session?.user?.id) {
      const { data, error } = await requireSupabase()
        .from('help_feedback')
        .insert({ client_id: session.user.id, message: text })
        .select('id, created_at')
        .single();
      if (error) return { ok: false as const, message: error.message };
      const row = {
        id: data.id as string,
        userId,
        message: text,
        at: data.created_at as string,
      };
      return { ok: true as const, message: MSG.commentSubmitted, feedback: row };
    }
  }

  const row = { id: nextId('feedback'), userId, message: text, at: stamp() };
  feedbackList().push(row);
  return { ok: true as const, message: MSG.commentSubmitted, feedback: row };
}

export function listFeedbackForAdmin() {
  return feedbackList().map((row) => ({ ...row }));
}
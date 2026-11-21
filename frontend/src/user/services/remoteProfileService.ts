import type { SupabaseClient } from '@supabase/supabase-js';
import type { Allergy, GuardianInput, MealPreferences, PersonalInfoInput, Profile, ServiceResult } from '../types';
import { ensureSession, isSupabaseConfigured, requireSupabase } from '../../lib/supabaseClient.js';
import { MSG } from '../data/messages.js';
import { TERMS_VERSION } from '../data/terms.js';
import { getProfile, nutritionIdsFromProfile, validateGuardian, validatePersonalFields } from './profileService.js';
import { formatTimestamp } from '../utils/time.js';

interface RemoteUser {
  id?: string;
  email?: string;
  suffix?: string;
  address?: string;
  updated_at?: string;
  profileLastUpdated?: string | null;
  [key: string]: unknown;
}

function field(user: RemoteUser | null | undefined, camel: string, snake: string) {
  const value = user?.[camel] ?? user?.[snake];
  return value == null ? '' : String(value);
}

export function profileFromAuthUser(
  user: RemoteUser | { id?: string } | null | undefined,
): Profile | null {
  if (!user?.id) return null;
  const row = user as RemoteUser;
  const updatedAt = row.updated_at || row.profileLastUpdated || null;
  return {
    id: user.id,
    accountFor: 'self' as const,
    firstName: field(row, 'firstName', 'first_name'),
    middleName: field(row, 'middleName', 'middle_name'),
    lastName: field(row, 'lastName', 'last_name'),
    suffix: row.suffix || '',
    contactNumber: field(row, 'contactNumber', 'contact_number'),
    email: row.email || '',
    address: row.address || '',
    healthConditions: [] as string[],
    dietaryRestrictions: [] as string[],
    allergies: [] as Allergy[],
    mealPreferences: { preferredCategories: [], dislikedIngredients: [] },
    nutritionalPreference: null as string | null,
    nutritionalPreferences: [] as string[],
    nutritionTargets: { calories: 0, protein: 0, fat: 0 },
    guardian: null as { name: string; relationship: string; contactNumber: string } | null,
    profileLastUpdated: updatedAt,
    profileLastUpdatedFormatted: formatTimestamp(updatedAt),
    history: [],
    pendingContactChange: null,
  };
}

export async function loadAccountProfile(user: RemoteUser | { id?: string } | null | undefined) {
  const local = user?.id ? getProfile(user.id) : null;
  if (local) return local;
  const base = profileFromAuthUser(user);
  if (!base || !isSupabaseConfigured) return base;

  try {
    const session = await ensureSession();
    if (!session?.access_token) return base;
    const client = requireSupabase();
    const authorization = `Bearer ${session.access_token}`;
    const [healthRes, prefRes, nutritionRes, guardianRes] = await Promise.all([
      client.from('client_health_items').select('item_type, value, reaction_note').eq('client_id', base.id).setHeader('Authorization', authorization),
      client.from('meal_preferences').select('preferred_categories, disliked_ingredients').eq('client_id', base.id).maybeSingle().setHeader('Authorization', authorization),
      client.from('nutritional_preferences').select('lower_calories, higher_protein, lower_sodium').eq('client_id', base.id).maybeSingle().setHeader('Authorization', authorization),
      client.from('guardians').select('name, relationship, contact_number').eq('client_id', base.id).maybeSingle().setHeader('Authorization', authorization),
    ]);
    const health = healthRes.data || [];
    base.healthConditions = health.filter((row) => row.item_type === 'condition').map((row) => row.value);
    base.dietaryRestrictions = health.filter((row) => row.item_type === 'restriction').map((row) => row.value);
    base.allergies = health.filter((row) => row.item_type === 'allergy').map((row) => ({
      name: row.value,
      note: row.reaction_note || '',
    }));
    if (prefRes.data) {
      base.mealPreferences = {
        preferredCategories: prefRes.data.preferred_categories || [],
        dislikedIngredients: prefRes.data.disliked_ingredients || [],
      };
    }
    if (nutritionRes.data) {
      const ids: string[] = [];
      if (nutritionRes.data.lower_calories) ids.push('lower-calories');
      if (nutritionRes.data.higher_protein) ids.push('higher-protein');
      if (nutritionRes.data.lower_sodium) ids.push('lower-sodium');
      base.nutritionalPreferences = ids;
      base.nutritionalPreference = ids[0] || null;
    }
    if (guardianRes.data) {
      base.guardian = {
        name: guardianRes.data.name,
        relationship: guardianRes.data.relationship,
        contactNumber: guardianRes.data.contact_number,
      };
    }
  } catch {
    return base;
  }
  return base;
}

async function withClient(): Promise<
  | { ok: false; messages: string[] }
  | { ok: true; client: SupabaseClient; token: string }
> {
  const session = await ensureSession();
  if (!session?.access_token) {
    return { ok: false, messages: ['Your session has expired. Please log in again.'] };
  }
  return { ok: true, client: requireSupabase(), token: session.access_token };
}

function failed(error: { message?: string } | null | undefined) {
  return { ok: false, messages: [error?.message || 'Could not save. Try again.'] };
}

/** USR-38: record one change on the signed-in account. A missing function must not block the save. */
async function logOwnChange(
  client: SupabaseClient,
  token: string,
  field: string,
  oldValue: string,
  newValue: string,
) {
  const previous = oldValue.trim();
  const next = newValue.trim();
  if (previous === next) return;
  await client
    .rpc('log_own_profile_change', { p_field: field, p_old: previous, p_new: next })
    .setHeader('Authorization', `Bearer ${token}`);
}

function listDiff(field: string, before: string[], after: string[]) {
  const prev = new Set(before.map((item) => item.trim()).filter(Boolean));
  const next = new Set(after.map((item) => item.trim()).filter(Boolean));
  const changes: Array<{ field: string; oldValue: string; newValue: string }> = [];
  for (const item of next) {
    if (!prev.has(item)) changes.push({ field, oldValue: '', newValue: item });
  }
  for (const item of prev) {
    if (!next.has(item)) changes.push({ field, oldValue: item, newValue: '' });
  }
  return changes;
}

async function replaceHealthItems(
  client: SupabaseClient,
  token: string,
  userId: string,
  itemType: string,
  rows: Array<Record<string, unknown>>,
) {
  const removed = await client
    .from('client_health_items')
    .delete()
    .eq('client_id', userId)
    .eq('item_type', itemType)
    .setHeader('Authorization', `Bearer ${token}`);
  if (removed.error) return failed(removed.error);
  if (!rows.length) return { ok: true };
  const inserted = await client
    .from('client_health_items')
    .insert(rows)
    .setHeader('Authorization', `Bearer ${token}`);
  if (inserted.error) return failed(inserted.error);
  return { ok: true };
}

/** Splits a health-condition edit into rows to add and conditions whose removal needs a Dietitian (DIT-17). */
export function planHealthChange(current: string[], next: string[]) {
  const key = (value: string) => value.trim().toLowerCase();
  const before = new Set(current.map(key));
  const after = new Set(next.map(key));
  return {
    add: next.filter((value) => !before.has(key(value))),
    remove: current.filter((value) => !after.has(key(value))),
  };
}

export function removalRequestedMessage(conditions: string[]) {
  return `Removing ${conditions.join(', ')} needs Dietitian approval. Your request was sent; the condition stays until it is approved.`;
}

export async function saveRemoteHealth(userId: string, conditions: string[] | null | undefined): Promise<ServiceResult> {
  const gate = await withClient();
  if (!gate.ok) return gate;
  const values = [...new Set((conditions || []).map((item) => String(item).trim()).filter(Boolean))];
  const existing = await gate.client
    .from('client_health_items')
    .select('value')
    .eq('client_id', userId)
    .eq('item_type', 'condition')
    .setHeader('Authorization', `Bearer ${gate.token}`);
  if (existing.error) return failed(existing.error);
  const plan = planHealthChange(((existing.data as { value: string }[] | null) || []).map((row) => row.value), values);
  if (plan.add.length) {
    const inserted = await gate.client
      .from('client_health_items')
      .insert(plan.add.map((value) => ({ client_id: userId, item_type: 'condition', value })))
      .setHeader('Authorization', `Bearer ${gate.token}`);
    if (inserted.error) return failed(inserted.error);
    for (const condition of plan.add) {
      await logOwnChange(gate.client, gate.token, 'Health condition', '', condition);
    }
  }
  for (const condition of plan.remove) {
    const requested = await gate.client
      .rpc('request_health_condition_removal', { p_condition: condition, p_reason: null })
      .setHeader('Authorization', `Bearer ${gate.token}`);
    if (requested.error) return failed(requested.error);
  }
  return { ok: true, message: plan.remove.length ? removalRequestedMessage(plan.remove) : MSG.healthSaved };
}

export async function saveRemoteDiet(userId: string, restrictions: string[] | null | undefined): Promise<ServiceResult> {
  const gate = await withClient();
  if (!gate.ok) return gate;
  const values = [...new Set((restrictions || []).map((item) => String(item).trim()).filter(Boolean))];
  const existing = await gate.client
    .from('client_health_items')
    .select('value')
    .eq('client_id', userId)
    .eq('item_type', 'restriction')
    .setHeader('Authorization', `Bearer ${gate.token}`);
  if (existing.error) return failed(existing.error);
  const before = ((existing.data as { value: string }[] | null) || []).map((row) => row.value);
  const result = await replaceHealthItems(
    gate.client,
    gate.token,
    userId,
    'restriction',
    values.map((value) => ({ client_id: userId, item_type: 'restriction', value })),
  );
  if (!result.ok) return result;
  for (const change of listDiff('Dietary restriction', before, values)) {
    await logOwnChange(gate.client, gate.token, change.field, change.oldValue, change.newValue);
  }
  return { ok: true, message: MSG.dietarySaved };
}

export async function saveRemoteAllergies(userId: string, allergies: Allergy[] | null | undefined): Promise<ServiceResult> {
  const gate = await withClient();
  if (!gate.ok) return gate;
  const existing = await gate.client
    .from('client_health_items')
    .select('value, reaction_note')
    .eq('client_id', userId)
    .eq('item_type', 'allergy')
    .setHeader('Authorization', `Bearer ${gate.token}`);
  if (existing.error) return failed(existing.error);
  const before = ((existing.data as { value: string; reaction_note: string | null }[] | null) || []);
  const rows = (allergies || [])
    .map((item) => ({
      client_id: userId,
      item_type: 'allergy',
      value: String(item.name || '').trim(),
      reaction_note: String(item.note || '').trim() || null,
    }))
    .filter((item) => item.value);
  const result = await replaceHealthItems(gate.client, gate.token, userId, 'allergy', rows);
  if (!result.ok) return result;
  const previous = new Map(before.map((row) => [row.value, row.reaction_note || '']));
  const next = new Map(rows.map((row) => [String(row.value), String(row.reaction_note || '')]));
  for (const [name, note] of next) {
    if (!previous.has(name)) {
      await logOwnChange(gate.client, gate.token, 'Food allergy', '', note ? `${name}: ${note}` : name);
    } else if ((previous.get(name) || '') !== note) {
      await logOwnChange(gate.client, gate.token, 'Food allergy', `${name}: ${previous.get(name) || 'none'}`, `${name}: ${note || 'none'}`);
    }
  }
  for (const [name, note] of previous) {
    if (!next.has(name)) {
      await logOwnChange(gate.client, gate.token, 'Food allergy', note ? `${name}: ${note}` : name, '');
    }
  }
  return { ok: true, message: MSG.allergiesSaved };
}

export async function saveRemoteMealPreferences(userId: string, prefs: Partial<MealPreferences>): Promise<ServiceResult> {
  const gate = await withClient();
  if (!gate.ok) return gate;
  const saved = await gate.client
    .from('meal_preferences')
    .upsert({
      client_id: userId,
      preferred_categories: prefs.preferredCategories || [],
      disliked_ingredients: prefs.dislikedIngredients || [],
    }, { onConflict: 'client_id' })
    .setHeader('Authorization', `Bearer ${gate.token}`);
  if (saved.error) return failed(saved.error);
  return { ok: true, message: MSG.mealPrefsSaved };
}

export async function saveRemoteNutrition(userId: string, preferenceIds: string[] | null | undefined): Promise<ServiceResult> {
  const gate = await withClient();
  if (!gate.ok) return gate;
  const ids = nutritionIdsFromProfile({ nutritionalPreferences: preferenceIds || [] });
  const saved = await gate.client
    .from('nutritional_preferences')
    .upsert({
      client_id: userId,
      lower_calories: ids.includes('lower-calories'),
      higher_protein: ids.includes('higher-protein'),
      lower_sodium: ids.includes('lower-sodium'),
    }, { onConflict: 'client_id' })
    .setHeader('Authorization', `Bearer ${gate.token}`);
  if (saved.error) return failed(saved.error);
  return { ok: true, message: MSG.nutritionalUpdated };
}

export async function saveRemoteGuardian(userId: string, input: GuardianInput): Promise<ServiceResult> {
  const validated = validateGuardian(input);
  if (!validated.ok) return validated;
  const gate = await withClient();
  if (!gate.ok) return gate;
  const removed = await gate.client
    .from('guardians')
    .delete()
    .eq('client_id', userId)
    .setHeader('Authorization', `Bearer ${gate.token}`);
  if (removed.error) return failed(removed.error);
  const inserted = await gate.client
    .from('guardians')
    .insert({
      client_id: userId,
      name: validated.values!.name,
      relationship: validated.values!.relationship || 'Family',
      contact_number: validated.values!.contactNumber,
    })
    .setHeader('Authorization', `Bearer ${gate.token}`);
  if (inserted.error) return failed(inserted.error);
  return { ok: true, message: MSG.guardianSaved };
}

export async function removeRemoteGuardian(userId: string): Promise<ServiceResult> {
  const gate = await withClient();
  if (!gate.ok) return gate;
  const removed = await gate.client
    .from('guardians')
    .delete()
    .eq('client_id', userId)
    .setHeader('Authorization', `Bearer ${gate.token}`);
  if (removed.error) return failed(removed.error);
  return { ok: true, message: MSG.guardianSaved };
}

export async function saveRemotePersonal(userId: string, input: PersonalInfoInput): Promise<ServiceResult> {
  const validated = validatePersonalFields(input);
  if (!validated.ok) return validated;
  const gate = await withClient();
  if (!gate.ok) return gate;
  // The login email changes only through Supabase's confirmation email; a trigger then copies it
  // to the profile (the profile email cannot be rewritten directly).
  const { data: current } = await gate.client.auth.getUser(gate.token);
  const nextEmail = String(validated.values.email || '').trim().toLowerCase();
  if (nextEmail && current?.user?.email && current.user.email.toLowerCase() !== nextEmail) {
    const changed = await gate.client.auth.updateUser({ email: nextEmail });
    if (changed.error) return failed(changed.error);
  }
  const stored = await gate.client
    .from('profiles')
    .select('first_name, middle_name, last_name, suffix, contact_number, address, email')
    .eq('id', userId)
    .setHeader('Authorization', `Bearer ${gate.token}`)
    .maybeSingle();
  if (stored.error) return failed(stored.error);
  const row = (stored.data || {}) as {
    first_name?: string | null;
    middle_name?: string | null;
    last_name?: string | null;
    suffix?: string | null;
    contact_number?: string | null;
    address?: string | null;
    email?: string | null;
  };
  const storedContact = String(row.contact_number || '');
  const nextContact = String(validated.values.contactNumber || '');
  const contactChanged = nextContact !== storedContact;
  const saved = await gate.client
    .from('profiles')
    .update({
      first_name: validated.values.firstName,
      middle_name: validated.values.middleName || null,
      last_name: validated.values.lastName,
      suffix: validated.values.suffix || null,
      ...(contactChanged ? {} : { contact_number: nextContact || null }),
      address: validated.values.address || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .setHeader('Authorization', `Bearer ${gate.token}`);
  if (saved.error) return failed(saved.error);
  const fields: Array<[string, string, string]> = [
    ['First name', String(row.first_name || ''), validated.values.firstName || ''],
    ['Middle name', String(row.middle_name || ''), validated.values.middleName || ''],
    ['Last name', String(row.last_name || ''), validated.values.lastName || ''],
    ['Suffix', String(row.suffix || ''), validated.values.suffix || ''],
    ['Address', String(row.address || ''), validated.values.address || ''],
  ];
  if (!contactChanged) {
    fields.push(['Contact number', storedContact, nextContact]);
  }
  for (const [field, previous, next] of fields) {
    await logOwnChange(gate.client, gate.token, field, previous, next);
  }
  if (contactChanged) {
    const email = String(row.email || current?.user?.email || '');
    return {
      ok: true,
      needsVerification: true,
      channel: 'email',
      phone: nextContact,
      email,
    } as ServiceResult & { needsVerification: true; channel: string; phone: string; email: string };
  }
  return { ok: true, message: MSG.profileUpdated, values: validated.values };
}

/** Writes a phone number only after the customer confirms the email code. */
export async function saveRemoteContact(userId: string, contactNumber: string): Promise<ServiceResult> {
  const gate = await withClient();
  if (!gate.ok) return gate;
  const stored = await gate.client
    .from('profiles')
    .select('contact_number')
    .eq('id', userId)
    .setHeader('Authorization', `Bearer ${gate.token}`)
    .maybeSingle();
  const previous = String((stored.data as { contact_number?: string } | null)?.contact_number || '');
  const saved = await gate.client
    .from('profiles')
    .update({ contact_number: contactNumber, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .setHeader('Authorization', `Bearer ${gate.token}`);
  if (saved.error) return failed(saved.error);
  await logOwnChange(gate.client, gate.token, 'Contact number', previous, contactNumber);
  return { ok: true, message: MSG.profileUpdated };
}

const HISTORY_FIELD_SECTION: Record<string, string> = {
  'Health condition': 'health',
  'Health conditions': 'health',
  'Dietary restriction': 'restrictions',
  'Food allergy': 'allergies',
  'First name': 'personal',
  'Middle name': 'personal',
  'Last name': 'personal',
  Suffix: 'personal',
  'Contact number': 'personal',
  Address: 'personal',
  Email: 'personal',
};

export async function loadRemoteChangeHistory(userId: string, actorFallback = '') {
  const gate = await withClient();
  if (!gate.ok) return [];
  const query = (columns: string) => gate.client
    .from('profile_change_history')
    .select(columns)
    .eq('client_id', userId)
    .order('changed_at', { ascending: false })
    .setHeader('Authorization', `Bearer ${gate.token}`);
  let result = await query('id, field_name, old_value, new_value, changed_at, actor_name');
  if (result.error) result = await query('id, field_name, old_value, new_value, changed_at');
  if (result.error || !result.data) return [];
  return (result.data as unknown as {
    id: string;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    changed_at: string;
    actor_name?: string | null;
  }[]).map((row) => {
    const previous = row.old_value || '';
    const next = row.new_value || '';
    const action = !previous && next ? 'added' : !next && previous ? 'removed' : 'updated';
    return {
      id: row.id,
      at: row.changed_at,
      section: HISTORY_FIELD_SECTION[row.field_name] || 'personal',
      item: action === 'updated' ? row.field_name : (next || previous),
      action,
      previousValue: previous,
      newValue: next,
      whoName: row.actor_name || actorFallback,
      role: 'client',
      formatted: '',
    };
  });
}

/** USR-50: a live account accepts the current terms version on their own profile. */
export async function acceptRemoteTerms(userId: string): Promise<ServiceResult> {
  const gate = await withClient();
  if (!gate.ok) return { ok: false, message: gate.messages[0] };
  const now = new Date().toISOString();
  const saved = await gate.client
    .from('profiles')
    .update({
      terms_accepted_at: now,
      terms_version: TERMS_VERSION,
      updated_at: now,
    })
    .eq('id', userId)
    .setHeader('Authorization', `Bearer ${gate.token}`);
  if (saved.error) return { ok: false, message: saved.error.message || MSG.acceptanceSaveFailed };
  return { ok: true, message: MSG.profileUpdated };
}

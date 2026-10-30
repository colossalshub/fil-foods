import { ensureSession, isSupabaseConfigured, requireSupabase } from '../lib/supabaseClient.js';
import { MSG } from '../data/messages.js';
import { getProfile, nutritionIdsFromProfile, validateGuardian, validatePersonalFields } from './profileService.js';
import { formatTimestamp } from '../utils/time.js';

function field(user, camel, snake) {
  const value = user?.[camel] ?? user?.[snake];
  return value == null ? '' : String(value);
}

export function profileFromAuthUser(user) {
  if (!user?.id) return null;
  const updatedAt = user.updated_at || user.profileLastUpdated || null;
  return {
    id: user.id,
    firstName: field(user, 'firstName', 'first_name'),
    middleName: field(user, 'middleName', 'middle_name'),
    lastName: field(user, 'lastName', 'last_name'),
    suffix: user.suffix || '',
    contactNumber: field(user, 'contactNumber', 'contact_number'),
    email: user.email || '',
    address: user.address || '',
    healthConditions: [],
    dietaryRestrictions: [],
    allergies: [],
    mealPreferences: { preferredCategories: [], dislikedIngredients: [] },
    nutritionalPreference: null,
    nutritionalPreferences: [],
    nutritionTargets: {},
    guardian: null,
    profileLastUpdated: updatedAt,
    profileLastUpdatedFormatted: formatTimestamp(updatedAt),
    history: [],
    pendingContactChange: null,
  };
}

export async function loadAccountProfile(user) {
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
      client.from('client_health_items').select('item_type, value, reaction_note').eq('client_id', user.id).setHeader('Authorization', authorization),
      client.from('meal_preferences').select('preferred_categories, disliked_ingredients').eq('client_id', user.id).maybeSingle().setHeader('Authorization', authorization),
      client.from('nutritional_preferences').select('lower_calories, higher_protein, lower_sodium').eq('client_id', user.id).maybeSingle().setHeader('Authorization', authorization),
      client.from('guardians').select('name, relationship, contact_number').eq('client_id', user.id).maybeSingle().setHeader('Authorization', authorization),
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
      const ids = [];
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

async function withClient() {
  const session = await ensureSession();
  if (!session?.access_token) {
    return { ok: false, messages: ['Your session has expired. Please log in again.'] };
  }
  return { ok: true, client: requireSupabase(), token: session.access_token };
}

function failed(error) {
  return { ok: false, messages: [error?.message || 'Could not save. Try again.'] };
}

async function replaceHealthItems(client, token, userId, itemType, rows) {
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

export async function saveRemoteHealth(userId, conditions) {
  const gate = await withClient();
  if (!gate.ok) return gate;
  const values = [...new Set((conditions || []).map((item) => String(item).trim()).filter(Boolean))];
  const result = await replaceHealthItems(
    gate.client,
    gate.token,
    userId,
    'condition',
    values.map((value) => ({ client_id: userId, item_type: 'condition', value })),
  );
  return result.ok ? { ok: true, message: MSG.healthSaved } : result;
}

export async function saveRemoteDiet(userId, restrictions) {
  const gate = await withClient();
  if (!gate.ok) return gate;
  const values = [...new Set((restrictions || []).map((item) => String(item).trim()).filter(Boolean))];
  const result = await replaceHealthItems(
    gate.client,
    gate.token,
    userId,
    'restriction',
    values.map((value) => ({ client_id: userId, item_type: 'restriction', value })),
  );
  return result.ok ? { ok: true, message: MSG.dietarySaved } : result;
}

export async function saveRemoteAllergies(userId, allergies) {
  const gate = await withClient();
  if (!gate.ok) return gate;
  const rows = (allergies || [])
    .map((item) => ({
      client_id: userId,
      item_type: 'allergy',
      value: String(item.name || '').trim(),
      reaction_note: String(item.note || '').trim() || null,
    }))
    .filter((item) => item.value);
  const result = await replaceHealthItems(gate.client, gate.token, userId, 'allergy', rows);
  return result.ok ? { ok: true, message: MSG.allergiesSaved } : result;
}

export async function saveRemoteMealPreferences(userId, prefs) {
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

export async function saveRemoteNutrition(userId, preferenceIds) {
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

export async function saveRemoteGuardian(userId, input) {
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
      name: validated.values.name,
      relationship: validated.values.relationship || 'Family',
      contact_number: validated.values.contactNumber,
    })
    .setHeader('Authorization', `Bearer ${gate.token}`);
  if (inserted.error) return failed(inserted.error);
  return { ok: true, message: MSG.guardianSaved };
}

export async function removeRemoteGuardian(userId) {
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

export async function saveRemotePersonal(userId, input) {
  const validated = validatePersonalFields(input);
  if (!validated.ok) return validated;
  const gate = await withClient();
  if (!gate.ok) return gate;
  const saved = await gate.client
    .from('profiles')
    .update({
      first_name: validated.values.firstName,
      middle_name: validated.values.middleName || null,
      last_name: validated.values.lastName,
      suffix: validated.values.suffix || null,
      contact_number: validated.values.contactNumber || null,
      email: validated.values.email,
      address: validated.values.address || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .setHeader('Authorization', `Bearer ${gate.token}`);
  if (saved.error) return failed(saved.error);
  return { ok: true, message: MSG.profileUpdated, values: validated.values };
}

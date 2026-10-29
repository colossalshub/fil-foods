// Profile rules for CLT-07 through CLT-14 and CLT-45. Screens call this module only.

import { getDb, nextId, stamp } from '../data/mockStore.js';
import { isValidContact, isValidEmail, trim } from '../domain/registration.js';
import { MSG } from '../data/messages.js';
import { formatTimestamp } from '../utils/time.js';
import { getUser, normalizeContact } from './authService.js';
import { sendCode, verifyCode } from './verificationService.js';
import {
  appendAuditEvent, assertClientOwns, requireRole, ROLES, verifyAuditChain,
} from './securityService.js';

export const HEALTH_CONDITIONS = [
  'Diabetes',
  'Hypertension',
  'Kidney disease',
  'Heart disease',
  'Other',
];

export const DIETARY_RESTRICTIONS = [
  'Low-sodium',
  'Low-sugar',
  'Soft diet',
  'Vegetarian',
  'Other',
];

export const ALLERGY_PRESETS = [
  'Peanuts',
  'Shellfish',
  'Eggs',
  'Milk',
  'Soy',
  'Gluten',
];

export const NUTRITIONAL_OPTIONS = [
  { id: 'lower-calories', label: 'Lower calories' },
  { id: 'higher-protein', label: 'Higher protein' },
  { id: 'lower-sodium', label: 'Lower sodium' },
];

const ALLERGEN_ALIASES = {
  Eggs: 'Egg',
  Milk: 'Dairy',
};

const HISTORY_SECTION_LABEL = {
  health: 'Health conditions',
  restrictions: 'Dietary restrictions',
  allergies: 'Food allergies',
  nutrition: 'Nutritional preferences',
};

function sameEmail(a, b) {
  return trim(a).toLowerCase() === trim(b).toLowerCase();
}

function pushOnce(list, message) {
  if (message && !list.includes(message)) list.push(message);
}

function ensureProfileFields(user) {
  if (!user.address) user.address = '';
  if (!user.healthConditions) user.healthConditions = [];
  if (!user.dietaryRestrictions) user.dietaryRestrictions = [];
  if (!user.allergies) user.allergies = [];
  if (!user.mealPreferences) user.mealPreferences = { preferredCategories: [], dislikedIngredients: [] };
  if (!user.mealPreferences.preferredCategories) user.mealPreferences.preferredCategories = [];
  if (!user.mealPreferences.dislikedIngredients) user.mealPreferences.dislikedIngredients = [];
  if (user.nutritionalPreference === undefined) user.nutritionalPreference = null;
  if (!Array.isArray(user.nutritionalPreferences)) {
    user.nutritionalPreferences = user.nutritionalPreference ? [user.nutritionalPreference] : [];
  }
  if (!user.nutritionTargets) user.nutritionTargets = { calories: 0, protein: 0, fat: 0 };
  if (user.guardian === undefined) user.guardian = null;
  if (!user.profileHistory) user.profileHistory = [];
  if (user.pendingContactChange === undefined) user.pendingContactChange = null;
}

function touchProfile(user) {
  user.profileLastUpdated = stamp();
}

function displayName(user) {
  const parts = [user.firstName, user.middleName, user.lastName, user.suffix].map(trim).filter(Boolean);
  return parts.join(' ') || user.username || 'Client';
}

function appendHistory(user, entry) {
  const row = {
    id: nextId('hist'),
    at: stamp(),
    whoName: displayName(user),
    role: 'client',
    previousValue: entry.previousValue ?? '',
    newValue: entry.newValue ?? entry.item ?? '',
    ...entry,
  };
  user.profileHistory.unshift(row);
  appendAuditEvent(getDb(), {
    action: 'record.updated',
    userId: user.id,
    targetId: user.id,
    metadata: {
      section: row.section,
      change: row.action,
      item: row.item,
    },
    at: row.at,
  });
}

export function formatHistoryLine(entry) {
  const section = HISTORY_SECTION_LABEL[entry.section] || entry.section;
  const actionWord = entry.action === 'removed' ? 'removed' : entry.action === 'updated' ? 'updated' : 'added';
  return `${formatTimestamp(entry.at)}, ${entry.whoName} (${entry.role}): ${section}, ${actionWord} ${entry.item}`;
}

function diffListHistory(user, section, before, after) {
  const prev = new Set(before);
  const next = new Set(after);
  const previousValue = before.join(', ');
  const newValue = after.join(', ');
  for (const item of next) {
    if (!prev.has(item)) appendHistory(user, { section, action: 'added', item, previousValue, newValue });
  }
  for (const item of prev) {
    if (!next.has(item)) appendHistory(user, { section, action: 'removed', item, previousValue, newValue });
  }
}

function diffAllergyHistory(user, before, after) {
  const prevNames = new Set((before || []).map((a) => a.name));
  const nextNames = new Set((after || []).map((a) => a.name));
  for (const name of nextNames) {
    if (!prevNames.has(name)) appendHistory(user, { section: 'allergies', action: 'added', item: name });
  }
  for (const name of prevNames) {
    if (!nextNames.has(name)) appendHistory(user, { section: 'allergies', action: 'removed', item: name });
  }
}

export function validatePersonalFields(input) {
  const firstName = trim(input.firstName);
  const lastName = trim(input.lastName);
  const email = trim(input.email);
  const contactNumber = normalizeContact(input.contactNumber);
  const messages = [];
  const fields = {};

  if (!firstName || !lastName || !email) {
    pushOnce(messages, MSG.required);
    if (!firstName) fields.firstName = true;
    if (!lastName) fields.lastName = true;
    if (!email) fields.email = true;
  }

  if (contactNumber && !isValidContact(contactNumber)) {
    pushOnce(messages, MSG.invalidContact);
    fields.contactNumber = true;
  }

  if (email && !isValidEmail(email)) {
    pushOnce(messages, MSG.invalidEmail);
    fields.email = true;
  }

  return {
    ok: messages.length === 0,
    messages,
    fields,
    values: {
      firstName,
      middleName: trim(input.middleName),
      lastName,
      suffix: trim(input.suffix),
      contactNumber,
      email,
      address: trim(input.address),
    },
  };
}

function duplicateContact(userId, contactNumber) {
  return contactNumber && isValidContact(contactNumber)
    && getDb().users.some((item) => item.id !== userId && item.contactNumber === contactNumber);
}

function duplicateEmail(userId, email) {
  return email && isValidEmail(email)
    && getDb().users.some((item) => item.id !== userId && item.email && sameEmail(item.email, email));
}

export function getProfile(userId) {
  const user = getUser(userId);
  if (!user) return null;
  ensureProfileFields(user);
  return {
    id: user.id,
    firstName: user.firstName,
    middleName: user.middleName || '',
    lastName: user.lastName,
    suffix: user.suffix || '',
    contactNumber: user.contactNumber,
    email: user.email,
    address: user.address,
    healthConditions: [...user.healthConditions],
    dietaryRestrictions: [...user.dietaryRestrictions],
    allergies: user.allergies.map((a) => ({ ...a })),
    mealPreferences: {
      preferredCategories: [...user.mealPreferences.preferredCategories],
      dislikedIngredients: [...user.mealPreferences.dislikedIngredients],
    },
    nutritionalPreference: user.nutritionalPreference,
    nutritionalPreferences: [...user.nutritionalPreferences],
    nutritionTargets: { ...user.nutritionTargets },
    guardian: user.guardian ? { ...user.guardian } : null,
    profileLastUpdated: user.profileLastUpdated,
    profileLastUpdatedFormatted: formatTimestamp(user.profileLastUpdated),
    history: user.profileHistory.map((h) => ({ ...h, formatted: formatHistoryLine(h) })),
    pendingContactChange: user.pendingContactChange,
  };
}

export function getProfileForMeals(userId) {
  const profile = getProfile(userId);
  if (!profile) return null;
  return {
    dietaryRestrictions: profile.dietaryRestrictions,
    allergies: profile.allergies,
    mealPreferences: profile.mealPreferences,
    nutritionalPreference: profile.nutritionalPreference,
    nutritionalPreferences: profile.nutritionalPreferences,
    nutritionTargets: profile.nutritionTargets,
  };
}

/**
 * Save name, address, and unchanged contact/email. Contact or email changes require verification first.
 */
export function savePersonalInfo(userId, input) {
  const user = getUser(userId);
  if (!user) return { ok: false, messages: [MSG.required], fields: {} };

  const validated = validatePersonalFields(input);
  if (!validated.ok) {
    return { ok: false, messages: validated.messages, fields: validated.fields };
  }

  const { values } = validated;
  if (duplicateContact(userId, values.contactNumber)) {
    return { ok: false, messages: [MSG.duplicateUser], fields: { contactNumber: true } };
  }
  if (duplicateEmail(userId, values.email)) {
    return { ok: false, messages: [MSG.duplicateEmail], fields: { email: true } };
  }

  const contactChanged = values.contactNumber !== user.contactNumber;
  const emailChanged = !sameEmail(values.email, user.email);

  if (contactChanged || emailChanged) {
    user.pendingContactChange = {
      contactNumber: contactChanged ? values.contactNumber : null,
      email: emailChanged ? values.email : null,
      firstName: values.firstName,
      middleName: values.middleName,
      lastName: values.lastName,
      suffix: values.suffix,
      address: values.address,
    };
    const channel = contactChanged ? 'sms' : 'email';
    return {
      ok: false,
      needsVerification: true,
      channel,
      purpose: 'contact',
      phone: contactChanged ? values.contactNumber : user.contactNumber,
      email: emailChanged ? values.email : user.email,
    };
  }

  ensureProfileFields(user);
  user.firstName = values.firstName;
  user.middleName = values.middleName;
  user.lastName = values.lastName;
  user.suffix = values.suffix;
  user.address = values.address;
  touchProfile(user);
  return { ok: true, message: MSG.profileUpdated };
}

export function applyPersonalFieldsWithoutVerification(userId, input) {
  const user = getUser(userId);
  if (!user) return { ok: false, messages: [MSG.required] };
  const validated = validatePersonalFields(input);
  if (!validated.ok) return { ok: false, messages: validated.messages, fields: validated.fields };

  const contactChanged = validated.values.contactNumber !== user.contactNumber;
  const emailChanged = !sameEmail(validated.values.email, user.email);
  if (contactChanged || emailChanged) {
    return { ok: false, needsVerification: true };
  }

  ensureProfileFields(user);
  Object.assign(user, {
    firstName: validated.values.firstName,
    middleName: validated.values.middleName,
    lastName: validated.values.lastName,
    suffix: validated.values.suffix,
    address: validated.values.address,
  });
  touchProfile(user);
  return { ok: true, message: MSG.profileUpdated };
}

export function beginContactVerification(userId, channel) {
  return sendCode({ userId, channel, purpose: 'contact' });
}

export function verifyContactChange({ userId, code }) {
  const user = getUser(userId);
  if (!user?.pendingContactChange) {
    return verifyCode({ userId, purpose: 'contact', code });
  }

  const beforeContact = user.contactNumber;
  const beforeEmail = user.email;
  const result = verifyCode({ userId, purpose: 'contact', code });
  if (!result.ok) {
    return result;
  }

  const pending = user.pendingContactChange;
  const latest = getDb().codes
    .filter((item) => item.userId === userId && item.purpose === 'contact' && item.used)
    .sort((a, b) => b.createdAtMs - a.createdAtMs)[0];

  ensureProfileFields(user);
  user.firstName = pending.firstName;
  user.middleName = pending.middleName;
  user.lastName = pending.lastName;
  user.suffix = pending.suffix;
  user.address = pending.address;

  if (latest?.channel === 'sms' && pending.contactNumber) {
    user.contactNumber = pending.contactNumber;
    pending.contactNumber = null;
  }
  if (latest?.channel === 'email' && pending.email) {
    user.email = pending.email;
    pending.email = null;
  }

  const stillPending = pending.contactNumber || pending.email;
  if (!stillPending) {
    user.pendingContactChange = null;
    touchProfile(user);
    return { ok: true, message: MSG.profileUpdated, complete: true };
  }

  user.pendingContactChange = pending;
  const nextChannel = pending.contactNumber ? 'sms' : 'email';
  return {
    ok: true,
    message: MSG.profileUpdated,
    complete: false,
    nextChannel,
    phone: pending.contactNumber || beforeContact,
    email: pending.email || beforeEmail,
  };
}

export function cancelPendingContactChange(userId) {
  const user = getUser(userId);
  if (user) user.pendingContactChange = null;
}

export function saveHealthConditions(userId, conditions) {
  const user = getUser(userId);
  if (!user) return { ok: false, messages: [MSG.required] };
  ensureProfileFields(user);
  const next = [...new Set((conditions || []).map(trim).filter(Boolean))];
  diffListHistory(user, 'health', user.healthConditions, next);
  user.healthConditions = next;
  touchProfile(user);
  return { ok: true, message: MSG.healthSaved };
}

export function saveDietaryRestrictions(userId, restrictions) {
  const user = getUser(userId);
  if (!user) return { ok: false, messages: [MSG.required] };
  ensureProfileFields(user);
  const next = [...new Set((restrictions || []).map(trim).filter(Boolean))];
  diffListHistory(user, 'restrictions', user.dietaryRestrictions, next);
  user.dietaryRestrictions = next;
  touchProfile(user);
  return { ok: true, message: MSG.dietarySaved };
}

export function saveAllergies(userId, allergies) {
  const user = getUser(userId);
  if (!user) return { ok: false, messages: [MSG.required] };
  ensureProfileFields(user);
  const next = (allergies || [])
    .map((item) => ({ name: trim(item.name), note: trim(item.note) }))
    .filter((item) => item.name);
  diffAllergyHistory(user, user.allergies, next);
  user.allergies = next;
  touchProfile(user);
  return { ok: true, message: MSG.allergiesSaved };
}

export function saveMealPreferences(userId, prefs) {
  const user = getUser(userId);
  if (!user) return { ok: false, messages: [MSG.required] };
  ensureProfileFields(user);
  user.mealPreferences = {
    preferredCategories: [...new Set((prefs?.preferredCategories || []).map(trim).filter(Boolean))],
    dislikedIngredients: [...new Set((prefs?.dislikedIngredients || []).map(trim).filter(Boolean))],
  };
  touchProfile(user);
  return { ok: true, message: MSG.mealPrefsSaved };
}

export function nutritionIdsFromProfile(profile) {
  if (Array.isArray(profile?.nutritionalPreferences) && profile.nutritionalPreferences.length) {
    return profile.nutritionalPreferences;
  }
  return profile?.nutritionalPreference ? [profile.nutritionalPreference] : [];
}

export function saveNutritionalPreference(userId, preferenceId, targets) {
  const user = getUser(userId);
  if (!user) return { ok: false, messages: [MSG.required] };
  ensureProfileFields(user);
  const allowed = NUTRITIONAL_OPTIONS.map((item) => item.id);
  const incoming = Array.isArray(preferenceId) ? preferenceId : (preferenceId ? [preferenceId] : []);
  const ids = incoming.filter((id) => allowed.includes(id));
  const previousValue = user.nutritionalPreferences.join(', ');
  user.nutritionalPreferences = ids;
  user.nutritionalPreference = ids[0] || null;
  if (targets) {
    user.nutritionTargets = {
      calories: Math.max(0, Number(targets.calories) || 0),
      protein: Math.max(0, Number(targets.protein) || 0),
      fat: Math.max(0, Number(targets.fat) || 0),
    };
  }
  appendHistory(user, {
    section: 'nutrition',
    action: 'updated',
    item: ids.join(', ') || 'cleared',
    previousValue,
    newValue: ids.join(', '),
  });
  touchProfile(user);
  return { ok: true, message: MSG.nutritionalUpdated };
}

export function mealMatchesNutritionalPreferences(meal, profile) {
  const ids = nutritionIdsFromProfile(profile);
  if (!ids.length) return true;
  return ids.every((id) => nutritionalPreferenceBonus(meal, id) > 0);
}

export function validateGuardian(input) {
  const name = trim(input.name);
  const contactNumber = normalizeContact(input.contactNumber);
  if (!name || !contactNumber) {
    return { ok: false, messages: [MSG.guardianRequired], fields: { name: !name, contactNumber: !contactNumber } };
  }
  if (!isValidContact(contactNumber)) {
    return { ok: false, messages: [MSG.invalidContact], fields: { contactNumber: true } };
  }
  return {
    ok: true,
    values: {
      name,
      relationship: trim(input.relationship),
      contactNumber,
    },
  };
}

export function saveGuardian(userId, input) {
  const validated = validateGuardian(input);
  if (!validated.ok) return validated;
  const user = getUser(userId);
  if (!user) return { ok: false, messages: [MSG.required] };
  ensureProfileFields(user);
  user.guardian = validated.values;
  touchProfile(user);
  return { ok: true, message: MSG.guardianSaved };
}

export function removeGuardian(userId) {
  const user = getUser(userId);
  if (!user) return { ok: false, messages: [MSG.required] };
  ensureProfileFields(user);
  user.guardian = null;
  touchProfile(user);
  return { ok: true, message: MSG.guardianSaved };
}

export function isAuditChainIntact() {
  return verifyAuditChain(getDb().auditLog);
}

export function readChangeHistory(sessionUserId, ownerId) {
  assertClientOwns(sessionUserId, ownerId);
  return getChangeHistory(ownerId);
}

export function getGuardianForAdmin(actor, clientId) {
  requireRole(actor, ROLES.ADMIN);
  const user = getUser(clientId);
  if (!user) return null;
  ensureProfileFields(user);
  return user.guardian ? { ...user.guardian } : null;
}

export function getChangeHistory(userId) {
  const user = getUser(userId);
  if (!user) return [];
  ensureProfileFields(user);
  return user.profileHistory.map((entry) => ({
    ...entry,
    formatted: formatHistoryLine(entry),
  }));
}

export function mealAllergensForProfile(allergyName) {
  const mapped = ALLERGEN_ALIASES[allergyName];
  return mapped ? [allergyName, mapped] : [allergyName];
}

export function allergenConflict(meal, profile) {
  if (!meal?.allergens?.length || !profile?.allergies?.length) return false;
  const mealSet = new Set(meal.allergens);
  for (const allergy of profile.allergies) {
    for (const tag of mealAllergensForProfile(allergy.name)) {
      if (mealSet.has(tag)) return true;
    }
  }
  return false;
}

export function mealRestrictionMatch(meal, profile) {
  if (!profile?.dietaryRestrictions?.length) return false;
  const tags = meal.dietaryTags || [];
  return profile.dietaryRestrictions.some((r) => tags.includes(r));
}

function nutritionalPreferenceBonus(meal, preferenceId) {
  if (!preferenceId) return 0;
  if (preferenceId === 'lower-calories' && meal.calories <= 400) return 1;
  if (preferenceId === 'higher-protein' && (meal.protein >= 25 || meal.diets?.includes('High-protein'))) return 1;
  if (preferenceId === 'lower-sodium' && (meal.sodium <= 500 || meal.dietaryTags?.includes('Low-sodium'))) return 1;
  return 0;
}

export function rankMeal(meal, profile) {
  if (!profile) return 0;
  if (allergenConflict(meal, profile)) return null;

  let score = 0;
  const prefs = profile.mealPreferences || {};
  for (const cat of prefs.preferredCategories || []) {
    if ((meal.mealCategories || []).includes(cat)) score += 3;
  }
  for (const restriction of profile.dietaryRestrictions || []) {
    if ((meal.dietaryTags || []).includes(restriction)) score += 2;
  }
  const nutritionBonus = nutritionIdsFromProfile(profile)
    .some((id) => nutritionalPreferenceBonus(meal, id) > 0);
  if (nutritionBonus) score += 1;

  for (const disliked of prefs.dislikedIngredients || []) {
    const needle = disliked.toLowerCase();
    if ((meal.ingredients || []).some((ing) => ing.toLowerCase().includes(needle))) {
      score -= 3;
    }
  }
  return score;
}

export function compareMealsForProfile(a, b, profile) {
  const rankA = rankMeal(a, profile);
  const rankB = rankMeal(b, profile);
  const conflictA = rankA === null;
  const conflictB = rankB === null;
  if (conflictA !== conflictB) return conflictA ? 1 : -1;
  if (conflictA && conflictB) return a.name.localeCompare(b.name);
  if (rankB !== rankA) return rankB - rankA;
  return a.name.localeCompare(b.name);
}

export function sortMealsForProfile(meals, profile) {
  if (!profile) return [...meals];
  return [...meals].sort((a, b) => compareMealsForProfile(a, b, profile));
}

export function filterMealsByNutritionalPreference(meals, preferenceId) {
  if (!preferenceId) return [...meals];
  const list = [...meals];
  if (preferenceId === 'lower-calories') {
    return list.sort((a, b) => a.calories - b.calories || a.name.localeCompare(b.name));
  }
  if (preferenceId === 'higher-protein') {
    return list.sort((a, b) => (b.protein || 0) - (a.protein || 0) || a.name.localeCompare(b.name));
  }
  if (preferenceId === 'lower-sodium') {
    return list.sort((a, b) => (a.sodium || 0) - (b.sodium || 0) || a.name.localeCompare(b.name));
  }
  return list;
}

export function orderMealsForUser(meals, profile) {
  if (!profile) return meals;
  let ordered = sortMealsForProfile(meals, profile);
  if (profile.nutritionalPreference) {
    const pref = profile.nutritionalPreference;
    const safe = ordered.filter((m) => !allergenConflict(m, profile));
    const conflicts = ordered.filter((m) => allergenConflict(m, profile));
    const sortedSafe = filterMealsByNutritionalPreference(safe, pref);
    ordered = [...sortedSafe, ...conflicts];
  }
  return ordered;
}

// Tests only: history entries cannot be removed through the public API.
export function __testOnlyAppendHistory(userId, entry) {
  const user = getUser(userId);
  if (!user) return;
  ensureProfileFields(user);
  appendHistory(user, entry);
}

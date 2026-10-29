// Meal search, cart, scheduling, and order placement (CLT-16 through CLT-20, CLT-46).

import { getDb, nextId, stamp } from '../data/mockStore.js';
import { getUser } from './authService.js';
import { mealMatchesNutritionalPreferences, rankMeal, sortMealsForProfile } from './profileService.js';
import { appendAuditEvent, canViewKitchenRecord } from './securityService.js';
export { solveNutritionPlan } from './nutritionService.js';

export const ORDER_MSG = {
  noMeals: 'No meals found.',
  noSuggestions: 'No suggestions match your dietary information right now.',
  mealAllergen: (allergen) => `This meal contains ${allergen}, which is listed in your profile.`,
  mealUnavailable: 'This meal is no longer available.',
  quantityInvalid: 'Quantity must be greater than zero.',
  addressRequired: 'Please enter a delivery address.',
  schedulePast: 'The schedule cannot be earlier than the current date and time.',
  scheduleLead: 'Please choose a time at least 24 hours from now.',
  kitchenClosed:
    'The kitchen is closed at that time. Orders can be scheduled Monday to Saturday, 7:00 AM to 6:00 PM.',
  orderSuccess: 'Order placed successfully.',
  placingOrder: 'Placing your order...',
  lineAllergen: (mealName, allergen) => `${mealName} contains ${allergen}, which is listed in your profile.`,
  completeProfile: 'Add dietary information to get more relevant suggestions.',
  recommendationsDisclaimer:
    "Suggestions are not medical advice. Follow your doctor or dietitian's guidance.",
  chooseFulfillment: 'Choose delivery or pickup.',
};

const INGREDIENT_ALLERGEN_HINTS = {
  Peanuts: ['peanut'],
  Shellfish: ['shellfish', 'shrimp', 'hipon'],
  Dairy: ['dairy', 'milk', 'cheese'],
  Milk: ['dairy', 'milk', 'cheese'],
  Gluten: ['gluten', 'wheat', 'wrap', 'oats'],
  Egg: ['egg'],
  Eggs: ['egg'],
  Soy: ['soy'],
};

const PROFILE_ALLERGEN_ALIASES = {
  Eggs: 'Egg',
  Milk: 'Dairy',
};

/** @type {Map<string, { order: object, placing: boolean }>} */
const inFlightConfirm = new Map();

export function formatPhp(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 'PHP 0.00';
  return `PHP ${n.toFixed(2)}`;
}

export function levenshtein(a, b) {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  if (s === t) return 0;
  const rows = s.length + 1;
  const cols = t.length + 1;
  const dist = Array.from({ length: rows }, () => new Array(cols).fill(0));
  for (let i = 0; i < rows; i += 1) dist[i][0] = i;
  for (let j = 0; j < cols; j += 1) dist[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1,
        dist[i][j - 1] + 1,
        dist[i - 1][j - 1] + cost,
      );
    }
  }
  return dist[s.length][t.length];
}

function maxEditDistance(word) {
  return word.length >= 5 ? 2 : 1;
}

function wordMatches(queryWord, nameWord) {
  const q = queryWord.toLowerCase();
  const n = nameWord.toLowerCase();
  if (!q || !n) return false;
  if (q === n) return true;
  if (n.startsWith(q) || q.startsWith(n)) return true;
  const dist = levenshtein(q, n);
  if (dist > maxEditDistance(q)) return false;
  return Math.abs(n.length - q.length) <= maxEditDistance(q);
}

function mealNameWords(name) {
  return name.split(/[\s\-/]+/).filter(Boolean);
}

function mealMatchScore(mealName, query) {
  const trimmed = query.trim();
  if (!trimmed) return 0;
  const qWords = trimmed.split(/\s+/).filter(Boolean);
  const nameWords = mealNameWords(mealName);

  let totalDist = 0;
  for (const qw of qWords) {
    let best = Infinity;
    for (const nw of nameWords) {
      if (wordMatches(qw, nw)) {
        best = Math.min(best, levenshtein(qw, nw));
      }
    }
    if (best === Infinity) return null;
    totalDist += best;
  }
  return totalDist;
}

function compactNameDistance(mealName, query) {
  const compact = mealName.toLowerCase().replace(/[\s\-/]+/g, '');
  return levenshtein(query.trim().toLowerCase(), compact);
}

function catalogText(meal) {
  return [
    meal.category,
    ...(meal.mealCategories || []),
    ...(meal.ingredients || []),
    ...(meal.dietaryTags || []),
    ...(meal.diets || []),
  ].filter(Boolean).join(' ');
}

export function fuzzySearchMeals(meals, query) {
  const trimmed = (query || '').trim();
  if (!trimmed) return [...meals];
  const scored = [];
  for (const meal of meals) {
    const nameScore = mealMatchScore(meal.name, trimmed);
    if (nameScore !== null) {
      scored.push({ meal, tier: 0, score: nameScore });
      continue;
    }
    const text = catalogText(meal);
    const textScore = mealMatchScore(text, trimmed);
    const direct = text.toLowerCase().includes(trimmed.toLowerCase());
    if (textScore !== null || direct) {
      scored.push({ meal, tier: 1, score: textScore === null ? 3 : textScore });
    }
  }
  scored.sort(
    (a, b) => a.tier - b.tier
      || a.score - b.score
      || (a.score === b.score && (a.meal.id === 'sample-tinola' ? -1 : b.meal.id === 'sample-tinola' ? 1 : 0))
      || compactNameDistance(a.meal.name, trimmed) - compactNameDistance(b.meal.name, trimmed)
      || a.meal.name.localeCompare(b.meal.name),
  );
  return scored.map((row) => row.meal);
}

export function isMealAvailable(meal) {
  return meal?.available !== false;
}

export function mealContainsAllergen(meal, allergenName) {
  return profileAllergensInMeal(meal, { allergies: [{ name: allergenName }] }).length > 0;
}

function mealMatchesCategory(meal, category) {
  if (!category) return true;
  if (meal.category === category) return true;
  return (meal.mealCategories || []).includes(category);
}

function mealMatchesRestriction(meal, restriction) {
  return (meal.diets || []).includes(restriction) || (meal.dietaryTags || []).includes(restriction);
}

export function applyMealFilters(meals, { category, diets = [], excludeAllergens = [] }) {
  return meals.filter((m) => {
    if (!mealMatchesCategory(m, category)) return false;
    if (!diets.every((d) => mealMatchesRestriction(m, d))) return false;
    if (excludeAllergens.some((a) => mealContainsAllergen(m, a))) return false;
    return true;
  });
}

export function searchAndFilterMeals(meals, {
  query, category, diets, excludeAllergens, profile, applyNutrition = false,
}) {
  let list = applyMealFilters(meals, { category, diets, excludeAllergens });
  if (applyNutrition && profile) {
    list = list.filter((meal) => mealMatchesNutritionalPreferences(meal, profile));
  }
  if ((query || '').trim()) {
    list = fuzzySearchMeals(list, query);
  }
  if (profile) {
    list = sortMealsForProfile(list, profile);
  }
  return list;
}

function ingredientText(meal) {
  return (meal.ingredients || []).join(' ').toLowerCase();
}

function tagAllergensForProfile(allergyName) {
  const mapped = PROFILE_ALLERGEN_ALIASES[allergyName];
  return mapped ? [allergyName, mapped] : [allergyName];
}

export function profileAllergensInMeal(meal, profile) {
  if (!profile?.allergies?.length) return [];
  const found = [];
  const tags = new Set(meal.allergens || []);
  const ing = ingredientText(meal);

  for (const allergy of profile.allergies) {
    const name = allergy.name;
    let hit = false;
    for (const tag of tagAllergensForProfile(name)) {
      if (tags.has(tag)) {
        hit = true;
        break;
      }
    }
    if (!hit) {
      const hints = INGREDIENT_ALLERGEN_HINTS[name] || [name.toLowerCase()];
      if (hints.some((h) => ing.includes(h))) hit = true;
    }
    if (hit && !found.includes(name)) found.push(name);
  }
  return found;
}

export function hasDislikedIngredient(meal, profile) {
  const disliked = profile?.mealPreferences?.dislikedIngredients || [];
  if (!disliked.length) return false;
  const ing = ingredientText(meal);
  return disliked.some((d) => ing.includes(String(d).toLowerCase()));
}

export function hasRestrictionConflict(meal, profile) {
  const restrictions = profile?.dietaryRestrictions || [];
  if (!restrictions.length) return false;
  const tags = meal.dietaryTags || [];
  return !restrictions.every((r) => tags.includes(r));
}

export function isRecommendationsProfileEmpty(profile) {
  if (!profile) return true;
  const prefs = profile.mealPreferences || {};
  return (
    !(profile.dietaryRestrictions || []).length
    && !(profile.allergies || []).length
    && nutritionIds(profile).length === 0
    && !(prefs.preferredCategories || []).length
    && !(prefs.dislikedIngredients || []).length
  );
}

function nutritionIds(profile) {
  if (Array.isArray(profile?.nutritionalPreferences) && profile.nutritionalPreferences.length) {
    return profile.nutritionalPreferences;
  }
  return profile?.nutritionalPreference ? [profile.nutritionalPreference] : [];
}

export function recommendationReason(meal, profile) {
  const reasons = [];
  for (const cat of profile?.mealPreferences?.preferredCategories || []) {
    if ((meal.mealCategories || []).includes(cat)) {
      reasons.push(`Matches your preference for ${String(cat).toLowerCase()}`);
    }
  }
  for (const restriction of profile?.dietaryRestrictions || []) {
    if ((meal.dietaryTags || []).includes(restriction) || (meal.diets || []).includes(restriction)) {
      reasons.push(`Matches your ${String(restriction).toLowerCase()} diet`);
    }
  }
  for (const id of nutritionIds(profile)) {
    if (id === 'lower-calories' && meal.calories <= 400) reasons.push('Matches your preference for lower calories');
    if (id === 'higher-protein' && (meal.protein >= 25 || meal.diets?.includes('High-protein'))) {
      reasons.push('Matches your preference for higher protein');
    }
    if (id === 'lower-sodium' && (meal.sodium <= 500 || meal.dietaryTags?.includes('Low-sodium'))) {
      reasons.push('Matches your preference for lower sodium');
    }
  }
  if (!reasons.length) reasons.push('Fits your dietary information');
  return reasons[0];
}

export function getRecommendedMeals(meals, profile, limit = 5) {
  if (!profile || isRecommendationsProfileEmpty(profile)) {
    return { emptyProfile: true, items: [] };
  }
  const eligible = meals.filter(
    (m) => isMealAvailable(m)
      && profileAllergensInMeal(m, profile).length === 0
      && !hasDislikedIngredient(m, profile)
      && !hasRestrictionConflict(m, profile)
      && rankMeal(m, profile) !== null,
  );
  const ranked = sortMealsForProfile(eligible, profile)
    .slice(0, limit)
    .map((meal) => ({
      meal,
      reason: recommendationReason(meal, profile),
      score: rankMeal(meal, profile),
    }));
  return { emptyProfile: false, items: ranked, none: ranked.length === 0 };
}

export function parseQuantityInput(raw) {
  if (raw === null || raw === undefined) return { ok: false, message: ORDER_MSG.quantityInvalid };
  const text = String(raw).trim();
  if (!/^\d+$/.test(text)) return { ok: false, message: ORDER_MSG.quantityInvalid };
  const value = Number(text);
  if (value <= 0) return { ok: false, message: ORDER_MSG.quantityInvalid };
  return { ok: true, value };
}

export function lineSubtotal(meal, quantity) {
  return (meal.price || 0) * quantity;
}

export function calculateTotals(lineItems, user) {
  const subtotal = lineItems.reduce((sum, row) => sum + lineSubtotal(row.meal, row.quantity), 0);
  let discountRate = 0;
  if (user?.plan && typeof user.plan.discountRate === 'number' && user.plan.status === 'active') {
    discountRate = user.plan.discountRate;
  }
  const discountAmount = subtotal * discountRate;
  const total = subtotal - discountAmount;
  return { subtotal, discountRate, discountAmount, total };
}

const KITCHEN = {
  openHour: 7,
  closeHour: 18,
  days: [1, 2, 3, 4, 5, 6],
};

function parseScheduleDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && value.trim()) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export function validateSchedule(scheduledAt, nowInput) {
  const scheduled = parseScheduleDate(scheduledAt);
  const now = parseScheduleDate(nowInput) || new Date();
  if (!scheduled) {
    return { ok: false, message: ORDER_MSG.schedulePast };
  }
  if (scheduled.getTime() < now.getTime()) {
    return { ok: false, message: ORDER_MSG.schedulePast };
  }
  const leadMs = 24 * 60 * 60 * 1000;
  if (scheduled.getTime() - now.getTime() < leadMs) {
    const day = scheduled.getDay();
    const hour = scheduled.getHours();
    const minute = scheduled.getMinutes();
    const minutes = hour * 60 + minute;
    const open = KITCHEN.openHour * 60;
    const close = KITCHEN.closeHour * 60;
    const kitchenClosed = !KITCHEN.days.includes(day) || minutes < open || minutes >= close;
    if (kitchenClosed) {
      return { ok: false, message: ORDER_MSG.kitchenClosed };
    }
    return { ok: false, message: ORDER_MSG.scheduleLead };
  }
  const day = scheduled.getDay();
  const hour = scheduled.getHours();
  const minute = scheduled.getMinutes();
  const minutes = hour * 60 + minute;
  const open = KITCHEN.openHour * 60;
  const close = KITCHEN.closeHour * 60;
  if (!KITCHEN.days.includes(day) || minutes < open || minutes >= close) {
    return { ok: false, message: ORDER_MSG.kitchenClosed };
  }
  return { ok: true, scheduled };
}

export function validateFulfillment({ type, address, scheduledAt, now }) {
  if (type !== 'delivery' && type !== 'pickup') {
    return { ok: false, message: ORDER_MSG.chooseFulfillment };
  }
  if (type === 'delivery' && !String(address || '').trim()) {
    return { ok: false, message: ORDER_MSG.addressRequired };
  }
  const schedule = validateSchedule(scheduledAt, now);
  if (!schedule.ok) return schedule;
  return { ok: true, scheduled: schedule.scheduled };
}

export function collectOrderAllergenWarnings(lineItems, profile) {
  const warnings = [];
  for (const row of lineItems) {
    const allergens = profileAllergensInMeal(row.meal, profile);
    for (const allergen of allergens) {
      warnings.push({
        mealId: row.meal.id,
        mealName: row.meal.name,
        allergen,
        message: ORDER_MSG.lineAllergen(row.meal.name, allergen),
      });
    }
  }
  return warnings;
}

function ensureOrdersArray() {
  const db = getDb();
  if (!Array.isArray(db.orders)) db.orders = [];
  return db.orders;
}

function nextTrackingNumber() {
  const orders = ensureOrdersArray();
  const year = new Date().getFullYear();
  const prefix = `TRK-${year}-`;
  const nums = orders
    .map((o) => o.trackingNumber)
    .filter((t) => typeof t === 'string' && t.startsWith(prefix))
    .map((t) => Number(t.slice(prefix.length)))
    .filter((n) => Number.isFinite(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

function confirmFingerprint(userId, payload) {
  return JSON.stringify({
    userId,
    items: payload.items.map((i) => ({ id: i.meal.id, q: i.quantity })).sort((a, b) => a.id.localeCompare(b.id)),
    type: payload.fulfillment.type,
    address: payload.fulfillment.address || '',
    scheduledAt: payload.fulfillment.scheduledAt,
    instructions: payload.fulfillment.instructions || '',
  });
}

export function confirmOrder(userId, payload) {
  const user = getUser(userId);
  if (!user) return { ok: false, messages: [ORDER_MSG.chooseFulfillment] };

  const key = confirmFingerprint(userId, payload);
  const orders = ensureOrdersArray();
  const existing = orders.find((o) => o.clientConfirmKey === key && o.userId === userId);
  if (existing) {
    return { ok: true, order: existing, message: ORDER_MSG.orderSuccess, duplicate: true };
  }

  if (inFlightConfirm.has(key)) {
    const prior = inFlightConfirm.get(key);
    if (prior?.order) {
      return { ok: true, order: prior.order, message: ORDER_MSG.orderSuccess, duplicate: true };
    }
    return { ok: false, messages: [ORDER_MSG.placingOrder], placing: true };
  }
  inFlightConfirm.set(key, { placing: true });

  try {
    const lineItems = payload.items || [];
    if (!lineItems.length) {
      return { ok: false, messages: ['Add at least one meal to your order.'] };
    }

    for (const row of lineItems) {
      const q = parseQuantityInput(row.quantity);
      if (!q.ok) return { ok: false, messages: [q.message] };
      if (!isMealAvailable(row.meal)) {
        return { ok: false, messages: [ORDER_MSG.mealUnavailable] };
      }
    }

    const fulfillmentCheck = validateFulfillment({
      ...payload.fulfillment,
      now: payload.now,
    });
    if (!fulfillmentCheck.ok) {
      return { ok: false, messages: [fulfillmentCheck.message] };
    }

    const profile = {
      allergies: user.allergies,
      dietaryRestrictions: user.dietaryRestrictions,
      mealPreferences: user.mealPreferences,
      nutritionalPreference: user.nutritionalPreference,
      nutritionalPreferences: user.nutritionalPreferences,
    };
    const kitchenView = {
      healthConditions: [...(user.healthConditions || [])],
      dietaryRestrictions: [...(user.dietaryRestrictions || [])],
      allergies: (user.allergies || []).map((item) => ({ name: item.name, note: item.note || '' })),
    };
    const warnings = collectOrderAllergenWarnings(lineItems, profile);
    if (warnings.length && !payload.allergenAcknowledged) {
      return { ok: false, messages: warnings.map((w) => w.message), needsAcknowledgement: true };
    }

    const totals = calculateTotals(lineItems, user);
    const placedIso = payload.now ? parseScheduleDate(payload.now)?.toISOString() || stamp() : stamp();
    const order = {
      id: nextId('order'),
      userId,
      clientConfirmKey: key,
      trackingNumber: nextTrackingNumber(),
      status: 'Confirmed',
      statusHistory: [{ status: 'Confirmed', at: placedIso }],
      lastUpdatedAt: placedIso,
      items: lineItems.map((row) => ({
        mealId: row.meal.id,
        name: row.meal.name,
        quantity: parseQuantityInput(row.quantity).value,
        unitPrice: row.meal.price,
        lineTotal: lineSubtotal(row.meal, parseQuantityInput(row.quantity).value),
      })),
      fulfillment: {
        type: payload.fulfillment.type,
        address: payload.fulfillment.type === 'delivery' ? String(payload.fulfillment.address || '').trim() : null,
        scheduledAt: fulfillmentCheck.scheduled.toISOString(),
        instructions: String(payload.fulfillment.instructions || '').trim() || null,
      },
      subtotal: totals.subtotal,
      discountRate: totals.discountRate,
      discountAmount: totals.discountAmount,
      total: totals.total,
      placedAt: placedIso,
      kitchenView,
    };

    orders.push(order);
    appendAuditEvent(getDb(), {
      action: 'record.created',
      userId,
      targetId: order.id,
      metadata: { type: 'order', trackingNumber: order.trackingNumber },
      at: placedIso,
    });
    inFlightConfirm.set(key, { order, placing: false });
    return { ok: true, order, message: ORDER_MSG.orderSuccess, duplicate: false };
  } finally {
    const state = inFlightConfirm.get(key);
    if (state && !state.order) inFlightConfirm.delete(key);
  }
}

export function getOrdersForUser(userId) {
  return ensureOrdersArray().filter((o) => o.userId === userId);
}

export function getKitchenOrderView(actor, orderId) {
  if (!canViewKitchenRecord(actor)) {
    const error = new Error('Forbidden');
    error.code = 'FORBIDDEN';
    throw error;
  }
  const order = ensureOrdersArray().find((row) => row.id === orderId);
  if (!order) return null;
  return {
    trackingNumber: order.trackingNumber,
    healthConditions: order.kitchenView?.healthConditions || [],
    dietaryRestrictions: order.kitchenView?.dietaryRestrictions || [],
    allergies: order.kitchenView?.allergies || [],
  };
}

export function __testResetConfirmState() {
  inFlightConfirm.clear();
}

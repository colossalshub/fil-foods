import { PROFILE_DIET_OPTIONS } from '../constants/profileFormOptions.js';
import { MEALS } from '../data/meals.js';
import { HOME_COPY } from '../data/messages.js';
import type { Meal, MealMatchProfile } from '../types';

/** Lunch and dinner choices are stored under the protein or vegetable style. */
const CHOICE_NAMES = new Set(['Beef', 'Pork', 'Chicken', 'Fish', 'Steamed', 'Stir-fried', 'Pinakbet']);

export function mealCardCopy(meal: { name?: string; description?: string }) {
  const name = (meal.name || '').trim() || 'Meal';
  const description = (meal.description || '').trim();
  if (CHOICE_NAMES.has(name) && description) {
    const parts = description.split(/\s+with\s+/i);
    if (parts.length > 1) {
      const title = parts[0].replace(/[.\s]+$/, '');
      let detail = parts.slice(1).join(' with ').replace(/[.\s]+$/, '');
      detail = detail.charAt(0).toUpperCase() + detail.slice(1);
      return { title, description: `${detail}.` };
    }
    return { title: description.replace(/[.\s]+$/, ''), description };
  }
  return { title: name, description };
}

export function profileMatchLabels(profile: MealMatchProfile | null | undefined) {
  if (!profile) return [];
  const labels: string[] = [];
  for (const allergy of profile.allergies || []) {
    const name = allergy.name?.trim();
    if (!name) continue;
    labels.push(name.toLowerCase().includes('allergy') ? name : `${name} allergy`);
  }
  for (const condition of profile.healthConditions || []) {
    if (condition.trim()) labels.push(condition.trim());
  }
  for (const restriction of profile.dietaryRestrictions || []) {
    const text = restriction.trim();
    if (!text) continue;
    labels.push(PROFILE_DIET_OPTIONS.includes(text) ? text : `${text} (doctor)`);
  }
  return labels;
}

/** One sentence in place of the profile chip box and the suitability badge. */
export function matchedProfileLine(
  profile: MealMatchProfile | null | undefined,
  recipientName?: string | null,
) {
  const labels = profileMatchLabels(profile);
  if (!labels.length) return '';
  const details = labels.map((label) => label.toLowerCase()).join(', ');
  const name = recipientName?.trim();
  if (name) return HOME_COPY.matchedToName(name, details);
  return HOME_COPY.matchedToYour(details);
}

export function recentOrderedMeals<T extends { mealId?: string; name: string }>(
  orders: Array<{ placedAt?: string; items?: T[] | null }>,
  limit = 3,
) {
  const cap = Math.min(3, Math.max(0, limit));
  const sorted = [...orders].sort(
    (a, b) => new Date(b.placedAt || 0).getTime() - new Date(a.placedAt || 0).getTime(),
  );
  const seen = new Set<string>();
  const meals: T[] = [];
  for (const order of sorted) {
    for (const item of order.items || []) {
      const key = String(item.mealId || item.name || '').trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      meals.push(item);
      if (meals.length >= cap) return meals;
    }
  }
  return meals;
}

export function mealFromHistory(item: { mealId?: string; name: string; customizationLabel?: string }): Meal {
  const catalog = MEALS.find((meal) => (item.mealId && meal.id === item.mealId) || meal.name === item.name);
  if (!catalog) {
    return {
      id: item.mealId || item.name,
      name: item.name,
      description: item.customizationLabel || undefined,
    };
  }
  if (item.name && item.name !== catalog.name) {
    return {
      ...catalog,
      name: item.name,
      description: item.customizationLabel || catalog.description,
    };
  }
  return catalog;
}

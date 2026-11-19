// USR-51. One optional special request per selected meal. Fee amounts come from settings.

import { SPECIAL_REQUEST_COPY } from '../data/messages.js';
import { getDb } from '../data/mockStore.js';
import type { SpecialRequest } from '../types';

export const SPECIAL_REQUEST_NOTE_LIMIT = 150;

/** Quoted quick options from USR-51. Additional meat changes the fee; it does not add a second fee. */
export const SPECIAL_REQUEST_OPTIONS = [
  'Less salt',
  'Less oil',
  'No onions',
  'No garlic',
  'Extra soft',
  'Cut into small pieces',
  'Sauce on the side',
] as const;

export const ADDITIONAL_MEAT = 'Additional meat';

export const DEFAULT_SPECIAL_REQUEST_FEE = 85;
export const DEFAULT_ADDITIONAL_MEAT_FEE = 145;

const ALLERGEN_HINTS: Record<string, string[]> = {
  peanuts: ['peanut'],
  shellfish: ['shrimp', 'hipon'],
  dairy: ['milk', 'cheese'],
  milk: ['dairy', 'cheese'],
  gluten: ['wheat', 'flour'],
  egg: ['eggs'],
  eggs: ['egg'],
  soy: ['soya'],
};

export interface SpecialRequestDraft {
  options: string[];
  note: string;
}

export function specialRequestFeeSettings() {
  const settings = getDb().settings;
  const standard = Number(settings?.specialRequestFee);
  const additionalMeat = Number(settings?.additionalMeatFee);
  return {
    standard: Number.isFinite(standard) && standard >= 0 ? standard : DEFAULT_SPECIAL_REQUEST_FEE,
    additionalMeat: Number.isFinite(additionalMeat) && additionalMeat >= 0 ? additionalMeat : DEFAULT_ADDITIONAL_MEAT_FEE,
  };
}

export function cleanSpecialRequest(request: SpecialRequestDraft | null | undefined): SpecialRequestDraft | null {
  if (!request) return null;
  const allowed = new Set<string>([...SPECIAL_REQUEST_OPTIONS, ADDITIONAL_MEAT]);
  const options = request.options.filter((option, index) => allowed.has(option) && request.options.indexOf(option) === index);
  const note = request.note.replace(/\s+/g, ' ').trim();
  if (!options.length && !note) return null;
  return { options, note };
}

export function feeForSpecialRequest(request: SpecialRequestDraft | null | undefined) {
  const cleaned = cleanSpecialRequest(request);
  if (!cleaned) return 0;
  const fees = specialRequestFeeSettings();
  return cleaned.options.includes(ADDITIONAL_MEAT) ? fees.additionalMeat : fees.standard;
}

export function specialRequestLabel(request: SpecialRequestDraft | null | undefined) {
  const cleaned = cleanSpecialRequest(request);
  if (!cleaned) return '';
  return [...cleaned.options, cleaned.note].filter(Boolean).join('. ');
}

function noteAddsAllergen(note: string, allergies: Array<{ name?: string }>) {
  const text = note.toLowerCase();
  if (!text) return false;
  return allergies.some((allergy) => {
    const name = String(allergy.name || '').trim().toLowerCase();
    if (!name) return false;
    const hints = [name, ...(ALLERGEN_HINTS[name] || [])];
    return hints.some((hint) => hint.length >= 3 && text.includes(hint));
  });
}

export function validateSpecialRequest(
  request: SpecialRequestDraft | null | undefined,
  allergies: Array<{ name?: string }> = [],
): { ok: true } | { ok: false; message: string } {
  const cleaned = cleanSpecialRequest(request);
  if (!cleaned) return { ok: true };
  if (request && request.note.trim().length > SPECIAL_REQUEST_NOTE_LIMIT) {
    return { ok: false, message: SPECIAL_REQUEST_COPY.tooLong };
  }
  if (noteAddsAllergen(cleaned.note, allergies)) {
    return { ok: false, message: SPECIAL_REQUEST_COPY.allergen };
  }
  return { ok: true };
}

/** Snapshot the fee that applies right now, so a later settings change does not rewrite this request. */
export function snapshotSpecialRequest(
  request: SpecialRequestDraft | null | undefined,
): SpecialRequest | undefined {
  const cleaned = cleanSpecialRequest(request);
  if (!cleaned) return undefined;
  return { ...cleaned, fee: feeForSpecialRequest(cleaned) };
}

export function preparationNote(mealTime: string, mealName: string, request: SpecialRequestDraft | null | undefined) {
  const label = specialRequestLabel(request);
  if (!label) return '';
  return `${mealTime}: ${mealName} — ${label}`;
}

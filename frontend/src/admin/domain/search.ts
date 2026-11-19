import type { OrderStatus } from '../types';
import { bestWordMatch, levenshtein, normalizeText, osaDistance } from '../../lib/algorithms/stringMatch.js';

export interface SearchableOrder {
  id: string;
  customerName: string;
  status: string;
  placedAt: string;
  orderNo?: number | null;
  orderRef?: string;
  trackingNumber?: string;
}

/** Digits searched for an order: its ORD-/TRK- reference digits, else the #00000 number. Typing
 * "0350", "ORD-2026-0350" or "TRK-2026-0350" finds ORD-2026-0350 (revised USR-13 AC 4). */
function orderDigits(order: SearchableOrder) {
  const refs = [order.orderRef, order.trackingNumber].filter(Boolean).map((ref) => String(ref).replace(/\D/g, ''));
  const number = typeof order.orderNo === 'number' ? String(order.orderNo).padStart(5, '0') : order.id;
  return [...refs, number].join(' ');
}

/** Ignore capital letters, accents and extra spaces (ADM-11). */
export function fold(value: string) {
  return normalizeText(value);
}

/** Order search uses the shared OSA matcher; Levenshtein is re-exported for comparison tests. */
export { levenshtein, osaDistance };

/**
 * Exact or partial name matches rank before spelling-corrected ones (ADM-11).
 * Typo tolerance uses OSA, so one swapped pair of letters counts as one mistake.
 */
function wordMatch(query: string, nameWords: string[]) {
  return bestWordMatch(query, nameWords, { distance: osaDistance, partial: 'contains' });
}

function newest(left: SearchableOrder, right: SearchableOrder) {
  return right.placedAt.localeCompare(left.placedAt);
}

export function searchOrders<T extends SearchableOrder>(
  orders: T[],
  query: string,
  status: 'All' | OrderStatus,
) {
  return searchOrdersWhere(orders, query, (order) => status === 'All' || order.status === status);
}

/** Same search with any filter (staff buckets). Only `customerName` is searched, so callers pass
 * first names for Kitchen and Delivery Staff (KIT-11 #3). */
export function searchOrdersWhere<T extends SearchableOrder>(
  orders: T[],
  query: string,
  keep: (order: T) => boolean,
) {
  const statused = orders.filter(keep);
  const folded = fold(query);
  if (folded.length < 2) return [...statused].sort(newest);

  const compact = folded.replace(/[#\s-]/g, '').replace(/^(ord|trk)/, '');
  if (/^\d+$/.test(compact)) {
    return statused.filter((order) => orderDigits(order).includes(compact)).sort(newest);
  }

  const words = folded.split(' ').filter(Boolean);
  const ranked: { order: T; tier: number }[] = [];
  for (const order of statused) {
    const nameWords = fold(order.customerName).split(' ').filter(Boolean);
    let tier = 0;
    let matched = true;
    for (const word of words) {
      const kind = wordMatch(word, nameWords);
      if (!kind) {
        matched = false;
        break;
      }
      if (kind === 'typo') tier = 1;
    }
    if (matched) ranked.push({ order, tier });
  }
  ranked.sort((left, right) => left.tier - right.tier || newest(left.order, right.order));
  return ranked.map((row) => row.order);
}

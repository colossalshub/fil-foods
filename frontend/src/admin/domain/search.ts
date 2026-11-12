import type { OrderStatus } from '../types';

export interface SearchableOrder {
  id: string;
  customerName: string;
  status: string;
  placedAt: string;
}

export function fold(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function levenshtein(left: string, right: string) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost,
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function typoBudget(word: string) {
  if (word.length <= 2) return 0;
  if (word.length <= 5) return 1;
  return 2;
}

function wordMatch(query: string, nameWords: string[]) {
  if (nameWords.some((word) => word === query)) return 'exact' as const;
  if (nameWords.some((word) => word.includes(query))) return 'partial' as const;
  const budget = typoBudget(query);
  if (!budget) return null;
  for (const word of nameWords) {
    if (Math.abs(word.length - query.length) > budget) continue;
    if (levenshtein(query, word) <= budget) return 'typo' as const;
  }
  return null;
}

function newest(left: SearchableOrder, right: SearchableOrder) {
  return right.placedAt.localeCompare(left.placedAt);
}

export function searchOrders<T extends SearchableOrder>(
  orders: T[],
  query: string,
  status: 'All' | OrderStatus,
) {
  const statused = orders.filter((order) => status === 'All' || order.status === status);
  const folded = fold(query);
  if (folded.length < 2) return [...statused].sort(newest);

  const compact = folded.replace(/[#\s]/g, '');
  if (/^\d+$/.test(compact)) {
    return statused.filter((order) => order.id.includes(compact)).sort(newest);
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

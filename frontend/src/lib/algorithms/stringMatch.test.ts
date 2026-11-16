import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bestWordMatch,
  fuzzyWordMatch,
  levenshtein,
  normalizeText,
  osaDistance,
  substringMatch,
  textWords,
  typoBudget,
} from './stringMatch.js';
import { searchOrders } from '../../admin/domain/search.js';
import { fuzzySearchMeals } from '../../user/services/orderService.js';
import { searchFaq } from '../../user/data/helpContent.js';
import { searchClientOrders } from '../../user/services/trackingService.js';
import { MEALS } from '../../user/data/meals.js';

test('substringMatch ignores case, accents and extra spaces', () => {
  assert.equal(substringMatch('How do I reset my password?', '  PASSWORD '), true);
  assert.equal(substringMatch('Sinigang na Baboy', 'na bab'), true);
  assert.equal(substringMatch('Peña Santos', 'pena'), true);
  assert.equal(substringMatch('Chicken Tinola', 'chikcen'), false);
  assert.equal(substringMatch('anything', ''), true);
});

test('normalizeText and textWords prepare text for matching', () => {
  assert.equal(normalizeText('  Ána   GARCIA '), 'ana garcia');
  assert.deepEqual(textWords('Ampalaya Stir-fry, 2x'), ['ampalaya', 'stir', 'fry', '2x']);
});

test('levenshtein counts insert, delete and replace', () => {
  assert.equal(levenshtein('', ''), 0);
  assert.equal(levenshtein('abc', ''), 3);
  assert.equal(levenshtein('', 'abc'), 3);
  assert.equal(levenshtein('kitten', 'sitting'), 3);
  assert.equal(levenshtein('mria', 'maria'), 1);
  assert.equal(levenshtein('villanueba', 'villanueva'), 1);
});

test('osaDistance counts one adjacent swap as one edit (Levenshtein counts two)', () => {
  const swaps: [string, string][] = [
    ['chikcen', 'chicken'],
    ['carols', 'carlos'],
    ['jhon', 'john'],
    ['ab', 'ba'],
    ['tinloa', 'tinola'],
  ];
  for (const [typed, stored] of swaps) {
    assert.equal(osaDistance(typed, stored), 1, `${typed} -> ${stored}`);
    assert.equal(levenshtein(typed, stored), 2, `${typed} -> ${stored} (Levenshtein)`);
  }
});

test('osaDistance matches Levenshtein when there is no swap', () => {
  const pairs: [string, string][] = [
    ['kitten', 'sitting'], ['mria', 'maria'], ['delivry', 'delivery'], ['', 'abc'], ['same', 'same'],
  ];
  for (const [a, b] of pairs) assert.equal(osaDistance(a, b), levenshtein(a, b), `${a} -> ${b}`);
});

test('osaDistance is restricted: a swapped pair cannot be edited again', () => {
  // True Damerau distance is 2 (ca -> ac -> abc); OSA must give 3.
  assert.equal(osaDistance('ca', 'abc'), 3);
  assert.equal(osaDistance('abc', 'ca'), 3);
});

test('typoBudget follows the spec: 0 for 1-2 letters, 1 for 3-5, 2 for 6+', () => {
  assert.deepEqual(['ab', 'abc', 'abcde', 'abcdef'].map(typoBudget), [0, 1, 1, 2]);
});

test('fuzzyWordMatch tiers: exact, partial, typo, none', () => {
  assert.equal(fuzzyWordMatch('maria', 'maria'), 'exact');
  assert.equal(fuzzyWordMatch('mar', 'maria'), 'partial');
  assert.equal(fuzzyWordMatch('jhon', 'john'), 'typo');
  assert.equal(fuzzyWordMatch('jhon', 'john', { distance: levenshtein }), null);
  assert.equal(fuzzyWordMatch('jon', 'juan'), null);
  assert.equal(fuzzyWordMatch('xy', 'yx'), null);
  assert.equal(fuzzyWordMatch('chi', 'chicken', { partial: 'none' }), null);
  assert.equal(fuzzyWordMatch('chick', 'chicken', { partial: 'prefix' }), 'partial');
  assert.equal(bestWordMatch('mar', ['mark', 'mar']), 'exact');
  assert.equal(bestWordMatch('nothing', ['chicken', 'adobo']), null);
});

test('meal, FAQ and admin order search all accept a swapped pair of letters', () => {
  assert.equal(fuzzySearchMeals(MEALS, 'chikcen tinloa')[0]?.name, 'Chicken Tinola');
  assert.ok(searchFaq('pasowrd').some((item) => /password/i.test(item.question)));
  const orders = [
    { id: '00349', customerName: 'Maria Santos', status: 'Preparing', placedAt: '2026-11-02' },
    { id: '00350', customerName: 'Jhon Dela Cruz', status: 'Pending', placedAt: '2026-11-03' },
  ];
  assert.deepEqual(searchOrders(orders, 'John', 'All').map((order) => order.id), ['00350']);
  assert.deepEqual(searchOrders(orders, '00359', 'All'), []);
});

test('client order search: tracking number first, then meals, then OSA typos', () => {
  const orders = [
    { id: 'a', trackingNumber: 'TRK-2026-0001', meals: 'Chicken Tinola, Grilled Bangus', status: 'Delivered' },
    { id: 'b', trackingNumber: 'TRK-2026-0002', meals: 'Ampalaya Stir-fry', status: 'Preparing' },
    { id: 'c', trackingNumber: 'TRK-2026-0013', meals: 'Chicken Satay', status: 'Pending' },
  ];
  const ids = (query: string) => searchClientOrders(orders, query).map((order) => order.id);
  assert.deepEqual(ids(''), ['a', 'b', 'c']);
  assert.deepEqual(ids('trk-2026-0001'), ['a']);
  assert.deepEqual(ids('TRK20260002'), ['b']);
  assert.deepEqual(ids('001'), ['a', 'c']);
  assert.deepEqual(ids('0009'), [], 'tracking numbers are never spelling-corrected');
  assert.deepEqual(ids('ampalaya'), ['b']);
  assert.deepEqual(ids('chikcen'), ['a', 'c']);
  assert.deepEqual(ids('satya chikcen'), ['c']);
  assert.deepEqual(ids('preparing'), ['b']);
  assert.deepEqual(ids('zzzz'), []);
});

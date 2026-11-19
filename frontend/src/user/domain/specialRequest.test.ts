import assert from 'node:assert/strict';
import test from 'node:test';
import { getDb, resetStore } from '../data/mockStore.js';
import { SPECIAL_REQUEST_COPY } from '../data/messages.js';
import {
  feeForSpecialRequest,
  snapshotSpecialRequest,
  validateSpecialRequest,
} from './specialRequest.js';

test('USR-51: a special request adds ₱85, and Additional meat replaces that with ₱145', () => {
  resetStore();
  assert.equal(feeForSpecialRequest(null), 0);
  assert.equal(feeForSpecialRequest({ options: ['Less salt', 'Cut into small pieces'], note: 'Please make the meat extra tender.' }), 85);
  assert.equal(feeForSpecialRequest({ options: ['Additional meat', 'Less salt'], note: '' }), 145);
  assert.equal(feeForSpecialRequest({ options: ['Additional meat'], note: '' }), 145);
});

test('USR-51: the note stops at 150 characters and cannot add a recorded allergen', () => {
  const longNote = 'a'.repeat(151);
  const tooLong = validateSpecialRequest({ options: [], note: longNote });
  assert.equal(tooLong.ok, false);
  if (!tooLong.ok) assert.equal(tooLong.message, SPECIAL_REQUEST_COPY.tooLong);
  const peanuts = validateSpecialRequest(
    { options: ['Less salt'], note: 'Add peanuts on top.' },
    [{ name: 'Peanuts' }],
  );
  assert.equal(peanuts.ok, false);
  if (!peanuts.ok) assert.equal(peanuts.message, SPECIAL_REQUEST_COPY.allergen);
  assert.equal(validateSpecialRequest({ options: ['No onions'], note: '' }, [{ name: 'Peanuts' }]).ok, true);
});

test('USR-51: a saved request keeps the fee from settings at the time it was saved', () => {
  resetStore();
  const saved = snapshotSpecialRequest({ options: ['Less salt'], note: '' });
  assert.equal(saved?.fee, 85);
  getDb().settings.specialRequestFee = 120;
  assert.equal(feeForSpecialRequest({ options: ['Less salt'], note: '' }), 120);
  assert.equal(saved?.fee, 85);
});

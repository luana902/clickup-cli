import test from 'node:test';
import assert from 'node:assert/strict';

import { parseDateInput } from '../src/utils/date-input.mjs';

function fixedNow() {
  return new Date(2026, 2, 13, 10, 30, 0, 0);
}

test('parseDateInput resolves natural language dates', () => {
  const today = parseDateInput('today', fixedNow);
  assert.equal(today.getFullYear(), 2026);
  assert.equal(today.getMonth(), 2);
  assert.equal(today.getDate(), 13);
  assert.equal(today.getHours(), 23);

  const tomorrow = parseDateInput('tomorrow', fixedNow);
  assert.equal(tomorrow.getDate(), 14);

  const nextFriday = parseDateInput('friday', fixedNow);
  assert.equal(nextFriday.getDate(), 20);
});

test('parseDateInput resolves date offsets and explicit dates', () => {
  const future = parseDateInput('+3d', fixedNow);
  assert.equal(future.getDate(), 16);

  const explicit = parseDateInput('2026-04-02', fixedNow);
  assert.equal(explicit.getFullYear(), 2026);
  assert.equal(explicit.getMonth(), 3);
  assert.equal(explicit.getDate(), 2);
  assert.equal(explicit.getHours(), 23);
});

test('parseDateInput supports clearing and rejects invalid strings', () => {
  assert.equal(parseDateInput('clear', fixedNow), null);
  assert.throws(() => parseDateInput('definitely-not-a-date', fixedNow), /Could not parse date/);
});

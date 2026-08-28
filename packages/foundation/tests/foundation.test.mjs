import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ApplicationError,
  FixedClock,
  MoneyError,
  QuantityError,
  ValidationError,
  addMoney,
  assertSupportedLocale,
  bidiIsolate,
  compareMoney,
  convertQuantity,
  directionForLocale,
  formatDateTime,
  formatMoney,
  formatNumber,
  fromUtcIsoString,
  money,
  quantity,
  requireNonBlank,
  requirePositiveSafeInteger,
  requireUuid,
  roundMoney,
  toSafeErrorDescriptor,
  toUtcIsoString,
} from '../dist/index.js';

test('canonical error exposes safe descriptor without internal diagnostic message/details', () => {
  const error = new ApplicationError({
    code: 'CATALOG_NOT_FOUND', category: 'not-found', message: 'Internal database detail',
    safeMessageKey: 'errors.catalog.notFound', field: 'id', details: { sqlState: 'hidden' },
  });
  const safe = toSafeErrorDescriptor(error, 'corr-1');
  assert.deepEqual(safe, { code: 'CATALOG_NOT_FOUND', category: 'not-found', messageKey: 'errors.catalog.notFound', field: 'id', correlationId: 'corr-1' });
  assert.equal('message' in safe, false);
  assert.equal('details' in safe, false);
});

test('validation helpers normalize valid values and return structured ValidationError for invalid input', () => {
  assert.equal(requireNonBlank('  TAYMEX  ', 'name'), 'TAYMEX');
  assert.equal(requireUuid('550E8400-E29B-41D4-A716-446655440000', 'id'), '550e8400-e29b-41d4-a716-446655440000');
  assert.equal(requirePositiveSafeInteger(5, 'page'), 5);
  assert.throws(() => requireNonBlank('   ', 'name'), (error) => error instanceof ValidationError && error.issues[0].field === 'name');
});

test('FixedClock clones mutable Date state and UTC helpers enforce canonical UTC form', () => {
  const input = new Date('2026-08-28T12:00:00.000Z');
  const clock = new FixedClock(input);
  input.setUTCFullYear(2030);
  const first = clock.now();
  first.setUTCFullYear(2040);
  assert.equal(clock.now().toISOString(), '2026-08-28T12:00:00.000Z');
  assert.equal(toUtcIsoString(clock.now()), '2026-08-28T12:00:00.000Z');
  assert.equal(fromUtcIsoString('2026-08-28T12:00:00.000Z').toISOString(), '2026-08-28T12:00:00.000Z');
  assert.throws(() => fromUtcIsoString('2026-08-28T15:00:00+03:00'));
});

test('money preserves exact decimal representation and never requires binary float arithmetic', () => {
  const a = money('001.2300', 'usd', { maxScale: 6, allowNegative: false });
  const b = money('2.3', 'USD', { maxScale: 6, allowNegative: false });
  assert.deepEqual(a, { amount: '1.2300', currency: 'USD' });
  assert.deepEqual(addMoney(a, b), { amount: '3.5300', currency: 'USD' });
  assert.equal(compareMoney(a, b), -1);
  assert.throws(() => addMoney(a, money('1', 'EUR')), MoneyError);
  assert.throws(() => money('1.1234567', 'USD', { maxScale: 6 }), MoneyError);
  assert.throws(() => money('-1', 'USD', { allowNegative: false }), MoneyError);
});

test('money rounding modes are explicit and deterministic at midpoint values', () => {
  assert.equal(roundMoney(money('1.005', 'USD'), 2, 'HALF_UP').amount, '1.01');
  assert.equal(roundMoney(money('1.005', 'USD'), 2, 'HALF_EVEN').amount, '1.00');
  assert.equal(roundMoney(money('1.015', 'USD'), 2, 'HALF_EVEN').amount, '1.02');
  assert.equal(roundMoney(money('-1.001', 'USD'), 2, 'DOWN').amount, '-1.00');
  assert.equal(roundMoney(money('-1.001', 'USD'), 2, 'UP').amount, '-1.01');
});

test('quantity converts compatible decimal units exactly and rejects dimension mistakes', () => {
  assert.deepEqual(convertQuantity(quantity('1.25', 'kW'), 'W'), { value: '1250', unit: 'W' });
  assert.deepEqual(convertQuantity(quantity('1250', 'Wh'), 'kWh'), { value: '1.25', unit: 'kWh' });
  assert.deepEqual(convertQuantity(quantity('2.5', 'kVA'), 'VA'), { value: '2500', unit: 'VA' });
  assert.throws(() => convertQuantity(quantity('1', 'W'), 'kWh'), QuantityError);
});

test('localization primitives enforce locale membership, direction, bidi isolation, and locale-aware formatting', () => {
  const locales = ['ar', 'tr', 'en'];
  assert.equal(assertSupportedLocale('ar', locales), 'ar');
  assert.throws(() => assertSupportedLocale('de', locales), RangeError);
  assert.equal(directionForLocale('ar', ['ar']), 'rtl');
  assert.equal(directionForLocale('tr', ['ar']), 'ltr');
  assert.equal(bidiIsolate('UGP-805W'), '\u2068UGP-805W\u2069');
  assert.ok(formatNumber('en', 1250).length > 0);
  assert.ok(formatMoney('en', money('125.50', 'USD')).includes('125'));
  assert.ok(formatDateTime('en', new Date('2026-08-28T12:00:00.000Z'), { year: 'numeric' }).includes('2026'));
});

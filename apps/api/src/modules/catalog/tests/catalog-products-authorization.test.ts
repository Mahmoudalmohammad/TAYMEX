import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AuthorizationDeniedError,
  type AuthorizationSubject,
} from '@engineering-platform/authorization';
import {
  canManageProducts,
  canReadProducts,
  requireProductsManage,
  requireProductsRead,
} from '../application/catalog-products-authorization.js';

function subject(id: string, permissions: readonly string[]): AuthorizationSubject {
  return { id, permissions: new Set(permissions) };
}

test('allows a subject with the canonical Products read permission', () => {
  const actor = subject('user-1', ['catalog.products.read']);
  assert.equal(canReadProducts(actor).allowed, true);
  assert.doesNotThrow(() => requireProductsRead(actor));
});

test('denies Products read when the permission is absent', () => {
  const actor = subject('user-2', []);
  assert.equal(canReadProducts(actor).allowed, false);
  assert.throws(
    () => requireProductsRead(actor),
    (error: unknown) => error instanceof AuthorizationDeniedError
      && error.code === 'AUTHORIZATION_DENIED'
      && error.permission === 'catalog.products.read',
  );
});

test('read permission does not imply manage permission', () => {
  const actor = subject('user-3', ['catalog.products.read']);
  assert.equal(canManageProducts(actor).allowed, false);
  assert.throws(
    () => requireProductsManage(actor),
    (error: unknown) => error instanceof AuthorizationDeniedError
      && error.permission === 'catalog.products.manage',
  );
});

test('manage permission does not silently imply read permission', () => {
  const actor = subject('user-4', ['catalog.products.manage']);
  assert.equal(canManageProducts(actor).allowed, true);
  assert.equal(canReadProducts(actor).allowed, false);
});

test('an admin-like subject identifier grants nothing without explicit permissions', () => {
  const actor = subject('admin', []);
  assert.equal(canReadProducts(actor).allowed, false);
  assert.equal(canManageProducts(actor).allowed, false);
});

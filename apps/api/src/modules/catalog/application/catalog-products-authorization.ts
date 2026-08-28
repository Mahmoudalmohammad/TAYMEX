import {
  evaluatePermission,
  requirePermission,
  type AuthorizationDecision,
  type AuthorizationSubject,
} from '@engineering-platform/authorization';
import {
  catalogProductsManagePermission,
  catalogProductsReadPermission,
} from '../../../generated/permissions.generated.js';

export function canReadProducts(subject: AuthorizationSubject): AuthorizationDecision {
  return evaluatePermission(subject, catalogProductsReadPermission);
}

export function requireProductsRead(subject: AuthorizationSubject): void {
  requirePermission(subject, catalogProductsReadPermission);
}

export function canManageProducts(subject: AuthorizationSubject): AuthorizationDecision {
  return evaluatePermission(subject, catalogProductsManagePermission);
}

export function requireProductsManage(subject: AuthorizationSubject): void {
  requirePermission(subject, catalogProductsManagePermission);
}

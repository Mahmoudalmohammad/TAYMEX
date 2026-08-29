import {
  evaluatePermission,
  requirePermission,
  type AuthorizationDecision,
} from '@engineering-platform/authorization';
import type { ActorContext } from '@taymex/identity';
import {
  catalogProductsManagePermission,
  catalogProductsReadPermission,
} from '../../../generated/permissions.generated.js';

export function canReadProducts(actor: ActorContext): AuthorizationDecision {
  return evaluatePermission(actor, catalogProductsReadPermission);
}

export function requireProductsRead(actor: ActorContext): void {
  requirePermission(actor, catalogProductsReadPermission);
}

export function canManageProducts(actor: ActorContext): AuthorizationDecision {
  return evaluatePermission(actor, catalogProductsManagePermission);
}

export function requireProductsManage(actor: ActorContext): void {
  requirePermission(actor, catalogProductsManagePermission);
}

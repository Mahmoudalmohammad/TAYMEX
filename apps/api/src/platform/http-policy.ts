import { SetMetadata } from '@nestjs/common';
import type { GeneratedApiOperation } from '../generated/api-contracts.generated.js';

export const API_OPERATION_METADATA = Symbol('taymex.api.operation');

export function ApiPolicy(operation: GeneratedApiOperation): MethodDecorator {
  return SetMetadata(API_OPERATION_METADATA, operation);
}

import { Body, Controller, HttpCode, Inject, Param, Post, Put, Req } from '@nestjs/common';
import type { AssignRolesRequest, CreateRoleRequest, RoleAssignmentResponse, RoleResponse } from '../../generated/api-contracts.generated.js';
import { apiOperations } from '../../generated/api-contracts.generated.js';
import { ApiPolicy } from '../http-policy.js';
import { API_RUNTIME, type ApiRuntime } from '../runtime.js';
import type { ApiHttpRequest } from '../http-types.js';
import { requireRequestContext } from '../http-types.js';
import {
  requireObjectBody,
  requiredNonNegativeInteger,
  requiredString,
  requiredStringArray,
  requiredUuid,
} from '../http-input.js';

@Controller()
export class IdentityAdminHttpController {
  constructor(@Inject(API_RUNTIME) private readonly runtime: ApiRuntime) {}

  @Post(apiOperations.adminCreateRole.nestPath)
  @HttpCode(apiOperations.adminCreateRole.successStatus)
  @ApiPolicy(apiOperations.adminCreateRole)
  async createRole(@Body() body: unknown, @Req() request: ApiHttpRequest): Promise<RoleResponse> {
    const context = requireRequestContext(request);
    if (!context.actor) throw new Error('Privileged HTTP context is missing its actor.');
    const raw = requireObjectBody(body, ['id', 'name', 'permissions'], ['id', 'name', 'permissions']);
    const input: CreateRoleRequest = Object.freeze({
      id: requiredString(raw.id, 'id', 128),
      name: requiredString(raw.name, 'name', 120),
      permissions: requiredStringArray(raw.permissions, 'permissions', 64, 160),
    });
    const created = await this.runtime.roles.createRole({
      actor: context.actor,
      ...input,
      now: this.runtime.clock.now(),
      correlationId: context.correlationId,
    });
    return Object.freeze({ id: created.id, name: created.name, permissions: created.permissions, version: created.version });
  }

  @Put(apiOperations.adminAssignRoles.nestPath)
  @HttpCode(apiOperations.adminAssignRoles.successStatus)
  @ApiPolicy(apiOperations.adminAssignRoles)
  async assignRoles(
    @Param('accountId') accountIdValue: unknown,
    @Body() body: unknown,
    @Req() request: ApiHttpRequest,
  ): Promise<RoleAssignmentResponse> {
    const context = requireRequestContext(request);
    if (!context.actor) throw new Error('Privileged HTTP context is missing its actor.');
    const raw = requireObjectBody(body, ['roleIds', 'expectedVersion'], ['roleIds', 'expectedVersion']);
    const input: AssignRolesRequest = Object.freeze({
      roleIds: requiredStringArray(raw.roleIds, 'roleIds', 64, 128),
      expectedVersion: requiredNonNegativeInteger(raw.expectedVersion, 'expectedVersion'),
    });
    const version = await this.runtime.roles.assignRoles({
      actor: context.actor,
      accountId: requiredUuid(accountIdValue, 'accountId'),
      roleIds: input.roleIds,
      expectedVersion: input.expectedVersion,
      now: this.runtime.clock.now(),
      correlationId: context.correlationId,
    });
    return Object.freeze({ version });
  }
}

import { Controller, Get, HttpCode, Inject, Query, Req } from '@nestjs/common';
import { AUDIT_CATEGORIES, type AuditCategory } from '@taymex/audit';
import type { AuditRecordListResponse, AuditRecordResponse } from '../../generated/api-contracts.generated.js';
import { apiOperations } from '../../generated/api-contracts.generated.js';
import { ApiPolicy } from '../http-policy.js';
import { API_RUNTIME, type ApiRuntime } from '../runtime.js';
import type { ApiHttpRequest } from '../http-types.js';
import { requireRequestContext } from '../http-types.js';
import { optionalBoundedInteger, optionalEnum, optionalString } from '../http-input.js';

@Controller()
export class AuditAdminHttpController {
  constructor(@Inject(API_RUNTIME) private readonly runtime: ApiRuntime) {}

  @Get(apiOperations.adminQueryAudit.nestPath)
  @HttpCode(apiOperations.adminQueryAudit.successStatus)
  @ApiPolicy(apiOperations.adminQueryAudit)
  async queryAudit(
    @Query() query: Record<string, unknown>,
    @Req() request: ApiHttpRequest,
  ): Promise<AuditRecordListResponse> {
    const context = requireRequestContext(request);
    if (!context.actor) throw new Error('Privileged HTTP context is missing its actor.');
    const category = optionalEnum(query.category, AUDIT_CATEGORIES, 'category') as AuditCategory | undefined;
    const records = await this.runtime.auditQuery.query(context.actor, Object.freeze({
      ...(query.actionCode === undefined ? {} : { actionCode: optionalString(query.actionCode, 'actionCode', 160) }),
      ...(category === undefined ? {} : { category }),
      ...(query.correlationId === undefined ? {} : { correlationId: optionalString(query.correlationId, 'correlationId', 128) }),
      limit: optionalBoundedInteger(query.limit, 'limit', 1, 100, 50),
    }));
    return Object.freeze({ items: Object.freeze(records.map(toResponse)) });
  }
}

function toResponse(record: Awaited<ReturnType<ApiRuntime['auditQuery']['query']>>[number]): AuditRecordResponse {
  return Object.freeze({
    id: record.id,
    occurredAt: record.occurredAt.toISOString(),
    actionCode: record.actionCode,
    category: record.category,
    severity: record.severity,
    actorKind: record.actor.kind,
    actorId: record.actor.kind === 'account' ? record.actor.accountId : record.actor.systemId,
    ...(record.correlationId ? { correlationId: record.correlationId } : {}),
    ...(record.resource ? { resourceType: record.resource.type, resourceId: record.resource.id } : {}),
  });
}

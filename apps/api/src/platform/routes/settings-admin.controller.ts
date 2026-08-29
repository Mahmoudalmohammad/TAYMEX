import { Body, Controller, Get, HttpCode, Inject, Param, Put, Query, Req } from '@nestjs/common';
import type { ManagedSettingDefinition } from '@taymex/settings-runtime';
import type { SettingEffectiveResponse, SettingWriteRequest, SettingWriteResponse } from '../../generated/api-contracts.generated.js';
import { apiOperations } from '../../generated/api-contracts.generated.js';
import { settingDefinitions, type GeneratedSettingKey } from '../../generated/settings.generated.js';
import { ApiPolicy } from '../http-policy.js';
import { HttpBoundaryError } from '../http-errors.js';
import {
  optionalString,
  requireObjectBody,
  requiredNonNegativeInteger,
  requiredScalarSettingValue,
  requiredSettingScope,
  requiredString,
} from '../http-input.js';
import { API_RUNTIME, type ApiRuntime } from '../runtime.js';
import type { ApiHttpRequest } from '../http-types.js';
import { requireRequestContext } from '../http-types.js';

@Controller()
export class SettingsAdminHttpController {
  constructor(@Inject(API_RUNTIME) private readonly runtime: ApiRuntime) {}

  @Get(apiOperations.adminGetSetting.nestPath)
  @HttpCode(apiOperations.adminGetSetting.successStatus)
  @ApiPolicy(apiOperations.adminGetSetting)
  async getSetting(
    @Param('key') rawKey: unknown,
    @Query('projectRef') projectRefValue: unknown,
  ): Promise<SettingEffectiveResponse> {
    const definition = requireManagedDefinition(rawKey);
    const projectRef = projectRefValue === undefined ? undefined : optionalString(projectRefValue, 'projectRef', 240);
    const result = await this.runtime.settings.resolveEffective(definition, projectRef ? { project: projectRef } : {});
    return Object.freeze({
      key: definition.key,
      value: requireResponseScalar(result.trace.value),
      source: result.trace.winner.source,
    });
  }

  @Put(apiOperations.adminWriteSetting.nestPath)
  @HttpCode(apiOperations.adminWriteSetting.successStatus)
  @ApiPolicy(apiOperations.adminWriteSetting)
  async writeSetting(
    @Param('key') rawKey: unknown,
    @Body() body: unknown,
    @Req() request: ApiHttpRequest,
  ): Promise<SettingWriteResponse> {
    const context = requireRequestContext(request);
    if (!context.actor) throw new Error('Privileged HTTP context is missing its actor.');
    const definition = requireManagedDefinition(rawKey);
    const raw = requireObjectBody(body, ['scope', 'scopeRef', 'value', 'expectedVersion', 'source'], ['scope', 'value', 'expectedVersion']);
    const input: SettingWriteRequest = Object.freeze({
      scope: requiredSettingScope(raw.scope),
      ...(raw.scopeRef === undefined ? {} : { scopeRef: optionalString(raw.scopeRef, 'scopeRef', 240) }),
      value: requiredScalarSettingValue(raw.value),
      expectedVersion: requiredNonNegativeInteger(raw.expectedVersion, 'expectedVersion'),
      ...(raw.source === undefined ? {} : { source: optionalString(raw.source, 'source', 128) }),
    });
    const stored = await this.runtime.settings.write({
      definition,
      scope: input.scope,
      ...(input.scopeRef ? { scopeRef: input.scopeRef } : {}),
      value: input.value,
      expectedVersion: input.expectedVersion,
      actor: context.actor,
      correlationId: context.correlationId,
      ...(input.source ? { source: input.source } : {}),
    });
    return Object.freeze({
      key: stored.key,
      scope: stored.scope,
      ...(stored.scopeRef ? { scopeRef: stored.scopeRef } : {}),
      version: stored.version,
    });
  }
}

function requireManagedDefinition(value: unknown): ManagedSettingDefinition<string | number | boolean> {
  const key = requiredString(value, 'key', 240) as GeneratedSettingKey;
  if (!Object.prototype.hasOwnProperty.call(settingDefinitions, key)) {
    throw new HttpBoundaryError({
      code: 'HTTP_SETTING_NOT_FOUND',
      category: 'not-found',
      safeMessageKey: 'errors.settings.unknownKey',
      message: 'Requested setting key is not part of the canonical generated registry.',
      field: 'key',
    });
  }
  return settingDefinitions[key] as unknown as ManagedSettingDefinition<string | number | boolean>;
}

function requireResponseScalar(value: unknown): string | number | boolean {
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new Error('F5 setting transport supports only scalar generated settings.');
}

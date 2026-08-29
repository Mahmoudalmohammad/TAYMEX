import {
  resolveSetting,
  type ScopedSettingValue,
  type SettingScope,
  type SettingValues,
} from '@engineering-platform/settings';
import { requirePermission } from '@engineering-platform/authorization';
import { REDACTED_VALUE, sanitizeAuditValue, type AuditRecorder } from '@taymex/audit';
import { requireNonBlank, type Clock } from '@taymex/foundation';
import { requireAssurance, type ActorContext } from '@taymex/identity';
import { settingsValuesManagePermission } from './generated/permissions.generated.js';
import {
  SETTINGS_RUNTIME_ERROR_CODES,
  SettingsRuntimeError,
} from './errors.js';
import type {
  EffectiveSettingResult,
  ManagedSettingDefinition,
  SettingApplicationDiagnostic,
  SettingApplicationStatus,
  SettingCoordinate,
  SettingHistoryEntry,
  SettingScopeRefs,
  SettingsValueStore,
  StoredSettingValue,
} from './contracts.js';

export class SettingsRuntimeService {
  constructor(
    private readonly store: SettingsValueStore,
    private readonly audit: AuditRecorder,
    private readonly clock: Clock,
  ) {}

  async resolveEffective<T>(
    definition: ManagedSettingDefinition<T>,
    scopeRefs: SettingScopeRefs = {},
  ): Promise<EffectiveSettingResult<T>> {
    const sources: SettingValues<T> = {};
    for (const scope of definition.scopes) {
      const coordinate = coordinateFor(definition.key, scope, scopeRefs[scope]);
      const record = await this.store.findCurrent<T>(coordinate);
      if (!record) continue;
      sources[scope] = Object.freeze({
        value: record.value,
        version: record.version,
        source: record.source,
      }) as ScopedSettingValue<T>;
    }
    return Object.freeze({ trace: resolveSetting(definition, sources), sources: Object.freeze({ ...sources }) });
  }

  async write<T>(input: Readonly<{
    definition: ManagedSettingDefinition<T>;
    scope: SettingScope;
    scopeRef?: string;
    value: T;
    expectedVersion: number;
    actor: ActorContext;
    correlationId?: string;
    source?: string;
  }>): Promise<StoredSettingValue<T>> {
    return this.mutate({ ...input, operation: 'write' });
  }

  async rollback<T>(input: Readonly<{
    definition: ManagedSettingDefinition<T>;
    scope: SettingScope;
    scopeRef?: string;
    targetVersion: number;
    expectedVersion: number;
    actor: ActorContext;
    correlationId?: string;
    source?: string;
  }>): Promise<StoredSettingValue<T>> {
    assertCanManage(input.actor);
    const coordinate = coordinateFor(input.definition.key, input.scope, input.scopeRef);
    const historical = await this.store.findHistoryVersion<T>(coordinate, input.targetVersion);
    if (!historical) {
      throw new SettingsRuntimeError({
        code: SETTINGS_RUNTIME_ERROR_CODES.historyNotFound,
        category: 'not-found',
        message: `Setting history version ${input.targetVersion} was not found for ${input.definition.key}.`,
        safeMessageKey: 'errors.settings.historyNotFound',
      });
    }
    return this.mutate({
      definition: input.definition,
      scope: input.scope,
      scopeRef: input.scopeRef,
      value: historical.value,
      expectedVersion: input.expectedVersion,
      actor: input.actor,
      correlationId: input.correlationId,
      source: input.source,
      operation: 'rollback',
      rolledBackFromVersion: input.targetVersion,
    });
  }

  async history<T>(
    actor: ActorContext,
    coordinate: SettingCoordinate,
    limit = 50,
  ): Promise<readonly SettingHistoryEntry<T>[]> {
    assertCanManage(actor);
    return this.store.listHistory<T>(normalizeCoordinate(coordinate), limit);
  }

  async diagnostic<T>(
    definition: ManagedSettingDefinition<T>,
    coordinate: Omit<SettingCoordinate, 'key'>,
  ): Promise<SettingApplicationDiagnostic> {
    const normalized = coordinateFor(definition.key, coordinate.scope, coordinate.scopeRef);
    const current = await this.store.findCurrent<T>(normalized);
    const appliedVersion = await this.store.getAppliedVersion(normalized);
    return Object.freeze({
      coordinate: normalized,
      runtimeBehavior: definition.runtimeBehavior,
      savedVersion: current?.version ?? null,
      appliedVersion,
      status: applicationStatus(definition.runtimeBehavior, current?.version ?? null, appliedVersion),
    });
  }

  async markApplied<T>(input: Readonly<{
    definition: ManagedSettingDefinition<T>;
    scope: SettingScope;
    scopeRef?: string;
    version: number;
    correlationId?: string;
    runtimeSource: string;
  }>): Promise<void> {
    const coordinate = coordinateFor(input.definition.key, input.scope, input.scopeRef);
    const result = await this.store.markApplied(coordinate, input.version);
    if (result !== 'applied') {
      throw new SettingsRuntimeError({
        code: SETTINGS_RUNTIME_ERROR_CODES.applicationVersionMismatch,
        category: 'conflict',
        message: `Cannot mark ${input.definition.key} version ${input.version} applied: ${result}.`,
        safeMessageKey: 'errors.settings.applicationVersionMismatch',
      });
    }
    await this.audit.record({
      actionCode: 'settings.value.applied',
      category: 'settings',
      severity: 'info',
      actor: { kind: 'system', systemId: requireNonBlank(input.runtimeSource, 'runtimeSource', 128) },
      resource: { type: 'setting', id: coordinateId(coordinate) },
      changes: [{ field: 'appliedVersion', after: input.version }],
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      metadata: { key: definitionKey(input.definition), scope: input.scope },
    });
  }

  private async mutate<T>(input: Readonly<{
    definition: ManagedSettingDefinition<T>;
    scope: SettingScope;
    scopeRef?: string;
    value: T;
    expectedVersion: number;
    actor: ActorContext;
    correlationId?: string;
    source?: string;
    operation: 'write' | 'rollback';
    rolledBackFromVersion?: number;
  }>): Promise<StoredSettingValue<T>> {
    assertCanManage(input.actor);
    assertMutable(input.definition);
    if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) {
      throw new TypeError('expectedVersion must be a non-negative safe integer.');
    }
    const coordinate = coordinateFor(input.definition.key, input.scope, input.scopeRef);
    validateCandidate(input.definition, input.scope, input.value);
    const before = await this.store.findCurrent<T>(coordinate);
    const result = await this.store.compareAndWrite<T>({
      coordinate,
      value: input.value,
      expectedVersion: input.expectedVersion,
      savedAt: this.clock.now(),
      savedByAccountId: input.actor.accountId,
      source: input.source ?? 'runtime-admin',
      operation: input.operation,
      ...(input.rolledBackFromVersion === undefined ? {} : { rolledBackFromVersion: input.rolledBackFromVersion }),
    });
    if (result.status === 'version-conflict') {
      throw new SettingsRuntimeError({
        code: SETTINGS_RUNTIME_ERROR_CODES.versionConflict,
        category: 'conflict',
        message: `Setting version conflict for ${input.definition.key}: expected ${input.expectedVersion}, current ${result.currentVersion}.`,
        safeMessageKey: 'errors.settings.versionConflict',
        details: { expectedVersion: input.expectedVersion, currentVersion: result.currentVersion },
      });
    }
    if (input.definition.runtimeBehavior === 'hot') {
      const applied = await this.store.markApplied(coordinate, result.record.version);
      if (applied !== 'applied') throw new Error(`Failed to mark hot setting applied: ${applied}`);
    }
    const safeBefore = input.definition.sensitive ? REDACTED_VALUE : sanitizeAuditValue(before?.value);
    const safeAfter = input.definition.sensitive ? REDACTED_VALUE : sanitizeAuditValue(result.record.value);
    await this.audit.record({
      actionCode: input.operation === 'rollback' ? 'settings.value.rolled-back' : 'settings.value.changed',
      category: 'settings',
      severity: input.definition.kind === 'security-policy' ? 'warning' : 'info',
      actor: { kind: 'account', accountId: input.actor.accountId, sessionId: input.actor.sessionId },
      resource: { type: 'setting', id: coordinateId(coordinate) },
      changes: [{
        field: 'value',
        ...(before ? { before: safeBefore } : {}),
        after: safeAfter,
      }],
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      metadata: {
        key: input.definition.key,
        scope: input.scope,
        ...(input.scopeRef ? { scopeRef: input.scopeRef } : {}),
        savedVersion: result.record.version,
        runtimeBehavior: input.definition.runtimeBehavior,
        ...(input.rolledBackFromVersion === undefined ? {} : { rolledBackFromVersion: input.rolledBackFromVersion }),
      },
    });
    return result.record;
  }
}

function assertCanManage(actor: ActorContext): void {
  requirePermission(actor, settingsValuesManagePermission);
  requireAssurance(actor, 'AAL2');
}

function validateCandidate<T>(definition: ManagedSettingDefinition<T>, scope: SettingScope, value: T): void {
  resolveSetting(definition, { [scope]: { value, source: 'candidate' } } as SettingValues<T>);
}

function assertMutable<T>(definition: ManagedSettingDefinition<T>): void {
  if (definition.kind === 'invariant' || definition.kind === 'secret-reference') {
    throw new SettingsRuntimeError({
      code: SETTINGS_RUNTIME_ERROR_CODES.immutable,
      category: 'validation',
      message: `Setting ${definition.key} of kind ${definition.kind} cannot be changed through runtime administration.`,
      safeMessageKey: 'errors.settings.immutable',
    });
  }
}

function coordinateFor(key: string, scope: SettingScope, scopeRef?: string): SettingCoordinate {
  return normalizeCoordinate({ key, scope, ...(scopeRef ? { scopeRef } : {}) });
}

function normalizeCoordinate(coordinate: SettingCoordinate): SettingCoordinate {
  return Object.freeze({
    key: requireNonBlank(coordinate.key, 'setting.key', 240),
    scope: coordinate.scope,
    ...(coordinate.scopeRef ? { scopeRef: requireNonBlank(coordinate.scopeRef, 'setting.scopeRef', 240) } : {}),
  });
}

function coordinateId(coordinate: SettingCoordinate): string {
  return `${coordinate.key}@${coordinate.scope}${coordinate.scopeRef ? `:${coordinate.scopeRef}` : ''}`;
}

function definitionKey<T>(definition: ManagedSettingDefinition<T>): string {
  return definition.key;
}

function applicationStatus(
  behavior: ManagedSettingDefinition<unknown>['runtimeBehavior'],
  savedVersion: number | null,
  appliedVersion: number | null,
): SettingApplicationStatus {
  if (savedVersion === null) return 'UNSET';
  if (savedVersion === appliedVersion) return 'APPLIED';
  if (behavior === 'hot') return 'APPLIED';
  if (behavior === 'reload') return 'PENDING_RELOAD';
  if (behavior === 'restart') return 'PENDING_RESTART';
  return 'PENDING_DEPLOY';
}

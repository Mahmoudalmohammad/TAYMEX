import type {
  SettingDefinition,
  SettingResolutionTrace,
  SettingScope,
  SettingValues,
} from '@engineering-platform/settings';

export const SETTING_RUNTIME_BEHAVIORS = ['hot', 'reload', 'restart', 'deploy'] as const;
export type SettingRuntimeBehavior = (typeof SETTING_RUNTIME_BEHAVIORS)[number];

export const MANAGED_SETTING_KINDS = [
  'configuration',
  'preference',
  'feature-flag',
  'security-policy',
  'secret-reference',
  'invariant',
] as const;
export type ManagedSettingKind = (typeof MANAGED_SETTING_KINDS)[number];

export type ManagedSettingDefinition<T> = SettingDefinition<T> & Readonly<{
  owner: string;
  kind: ManagedSettingKind;
  lifecycle: 'experimental' | 'beta' | 'stable' | 'deprecated';
  runtimeBehavior: SettingRuntimeBehavior;
  sensitive: boolean;
}>;

export type SettingCoordinate = Readonly<{
  key: string;
  scope: SettingScope;
  scopeRef?: string;
}>;

export type StoredSettingValue<T = unknown> = Readonly<SettingCoordinate & {
  value: T;
  version: number;
  savedAt: Date;
  savedByAccountId: string;
  source: string;
}>;

export type SettingHistoryEntry<T = unknown> = StoredSettingValue<T> & Readonly<{
  operation: 'write' | 'rollback';
  rolledBackFromVersion?: number;
}>;

export type SettingWriteCandidate<T> = Readonly<{
  coordinate: SettingCoordinate;
  value: T;
  expectedVersion: number;
  savedAt: Date;
  savedByAccountId: string;
  source: string;
  operation: 'write' | 'rollback';
  rolledBackFromVersion?: number;
}>;

export type SettingWriteStoreResult<T> = Readonly<
  | { status: 'written'; record: StoredSettingValue<T> }
  | { status: 'version-conflict'; currentVersion: number }
>;

export interface SettingsValueStore {
  findCurrent<T>(coordinate: SettingCoordinate): Promise<StoredSettingValue<T> | null>;
  findHistoryVersion<T>(coordinate: SettingCoordinate, version: number): Promise<SettingHistoryEntry<T> | null>;
  listHistory<T>(coordinate: SettingCoordinate, limit?: number): Promise<readonly SettingHistoryEntry<T>[]>;
  compareAndWrite<T>(candidate: SettingWriteCandidate<T>): Promise<SettingWriteStoreResult<T>>;
  getAppliedVersion(coordinate: SettingCoordinate): Promise<number | null>;
  markApplied(coordinate: SettingCoordinate, version: number): Promise<'applied' | 'version-mismatch' | 'missing'>;
}

export type SettingScopeRefs = Partial<Record<SettingScope, string>>;

export type EffectiveSettingResult<T> = Readonly<{
  trace: SettingResolutionTrace<T>;
  sources: SettingValues<T>;
}>;

export type SettingApplicationStatus =
  | 'UNSET'
  | 'APPLIED'
  | 'PENDING_RELOAD'
  | 'PENDING_RESTART'
  | 'PENDING_DEPLOY';

export type SettingApplicationDiagnostic = Readonly<{
  coordinate: SettingCoordinate;
  runtimeBehavior: SettingRuntimeBehavior;
  savedVersion: number | null;
  appliedVersion: number | null;
  status: SettingApplicationStatus;
}>;

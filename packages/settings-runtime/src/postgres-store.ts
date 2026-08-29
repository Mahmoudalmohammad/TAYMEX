import type { SqlExecutor, TransactionalSqlExecutor } from '@taymex/data-postgres';
import type {
  SettingCoordinate,
  SettingHistoryEntry,
  SettingWriteCandidate,
  SettingWriteStoreResult,
  SettingsValueStore,
  StoredSettingValue,
} from './contracts.js';

const MAX_HISTORY = 100;

export class PostgresSettingsValueStore implements SettingsValueStore {
  constructor(private readonly db: TransactionalSqlExecutor) {}

  async findCurrent<T>(coordinate: SettingCoordinate): Promise<StoredSettingValue<T> | null> {
    const result = await this.db.query<SettingValueRow>(
      `${SETTING_VALUE_SELECT}
       WHERE setting_key=$1 AND scope=$2 AND scope_ref=$3`,
      paramsFor(coordinate),
    );
    return result.rows[0] ? valueFromRow<T>(result.rows[0]) : null;
  }

  async findCurrentMany<T>(coordinates: readonly SettingCoordinate[]): Promise<readonly StoredSettingValue<T>[]> {
    if (!coordinates.length) return Object.freeze([]);
    const firstKey = coordinates[0]?.key;
    if (!firstKey || coordinates.some((coordinate) => coordinate.key !== firstKey)) {
      throw new TypeError('findCurrentMany requires coordinates for exactly one setting key.');
    }
    const scopes = coordinates.map((coordinate) => coordinate.scope);
    const scopeRefs = coordinates.map((coordinate) => coordinate.scopeRef ?? '');
    const result = await this.db.query<SettingValueRow>(
      `SELECT value.setting_key, value.scope, value.scope_ref, value.value_json, value.version, value.saved_at, value.saved_by_account_id, value.source
       FROM runtime_setting_values AS value
       JOIN unnest($2::text[], $3::text[]) AS requested(scope, scope_ref)
         ON value.scope=requested.scope AND value.scope_ref=requested.scope_ref
       WHERE value.setting_key=$1`,
      [firstKey, scopes, scopeRefs],
    );
    return Object.freeze(result.rows.map((row) => valueFromRow<T>(row)));
  }

  async findHistoryVersion<T>(coordinate: SettingCoordinate, version: number): Promise<SettingHistoryEntry<T> | null> {
    const result = await this.db.query<SettingHistoryRow>(
      `${SETTING_HISTORY_SELECT}
       WHERE setting_key=$1 AND scope=$2 AND scope_ref=$3 AND version=$4`,
      [...paramsFor(coordinate), version],
    );
    return result.rows[0] ? historyFromRow<T>(result.rows[0]) : null;
  }

  async listHistory<T>(coordinate: SettingCoordinate, limit = 50): Promise<readonly SettingHistoryEntry<T>[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_HISTORY) {
      throw new RangeError(`Settings history limit must be between 1 and ${MAX_HISTORY}.`);
    }
    const result = await this.db.query<SettingHistoryRow>(
      `${SETTING_HISTORY_SELECT}
       WHERE setting_key=$1 AND scope=$2 AND scope_ref=$3
       ORDER BY version DESC LIMIT $4`,
      [...paramsFor(coordinate), limit],
    );
    return Object.freeze(result.rows.map((row) => historyFromRow<T>(row)));
  }

  async compareAndWrite<T>(candidate: SettingWriteCandidate<T>): Promise<SettingWriteStoreResult<T>> {
    return this.db.transaction(async (tx) => {
      const written = candidate.expectedVersion === 0
        ? await tx.query<SettingValueRow>(
            `INSERT INTO runtime_setting_values
              (setting_key, scope, scope_ref, value_json, version, saved_at, saved_by_account_id, source)
             VALUES ($1,$2,$3,$4::jsonb,1,$5,$6,$7)
             ON CONFLICT (setting_key, scope, scope_ref) DO NOTHING
             RETURNING setting_key, scope, scope_ref, value_json, version, saved_at, saved_by_account_id, source`,
            candidateParams(candidate, 1),
          )
        : await tx.query<SettingValueRow>(
            `UPDATE runtime_setting_values
                SET value_json=$4::jsonb, version=version+1, saved_at=$5, saved_by_account_id=$6, source=$7
              WHERE setting_key=$1 AND scope=$2 AND scope_ref=$3 AND version=$8
              RETURNING setting_key, scope, scope_ref, value_json, version, saved_at, saved_by_account_id, source`,
            [...candidateParams(candidate, candidate.expectedVersion + 1), candidate.expectedVersion],
          );

      const row = written.rows[0];
      if (!row) {
        const current = await tx.query<{ version: number }>(
          `SELECT version FROM runtime_setting_values WHERE setting_key=$1 AND scope=$2 AND scope_ref=$3`,
          paramsFor(candidate.coordinate),
        );
        return Object.freeze({ status: 'version-conflict' as const, currentVersion: current.rows[0]?.version ?? 0 });
      }

      await tx.query(
        `INSERT INTO runtime_setting_history
          (setting_key, scope, scope_ref, version, value_json, saved_at, saved_by_account_id, source, operation, rolled_back_from_version)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10)`,
        [
          row.setting_key,
          row.scope,
          row.scope_ref,
          row.version,
          JSON.stringify(row.value_json),
          row.saved_at,
          row.saved_by_account_id,
          row.source,
          candidate.operation,
          candidate.rolledBackFromVersion ?? null,
        ],
      );
      return Object.freeze({ status: 'written' as const, record: valueFromRow<T>(row) });
    });
  }

  async getAppliedVersion(coordinate: SettingCoordinate): Promise<number | null> {
    const result = await this.db.query<{ applied_version: number }>(
      `SELECT applied_version FROM runtime_setting_application
       WHERE setting_key=$1 AND scope=$2 AND scope_ref=$3`,
      paramsFor(coordinate),
    );
    return result.rows[0]?.applied_version ?? null;
  }

  async markApplied(coordinate: SettingCoordinate, version: number): Promise<'applied' | 'version-mismatch' | 'missing'> {
    return this.db.transaction(async (tx) => {
      const current = await tx.query<{ version: number }>(
        `SELECT version FROM runtime_setting_values
         WHERE setting_key=$1 AND scope=$2 AND scope_ref=$3
         FOR UPDATE`,
        paramsFor(coordinate),
      );
      const currentVersion = current.rows[0]?.version;
      if (currentVersion === undefined) return 'missing' as const;
      if (currentVersion !== version) return 'version-mismatch' as const;
      await tx.query(
        `INSERT INTO runtime_setting_application
          (setting_key, scope, scope_ref, applied_version, applied_at)
         VALUES ($1,$2,$3,$4,clock_timestamp())
         ON CONFLICT (setting_key, scope, scope_ref) DO UPDATE
           SET applied_version=EXCLUDED.applied_version, applied_at=EXCLUDED.applied_at`,
        [...paramsFor(coordinate), version],
      );
      return 'applied' as const;
    });
  }
}

const SETTING_VALUE_SELECT = `SELECT setting_key, scope, scope_ref, value_json, version, saved_at, saved_by_account_id, source FROM runtime_setting_values`;
const SETTING_HISTORY_SELECT = `SELECT setting_key, scope, scope_ref, version, value_json, saved_at, saved_by_account_id, source, operation, rolled_back_from_version FROM runtime_setting_history`;

type SettingValueRow = Record<string, unknown> & {
  setting_key: string;
  scope: SettingCoordinate['scope'];
  scope_ref: string;
  value_json: unknown;
  version: number;
  saved_at: Date;
  saved_by_account_id: string;
  source: string;
};
type SettingHistoryRow = SettingValueRow & {
  operation: SettingHistoryEntry['operation'];
  rolled_back_from_version: number | null;
};

function paramsFor(coordinate: SettingCoordinate): [string, SettingCoordinate['scope'], string] {
  return [coordinate.key, coordinate.scope, coordinate.scopeRef ?? ''];
}

function candidateParams<T>(candidate: SettingWriteCandidate<T>, _nextVersion: number): [string, SettingCoordinate['scope'], string, string, Date, string, string] {
  return [
    candidate.coordinate.key,
    candidate.coordinate.scope,
    candidate.coordinate.scopeRef ?? '',
    JSON.stringify(candidate.value),
    candidate.savedAt,
    candidate.savedByAccountId,
    candidate.source,
  ];
}

function valueFromRow<T>(row: SettingValueRow): StoredSettingValue<T> {
  return Object.freeze({
    key: row.setting_key,
    scope: row.scope,
    ...(row.scope_ref ? { scopeRef: row.scope_ref } : {}),
    value: cloneValue(row.value_json) as T,
    version: row.version,
    savedAt: new Date(row.saved_at),
    savedByAccountId: row.saved_by_account_id,
    source: row.source,
  });
}

function historyFromRow<T>(row: SettingHistoryRow): SettingHistoryEntry<T> {
  return Object.freeze({
    ...valueFromRow<T>(row),
    operation: row.operation,
    ...(row.rolled_back_from_version === null ? {} : { rolledBackFromVersion: row.rolled_back_from_version }),
  });
}

function cloneValue<T>(value: T): T {
  return typeof structuredClone === 'function' ? structuredClone(value) : value;
}

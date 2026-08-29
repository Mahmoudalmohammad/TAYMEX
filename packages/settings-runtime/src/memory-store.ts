import type {
  SettingCoordinate,
  SettingHistoryEntry,
  SettingWriteCandidate,
  SettingWriteStoreResult,
  SettingsValueStore,
  StoredSettingValue,
} from './contracts.js';

const MAX_HISTORY = 100;

export class MemorySettingsValueStore implements SettingsValueStore {
  #current = new Map<string, StoredSettingValue>();
  #history = new Map<string, SettingHistoryEntry[]>();
  #applied = new Map<string, number>();

  async findCurrent<T>(coordinate: SettingCoordinate): Promise<StoredSettingValue<T> | null> {
    const record = this.#current.get(keyOf(coordinate));
    return record ? cloneRecord(record as StoredSettingValue<T>) : null;
  }

  async findHistoryVersion<T>(coordinate: SettingCoordinate, version: number): Promise<SettingHistoryEntry<T> | null> {
    const record = this.#history.get(keyOf(coordinate))?.find((item) => item.version === version);
    return record ? cloneHistory(record as SettingHistoryEntry<T>) : null;
  }

  async listHistory<T>(coordinate: SettingCoordinate, limit = 50): Promise<readonly SettingHistoryEntry<T>[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_HISTORY) {
      throw new RangeError(`Settings history limit must be between 1 and ${MAX_HISTORY}.`);
    }
    const history = this.#history.get(keyOf(coordinate)) ?? [];
    return Object.freeze(history.slice(-limit).reverse().map((item) => cloneHistory(item as SettingHistoryEntry<T>)));
  }

  async compareAndWrite<T>(candidate: SettingWriteCandidate<T>): Promise<SettingWriteStoreResult<T>> {
    const key = keyOf(candidate.coordinate);
    const current = this.#current.get(key);
    const currentVersion = current?.version ?? 0;
    if (currentVersion !== candidate.expectedVersion) {
      return Object.freeze({ status: 'version-conflict', currentVersion });
    }
    const record: StoredSettingValue<T> = Object.freeze({
      ...candidate.coordinate,
      value: cloneValue(candidate.value),
      version: currentVersion + 1,
      savedAt: new Date(candidate.savedAt.getTime()),
      savedByAccountId: candidate.savedByAccountId,
      source: candidate.source,
    });
    const history: SettingHistoryEntry<T> = Object.freeze({
      ...record,
      operation: candidate.operation,
      ...(candidate.rolledBackFromVersion === undefined ? {} : { rolledBackFromVersion: candidate.rolledBackFromVersion }),
    });
    this.#current.set(key, record as StoredSettingValue);
    const entries = this.#history.get(key) ?? [];
    entries.push(history as SettingHistoryEntry);
    this.#history.set(key, entries);
    return Object.freeze({ status: 'written', record: cloneRecord(record) });
  }

  async getAppliedVersion(coordinate: SettingCoordinate): Promise<number | null> {
    return this.#applied.get(keyOf(coordinate)) ?? null;
  }

  async markApplied(coordinate: SettingCoordinate, version: number): Promise<'applied' | 'version-mismatch' | 'missing'> {
    const key = keyOf(coordinate);
    const current = this.#current.get(key);
    if (!current) return 'missing';
    if (current.version !== version) return 'version-mismatch';
    this.#applied.set(key, version);
    return 'applied';
  }
}

function keyOf(coordinate: SettingCoordinate): string {
  return `${coordinate.key}\u0000${coordinate.scope}\u0000${coordinate.scopeRef ?? ''}`;
}

function cloneRecord<T>(record: StoredSettingValue<T>): StoredSettingValue<T> {
  return Object.freeze({
    ...record,
    value: cloneValue(record.value),
    savedAt: new Date(record.savedAt.getTime()),
  });
}

function cloneHistory<T>(record: SettingHistoryEntry<T>): SettingHistoryEntry<T> {
  return Object.freeze({
    ...record,
    value: cloneValue(record.value),
    savedAt: new Date(record.savedAt.getTime()),
  });
}

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return value;
}

import { createHash } from 'node:crypto';

export type SqlQueryOutcome = 'success' | 'error';

export type SqlQueryObservation = Readonly<{
  operation: string;
  fingerprint: string;
  parameterCount: number;
  rowCount: number | null;
  outcome: SqlQueryOutcome;
}>;

export interface SqlQueryObserver {
  observe(event: SqlQueryObservation): void;
}

export type SqlQueryBudget = Readonly<{
  maxQueries: number;
  maxRepeatedFingerprint?: number;
}>;

export type SqlQueryBudgetSummary = Readonly<{
  totalQueries: number;
  maximumFingerprintCount: number;
  fingerprintCounts: Readonly<Record<string, number>>;
}>;

/**
 * In-memory collector intended for deterministic query-count assertions and
 * local diagnostics. Observations never include SQL parameter values.
 */
export class SqlQueryRecorder implements SqlQueryObserver {
  readonly #events: SqlQueryObservation[] = [];

  observe(event: SqlQueryObservation): void {
    this.#events.push(Object.freeze({ ...event }));
  }

  snapshot(): readonly SqlQueryObservation[] {
    return Object.freeze(this.#events.map((event) => Object.freeze({ ...event })));
  }

  clear(): void {
    this.#events.length = 0;
  }
}

export function requireSqlQueryBudget(
  observations: readonly SqlQueryObservation[],
  budget: SqlQueryBudget,
): SqlQueryBudgetSummary {
  const maxQueries = boundedInteger(budget.maxQueries, 'maxQueries', 0, 10_000);
  const maxRepeatedFingerprint = boundedInteger(
    budget.maxRepeatedFingerprint ?? maxQueries,
    'maxRepeatedFingerprint',
    0,
    10_000,
  );
  const counts = new Map<string, number>();
  for (const observation of observations) {
    counts.set(observation.fingerprint, (counts.get(observation.fingerprint) ?? 0) + 1);
  }
  const maximumFingerprintCount = Math.max(0, ...counts.values());
  const summary = Object.freeze({
    totalQueries: observations.length,
    maximumFingerprintCount,
    fingerprintCounts: Object.freeze(Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)))),
  });

  if (summary.totalQueries > maxQueries) {
    throw new RangeError(`SQL query budget exceeded: ${summary.totalQueries} > ${maxQueries}.`);
  }
  if (summary.maximumFingerprintCount > maxRepeatedFingerprint) {
    throw new RangeError(
      `Repeated SQL fingerprint budget exceeded: ${summary.maximumFingerprintCount} > ${maxRepeatedFingerprint}.`,
    );
  }
  return summary;
}

export function fingerprintSqlStatement(text: string): string {
  const normalized = normalizeSql(text);
  return createHash('sha256').update(normalized).digest('hex');
}

export function classifySqlOperation(text: string): string {
  const normalized = normalizeSql(text);
  const [first = 'UNKNOWN'] = normalized.split(' ', 1);
  return /^[A-Z]+$/u.test(first) ? first : 'UNKNOWN';
}

function normalizeSql(text: string): string {
  if (typeof text !== 'string' || !text.trim()) throw new TypeError('SQL text must be non-blank.');
  return text.trim().replace(/\s+/gu, ' ').toUpperCase();
}

function boundedInteger(value: number, field: string, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${field} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

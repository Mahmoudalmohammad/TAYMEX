import type { LogRecord, LogSink } from './contracts.js';

const DEFAULT_MAX_RECORDS = 1000;
const MAX_RECORDS_LIMIT = 10_000;

export class MemoryLogSink implements LogSink {
  #records: LogRecord[] = [];

  constructor(private readonly maxRecords = DEFAULT_MAX_RECORDS) {
    if (!Number.isSafeInteger(maxRecords) || maxRecords < 1 || maxRecords > MAX_RECORDS_LIMIT) {
      throw new RangeError(`Memory log capacity must be between 1 and ${MAX_RECORDS_LIMIT}.`);
    }
  }

  async write(record: LogRecord): Promise<void> {
    this.#records.push(cloneRecord(record));
    const overflow = this.#records.length - this.maxRecords;
    if (overflow > 0) this.#records.splice(0, overflow);
  }

  records(): readonly LogRecord[] {
    return Object.freeze(this.#records.map(cloneRecord));
  }
}

function cloneRecord(record: LogRecord): LogRecord {
  return Object.freeze({
    ...record,
    timestamp: new Date(record.timestamp.getTime()),
    runtime: Object.freeze({ ...record.runtime }),
    fields: Object.freeze({ ...record.fields }),
  });
}

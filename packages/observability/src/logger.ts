import { sanitizeAuditMetadata } from '@taymex/audit';
import { requireNonBlank, type Clock } from '@taymex/foundation';
import type { IdentitySecurityEvent, IdentitySecurityEventSink } from '@taymex/identity';
import type { LogLevel, LogRecord, LogSink, RuntimeMetadata } from './contracts.js';

export class StructuredLogger {
  private readonly runtime: RuntimeMetadata;

  constructor(
    private readonly sink: LogSink,
    private readonly clock: Clock,
    runtime: RuntimeMetadata,
  ) {
    this.runtime = normalizeRuntime(runtime);
  }

  async log(input: Readonly<{
    level: LogLevel;
    event: string;
    message: string;
    correlationId?: string;
    fields?: Readonly<Record<string, unknown>>;
  }>): Promise<LogRecord> {
    const record: LogRecord = Object.freeze({
      timestamp: this.clock.now(),
      level: input.level,
      event: requireEvent(input.event),
      message: requireNonBlank(input.message, 'log.message', 2048),
      ...(input.correlationId ? { correlationId: requireNonBlank(input.correlationId, 'correlationId', 128) } : {}),
      runtime: this.runtime,
      fields: sanitizeAuditMetadata(input.fields ?? {}),
    });
    await this.sink.write(record);
    return record;
  }
}

export class IdentitySecurityLogSink implements IdentitySecurityEventSink {
  constructor(private readonly logger: StructuredLogger) {}

  async emit(event: IdentitySecurityEvent): Promise<void> {
    await this.logger.log({
      level: event.eventId.endsWith('.failed') ? 'warn' : 'info',
      event: event.eventId,
      message: 'Identity security event.',
      ...(event.correlationId ? { correlationId: event.correlationId } : {}),
      fields: {
        ...(event.subjectAccountId ? { subjectAccountId: event.subjectAccountId } : {}),
        ...(event.actorAccountId ? { actorAccountId: event.actorAccountId } : {}),
        ...(event.sessionId ? { sessionId: event.sessionId } : {}),
        ...(event.roleId ? { roleId: event.roleId } : {}),
        ...(event.reason ? { reason: event.reason } : {}),
      },
    });
  }
}

export class CompositeIdentitySecurityEventSink implements IdentitySecurityEventSink {
  constructor(private readonly sinks: readonly IdentitySecurityEventSink[]) {
    if (sinks.length === 0) throw new TypeError('At least one identity security event sink is required.');
  }

  async emit(event: IdentitySecurityEvent): Promise<void> {
    const failures: unknown[] = [];
    for (const sink of this.sinks) {
      try {
        await sink.emit(event);
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0) throw new AggregateError(failures, 'One or more identity security event sinks failed.');
  }
}

function normalizeRuntime(runtime: RuntimeMetadata): RuntimeMetadata {
  return Object.freeze({
    service: requireNonBlank(runtime.service, 'runtime.service', 128),
    version: requireNonBlank(runtime.version, 'runtime.version', 128),
    environment: requireNonBlank(runtime.environment, 'runtime.environment', 128),
    buildRevision: requireNonBlank(runtime.buildRevision, 'runtime.buildRevision', 256),
  });
}

function requireEvent(value: string): string {
  const event = requireNonBlank(value, 'log.event', 160);
  if (!/^[a-z][a-z0-9.-]+$/u.test(event)) throw new TypeError('Log event must be a canonical lowercase code.');
  return event;
}

/**
 * Line-delimited JSON sink for the API process. Delivery/collection durability is an F9 concern;
 * F5 guarantees only structured, redacted process output.
 */
export class ConsoleJsonLogSink implements LogSink {
  constructor(private readonly writeLine: (line: string) => void = (line) => process.stdout.write(`${line}\n`)) {}

  async write(record: LogRecord): Promise<void> {
    this.writeLine(JSON.stringify({
      ...record,
      timestamp: record.timestamp.toISOString(),
    }));
  }
}

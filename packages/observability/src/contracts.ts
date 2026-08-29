import type { AuditJsonValue } from '@taymex/audit';

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export type RuntimeMetadata = Readonly<{
  service: string;
  version: string;
  environment: string;
  buildRevision: string;
}>;

export type LogRecord = Readonly<{
  timestamp: Date;
  level: LogLevel;
  event: string;
  message: string;
  correlationId?: string;
  runtime: RuntimeMetadata;
  fields: Readonly<Record<string, AuditJsonValue>>;
}>;

export interface LogSink {
  write(record: LogRecord): Promise<void>;
}

export type HealthDependencyStatus = 'UP' | 'DEGRADED' | 'DOWN';

export type HealthCheckResult = Readonly<{
  status: HealthDependencyStatus;
  detail?: string;
}>;

export type HealthCheck = Readonly<{
  name: string;
  check(): Promise<HealthCheckResult>;
}>;

export type LivenessSnapshot = Readonly<{
  status: 'UP';
  checkedAt: Date;
  runtime: RuntimeMetadata;
}>;

export type ReadinessSnapshot = Readonly<{
  status: 'READY' | 'NOT_READY';
  checkedAt: Date;
  runtime: RuntimeMetadata;
  checks: readonly Readonly<{ name: string; status: HealthDependencyStatus; detail?: string }>[];
}>;

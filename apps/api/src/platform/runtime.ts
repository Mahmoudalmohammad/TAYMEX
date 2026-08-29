import { SystemClock } from '@taymex/foundation';
import {
  IdentityService,
  PostgresIdentityRepository,
  PostgresRoleAccessStore,
  RoleAccessService,
  ScryptPasswordHasher,
  SecretTokenService,
  UuidGenerator,
  type PermissionCatalog,
  type SecretDeliverySink,
} from '@taymex/identity';
import {
  AuditQueryService,
  AuditService,
  IdentitySecurityAuditSink,
  PostgresAuditStore,
} from '@taymex/audit';
import {
  CompositeIdentitySecurityEventSink,
  ConsoleJsonLogSink,
  CorrelationIdService,
  IdentitySecurityLogSink,
  StructuredLogger,
  RuntimeHealthReporter,
} from '@taymex/observability';
import {
  PostgresDatabase,
  createAtomicTransactionBoundary,
  createNodePgPool,
  checkPostgresReadiness,
} from '@taymex/data-postgres';
import { PostgresSettingsValueStore, SettingsRuntimeService } from '@taymex/settings-runtime';
import { permissionKeys } from '../generated/permissions.generated.js';
import { ProcessAuthenticationThrottle } from './process-authentication-throttle.js';
import { ProcessRateLimiter } from './process-rate-limiter.js';

export const API_RUNTIME = Symbol('taymex.api.runtime');

export type ApiRuntime = Readonly<{
  database: PostgresDatabase;
  clock: SystemClock;
  identity: IdentityService;
  roles: RoleAccessService;
  settings: SettingsRuntimeService;
  audit: AuditService;
  auditQuery: AuditQueryService;
  logger: StructuredLogger;
  correlation: CorrelationIdService;
  httpRateLimiter: ProcessRateLimiter;
  health: RuntimeHealthReporter;
  sessionTtlSeconds: number;
  close(): Promise<void>;
}>;

export async function createApiRuntime(): Promise<ApiRuntime> {
  const databaseUrl = requiredEnv('DATABASE_URL');
  const pool = await createNodePgPool({
    connectionString: databaseUrl,
    applicationName: 'taymex-api',
    max: integerEnv('DATABASE_POOL_MAX', 10, 1, 50),
    connectionTimeoutMillis: integerEnv('DATABASE_CONNECT_TIMEOUT_MS', 5_000, 250, 60_000),
    idleTimeoutMillis: integerEnv('DATABASE_IDLE_TIMEOUT_MS', 30_000, 1_000, 300_000),
    statementTimeoutMs: integerEnv('DATABASE_STATEMENT_TIMEOUT_MS', 15_000, 100, 300_000),
  });
  const database = new PostgresDatabase(pool);
  const transactions = createAtomicTransactionBoundary(database);
  const clock = new SystemClock();
  const ids = new UuidGenerator();
  const logSink = new ConsoleJsonLogSink();
  const logger = new StructuredLogger(logSink, clock, {
    service: 'taymex-api',
    version: process.env.APP_VERSION?.trim() || '0.0.0-private',
    environment: process.env.NODE_ENV?.trim() || 'development',
    buildRevision: process.env.BUILD_REVISION?.trim() || 'unavailable',
  });
  const auditStore = new PostgresAuditStore(database);
  const audit = new AuditService(auditStore, clock, ids);
  const auditQuery = new AuditQueryService(auditStore);
  const events = new CompositeIdentitySecurityEventSink([
    new IdentitySecurityAuditSink(audit),
    new IdentitySecurityLogSink(logger),
  ]);
  const permissionCatalog: PermissionCatalog = Object.freeze({
    has(permission: string): boolean {
      return Object.prototype.hasOwnProperty.call(permissionKeys, permission);
    },
  });
  const roleStore = new PostgresRoleAccessStore(database);
  const roles = new RoleAccessService(roleStore, permissionCatalog, events, transactions);
  const secretDelivery: SecretDeliverySink = Object.freeze({
    async deliver(): Promise<void> {
      throw new Error('Secret delivery is unavailable until the governed F7 provider boundary is enabled.');
    },
  });
  const sessionTtlMs = integerEnv('SESSION_TTL_MS', 12 * 60 * 60_000, 60_000, 7 * 24 * 60 * 60_000);
  const identity = new IdentityService(
    new PostgresIdentityRepository(database),
    roles,
    new ScryptPasswordHasher(),
    new SecretTokenService(),
    new ProcessAuthenticationThrottle(),
    events,
    secretDelivery,
    clock,
    ids,
    transactions,
    Object.freeze({
      sessionTtlMs,
      passwordResetTtlMs: 30 * 60_000,
      emailVerificationTtlMs: 24 * 60 * 60_000,
      requireVerifiedEmailForSignIn: booleanEnv('IDENTITY_REQUIRE_VERIFIED_EMAIL', false),
      passwordPolicy: Object.freeze({ minLength: 12, maxLength: 128 }),
    }),
  );
  const settings = new SettingsRuntimeService(
    new PostgresSettingsValueStore(database),
    audit,
    clock,
    transactions,
  );
  const health = new RuntimeHealthReporter(
    {
      service: 'taymex-api',
      version: process.env.APP_VERSION?.trim() || '0.0.0-private',
      environment: process.env.NODE_ENV?.trim() || 'development',
      buildRevision: process.env.BUILD_REVISION?.trim() || 'unavailable',
    },
    clock,
    [Object.freeze({ name: 'postgresql', check: () => checkPostgresReadiness(database) })],
  );
  return Object.freeze({
    database,
    clock,
    identity,
    roles,
    settings,
    audit,
    auditQuery,
    logger,
    correlation: new CorrelationIdService(),
    httpRateLimiter: new ProcessRateLimiter(),
    health,
    sessionTtlSeconds: Math.floor(sessionTtlMs / 1000),
    close: () => database.close(),
  });
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function integerEnv(name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

function booleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  throw new TypeError(`${name} must be true/false or 1/0.`);
}

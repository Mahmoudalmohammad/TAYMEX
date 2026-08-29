import { requireNonBlank, type Clock } from '@taymex/foundation';
import type {
  HealthCheck,
  HealthCheckResult,
  LivenessSnapshot,
  ReadinessSnapshot,
  RuntimeMetadata,
} from './contracts.js';

const MAX_HEALTH_CHECKS = 32;

export class RuntimeHealthReporter {
  private readonly runtime: RuntimeMetadata;
  private readonly checks: readonly HealthCheck[];

  constructor(runtime: RuntimeMetadata, private readonly clock: Clock, checks: readonly HealthCheck[] = []) {
    if (checks.length > MAX_HEALTH_CHECKS) throw new RangeError(`At most ${MAX_HEALTH_CHECKS} readiness checks are supported.`);
    const names = new Set<string>();
    this.checks = Object.freeze(checks.map((check) => {
      const name = requireNonBlank(check.name, 'healthCheck.name', 128);
      if (names.has(name)) throw new TypeError(`Duplicate readiness check name: ${name}`);
      names.add(name);
      return Object.freeze({ name, check: () => check.check() });
    }));
    this.runtime = Object.freeze({
      service: requireNonBlank(runtime.service, 'runtime.service', 128),
      version: requireNonBlank(runtime.version, 'runtime.version', 128),
      environment: requireNonBlank(runtime.environment, 'runtime.environment', 128),
      buildRevision: requireNonBlank(runtime.buildRevision, 'runtime.buildRevision', 256),
    });
  }

  liveness(): LivenessSnapshot {
    return Object.freeze({ status: 'UP', checkedAt: this.clock.now(), runtime: this.runtime });
  }

  async readiness(): Promise<ReadinessSnapshot> {
    const results: ReadinessSnapshot['checks'][number][] = [];
    for (const check of this.checks) {
      let result: HealthCheckResult;
      try {
        result = await check.check();
      } catch {
        result = { status: 'DOWN', detail: 'check-failed' };
      }
      results.push(Object.freeze({
        name: check.name,
        status: result.status,
        ...(result.detail ? { detail: requireNonBlank(result.detail, 'healthCheck.detail', 256) } : {}),
      }));
    }
    const ready = results.every((item) => item.status === 'UP');
    return Object.freeze({
      status: ready ? 'READY' : 'NOT_READY',
      checkedAt: this.clock.now(),
      runtime: this.runtime,
      checks: Object.freeze(results),
    });
  }
}

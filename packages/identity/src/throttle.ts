export type AuthenticationThrottlePolicy = Readonly<{
  maxFailures: number;
  windowMs: number;
  lockMs: number;
}>;

export const DEFAULT_AUTHENTICATION_THROTTLE_POLICY: AuthenticationThrottlePolicy = Object.freeze({
  maxFailures: 5,
  windowMs: 15 * 60_000,
  lockMs: 15 * 60_000,
});

export interface AuthenticationThrottle {
  isBlocked(principalKey: string, now: Date): Promise<boolean>;
  recordFailure(principalKey: string, now: Date): Promise<void>;
  recordSuccess(principalKey: string): Promise<void>;
}

/**
 * Single-process reference implementation used for contract tests/local development.
 * Multi-instance production abuse protection must use the later security/runtime adapter.
 */
export class MemoryAuthenticationThrottle implements AuthenticationThrottle {
  private readonly entries = new Map<string, { failures: number[]; blockedUntil: number | null }>();

  constructor(private readonly policy: AuthenticationThrottlePolicy = DEFAULT_AUTHENTICATION_THROTTLE_POLICY) {
    validatePolicy(policy);
  }

  async isBlocked(principalKey: string, now: Date): Promise<boolean> {
    const entry = this.entries.get(principalKey);
    if (!entry) return false;
    const time = now.getTime();
    if (entry.blockedUntil != null && entry.blockedUntil > time) return true;
    if (entry.blockedUntil != null && entry.blockedUntil <= time) entry.blockedUntil = null;
    entry.failures = entry.failures.filter((failure) => failure > time - this.policy.windowMs);
    if (entry.failures.length === 0 && entry.blockedUntil == null) this.entries.delete(principalKey);
    return false;
  }

  async recordFailure(principalKey: string, now: Date): Promise<void> {
    const time = now.getTime();
    const entry = this.entries.get(principalKey) ?? { failures: [], blockedUntil: null };
    entry.failures = entry.failures.filter((failure) => failure > time - this.policy.windowMs);
    entry.failures.push(time);
    if (entry.failures.length >= this.policy.maxFailures) entry.blockedUntil = time + this.policy.lockMs;
    this.entries.set(principalKey, entry);
  }

  async recordSuccess(principalKey: string): Promise<void> {
    this.entries.delete(principalKey);
  }
}

function validatePolicy(policy: AuthenticationThrottlePolicy): void {
  for (const value of [policy.maxFailures, policy.windowMs, policy.lockMs]) {
    if (!Number.isSafeInteger(value) || value < 1) throw new TypeError('Invalid authentication throttle policy.');
  }
}

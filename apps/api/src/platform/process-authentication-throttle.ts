import type { AuthenticationThrottle, AuthenticationThrottlePolicy } from '@taymex/identity';
import { DEFAULT_AUTHENTICATION_THROTTLE_POLICY } from '@taymex/identity';

/**
 * Bounded per-process credential throttle. This is one application-layer defense only;
 * it is deliberately not represented as a distributed/multi-instance guarantee.
 */
export class ProcessAuthenticationThrottle implements AuthenticationThrottle {
  private readonly entries = new Map<string, { failures: number[]; blockedUntil: number | null }>();

  constructor(
    private readonly policy: AuthenticationThrottlePolicy = DEFAULT_AUTHENTICATION_THROTTLE_POLICY,
    private readonly maxPrincipals = 20_000,
  ) {
    if (!Number.isSafeInteger(maxPrincipals) || maxPrincipals < 100 || maxPrincipals > 100_000) throw new RangeError('Invalid authentication throttle capacity.');
  }

  async isBlocked(principalKey: string, now: Date): Promise<boolean> {
    const entry = this.entries.get(principalKey);
    if (!entry) return false;
    const time = now.getTime();
    if (entry.blockedUntil != null && entry.blockedUntil > time) return true;
    this.prune(entry, time);
    if (entry.failures.length === 0 && entry.blockedUntil == null) this.entries.delete(principalKey);
    return false;
  }

  async recordFailure(principalKey: string, now: Date): Promise<void> {
    const time = now.getTime();
    let entry = this.entries.get(principalKey);
    if (!entry) {
      if (this.entries.size >= this.maxPrincipals) this.evict(time);
      entry = { failures: [], blockedUntil: null };
      this.entries.set(principalKey, entry);
    }
    this.prune(entry, time);
    entry.failures.push(time);
    if (entry.failures.length >= this.policy.maxFailures) entry.blockedUntil = time + this.policy.lockMs;
  }

  async recordSuccess(principalKey: string): Promise<void> {
    this.entries.delete(principalKey);
  }

  private prune(entry: { failures: number[]; blockedUntil: number | null }, now: number): void {
    if (entry.blockedUntil != null && entry.blockedUntil <= now) entry.blockedUntil = null;
    entry.failures = entry.failures.filter((failure) => failure > now - this.policy.windowMs);
  }

  private evict(now: number): void {
    for (const [key, entry] of this.entries) {
      this.prune(entry, now);
      if (!entry.failures.length && entry.blockedUntil == null) this.entries.delete(key);
    }
    if (this.entries.size < this.maxPrincipals) return;
    const oldest = this.entries.keys().next().value as string | undefined;
    if (oldest) this.entries.delete(oldest);
  }
}

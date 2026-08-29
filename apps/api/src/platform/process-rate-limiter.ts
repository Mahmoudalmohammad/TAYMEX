export type RateLimitPolicy = Readonly<{ limit: number; windowMs: number }>;

export class ProcessRateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly maxKeys = 20_000) {
    if (!Number.isSafeInteger(maxKeys) || maxKeys < 100 || maxKeys > 100_000) throw new RangeError('Invalid rate-limit key capacity.');
  }

  consume(key: string, policy: RateLimitPolicy, now: Date): Readonly<{ allowed: boolean; retryAfterSeconds: number }> {
    validatePolicy(policy);
    const timestamp = now.getTime();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= timestamp) {
      if (!bucket && this.buckets.size >= this.maxKeys) this.evictExpiredOrOldest(timestamp);
      bucket = { count: 0, resetAt: timestamp + policy.windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - timestamp) / 1000));
    return Object.freeze({ allowed: bucket.count <= policy.limit, retryAfterSeconds });
  }

  private evictExpiredOrOldest(now: number): void {
    for (const [key, value] of this.buckets) {
      if (value.resetAt <= now) this.buckets.delete(key);
    }
    if (this.buckets.size < this.maxKeys) return;
    const oldest = this.buckets.keys().next().value as string | undefined;
    if (oldest) this.buckets.delete(oldest);
  }
}

function validatePolicy(policy: RateLimitPolicy): void {
  if (!Number.isSafeInteger(policy.limit) || policy.limit < 1 || policy.limit > 10_000) throw new RangeError('Invalid rate-limit count.');
  if (!Number.isSafeInteger(policy.windowMs) || policy.windowMs < 1_000 || policy.windowMs > 60 * 60_000) throw new RangeError('Invalid rate-limit window.');
}

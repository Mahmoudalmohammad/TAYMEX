import { randomUUID } from 'node:crypto';

const CORRELATION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u;

export type CorrelationResolution = Readonly<{
  id: string;
  source: 'incoming' | 'generated';
}>;

export interface CorrelationIdGenerator {
  next(): string;
}

export class RandomCorrelationIdGenerator implements CorrelationIdGenerator {
  next(): string {
    return randomUUID();
  }
}

export class CorrelationIdService {
  constructor(private readonly generator: CorrelationIdGenerator = new RandomCorrelationIdGenerator()) {}

  resolve(candidate?: string | null): CorrelationResolution {
    const normalized = candidate?.trim();
    if (normalized && CORRELATION_PATTERN.test(normalized)) {
      return Object.freeze({ id: normalized, source: 'incoming' });
    }
    const generated = this.generator.next().trim();
    if (!CORRELATION_PATTERN.test(generated)) {
      throw new Error('Correlation ID generator returned an invalid identifier.');
    }
    return Object.freeze({ id: generated, source: 'generated' });
  }
}

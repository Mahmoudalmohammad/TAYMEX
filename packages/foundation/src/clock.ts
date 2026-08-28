import { requireValidDate } from './validation.js';

export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FixedClock implements Clock {
  #current: Date;

  constructor(current: Date) {
    this.#current = requireValidDate(current, 'current');
  }

  now(): Date {
    return new Date(this.#current.getTime());
  }

  set(current: Date): void {
    this.#current = requireValidDate(current, 'current');
  }
}

export function toUtcIsoString(value: Date): string {
  return requireValidDate(value, 'instant').toISOString();
}

export function fromUtcIsoString(value: string): Date {
  if (typeof value !== 'string' || !value.endsWith('Z')) {
    throw new TypeError('UTC instant must be an ISO-8601 string ending in Z.');
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new TypeError('UTC instant must use canonical ISO-8601 millisecond form.');
  }
  return parsed;
}

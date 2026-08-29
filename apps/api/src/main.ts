import { createApiApplication } from './application.js';

async function bootstrap(): Promise<void> {
  const app = await createApiApplication();
  await app.listen({
    port: integerEnv('PORT', 3001, 1, 65535),
    host: process.env.HOST?.trim() || '0.0.0.0',
  });
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

void bootstrap();

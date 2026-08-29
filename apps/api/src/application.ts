import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';

const DEFAULT_BODY_LIMIT = 1024 * 1024;

export async function createApiApplication(): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter({
    bodyLimit: integerEnv('HTTP_BODY_LIMIT_BYTES', DEFAULT_BODY_LIMIT, 16 * 1024, 4 * 1024 * 1024),
    trustProxy: false,
    requestTimeout: integerEnv('HTTP_REQUEST_TIMEOUT_MS', 15_000, 1_000, 120_000),
    maxParamLength: 240,
    onProtoPoisoning: 'error',
    onConstructorPoisoning: 'error',
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, { bufferLogs: true });
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: [...allowedOrigins()],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['content-type', 'x-correlation-id'],
    exposedHeaders: ['x-correlation-id'],
    maxAge: 600,
  });
  app.enableShutdownHooks();
  await app.init();
  return app;
}

function allowedOrigins(): readonly string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS?.trim();
  if (!raw) return Object.freeze([]);
  const values = [...new Set(raw.split(',').map((value) => value.trim()).filter(Boolean))];
  for (const origin of values) {
    if (!/^https?:\/\/[^/\s]+(?::\d+)?$/u.test(origin)) throw new TypeError(`Invalid CORS origin: ${origin}`);
  }
  return Object.freeze(values);
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

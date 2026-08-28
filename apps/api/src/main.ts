import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {bufferLogs:true});
  app.setGlobalPrefix('api');
  await app.listen({port:Number(process.env.PORT ?? 3001),host:process.env.HOST ?? '0.0.0.0'});
}
void bootstrap();

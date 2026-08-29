import { Module } from '@nestjs/common';
import { ApiBoundaryModule } from './platform/api-boundary.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';

@Module({ imports: [ApiBoundaryModule, HealthModule, CatalogModule] })
export class AppModule {}

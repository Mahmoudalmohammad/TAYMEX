import { Module } from '@nestjs/common';
import { HealthModule } from './modules/health/health.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
@Module({imports:[HealthModule,CatalogModule]})
export class AppModule {}

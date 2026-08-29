import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ApiRuntimeModule } from './runtime.module.js';
import { HttpSecurityGuard } from './http-security.guard.js';
import { HttpExceptionBoundary } from './http-exception.filter.js';
import { HttpLoggingInterceptor } from './http-logging.interceptor.js';
import { AuthHttpController } from './routes/auth.controller.js';
import { IdentityAdminHttpController } from './routes/identity-admin.controller.js';
import { AuditAdminHttpController } from './routes/audit-admin.controller.js';
import { SettingsAdminHttpController } from './routes/settings-admin.controller.js';

@Module({
  imports: [ApiRuntimeModule],
  controllers: [
    AuthHttpController,
    IdentityAdminHttpController,
    AuditAdminHttpController,
    SettingsAdminHttpController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: HttpSecurityGuard },
    { provide: APP_FILTER, useClass: HttpExceptionBoundary },
    { provide: APP_INTERCEPTOR, useClass: HttpLoggingInterceptor },
  ],
})
export class ApiBoundaryModule {}

import { Controller, Get, Inject } from '@nestjs/common';
import { apiOperations } from '../../generated/api-contracts.generated.js';
import { ApiPolicy } from '../../platform/http-policy.js';
import { API_RUNTIME, type ApiRuntime } from '../../platform/runtime.js';

@Controller()
export class HealthController {
  constructor(@Inject(API_RUNTIME) private readonly runtime: ApiRuntime) {}

  @Get(apiOperations.healthLiveness.nestPath)
  @ApiPolicy(apiOperations.healthLiveness)
  getHealth() {
    return this.runtime.health.liveness();
  }

  @Get(apiOperations.healthReadiness.nestPath)
  @ApiPolicy(apiOperations.healthReadiness)
  getReadiness() {
    return this.runtime.health.readiness();
  }
}

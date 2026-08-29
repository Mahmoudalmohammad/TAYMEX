import { Controller, Get } from '@nestjs/common';
import { apiHealthReporter } from './health-runtime.js';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return apiHealthReporter.liveness();
  }

  @Get('ready')
  async getReadiness() {
    return apiHealthReporter.readiness();
  }
}

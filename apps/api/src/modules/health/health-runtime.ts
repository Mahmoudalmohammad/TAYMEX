import { SystemClock } from '@taymex/foundation';
import { RuntimeHealthReporter } from '@taymex/observability';

export const apiHealthReporter = new RuntimeHealthReporter(
  {
    service: 'taymex-api',
    version: process.env.APP_VERSION?.trim() || '0.0.0-private',
    environment: process.env.NODE_ENV?.trim() || 'development',
    buildRevision: process.env.BUILD_REVISION?.trim() || 'unavailable',
  },
  new SystemClock(),
  [],
);

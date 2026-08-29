import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { API_RUNTIME, createApiRuntime, type ApiRuntime } from './runtime.js';

@Injectable()
class ApiRuntimeLifecycle implements OnApplicationShutdown {
  constructor(@Inject(API_RUNTIME) private readonly runtime: ApiRuntime) {}
  onApplicationShutdown(): Promise<void> {
    return this.runtime.close();
  }
}

@Global()
@Module({
  providers: [
    { provide: API_RUNTIME, useFactory: createApiRuntime },
    ApiRuntimeLifecycle,
  ],
  exports: [API_RUNTIME],
})
export class ApiRuntimeModule {}

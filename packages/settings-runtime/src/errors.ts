import { ApplicationError } from '@taymex/foundation';

export const SETTINGS_RUNTIME_ERROR_CODES = {
  immutable: 'SETTINGS_RUNTIME_IMMUTABLE',
  versionConflict: 'SETTINGS_RUNTIME_VERSION_CONFLICT',
  historyNotFound: 'SETTINGS_RUNTIME_HISTORY_NOT_FOUND',
  applicationVersionMismatch: 'SETTINGS_RUNTIME_APPLICATION_VERSION_MISMATCH',
} as const;

export type SettingsRuntimeErrorCode = (typeof SETTINGS_RUNTIME_ERROR_CODES)[keyof typeof SETTINGS_RUNTIME_ERROR_CODES];

export class SettingsRuntimeError extends ApplicationError {
  readonly code: SettingsRuntimeErrorCode;
  constructor(options: Readonly<{
    code: SettingsRuntimeErrorCode;
    category: 'validation' | 'not-found' | 'conflict';
    message: string;
    safeMessageKey: string;
    details?: Readonly<Record<string, string | number | boolean | null>>;
  }>) {
    super(options);
    this.name = 'SettingsRuntimeError';
    this.code = options.code;
  }
}

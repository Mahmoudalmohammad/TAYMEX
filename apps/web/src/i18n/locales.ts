import { assertSupportedLocale, directionForLocale } from '@taymex/foundation';
import {
  DEFAULT_LOCALE,
  RTL_LOCALES,
  TAYMEX_LOCALES,
  type TaymexLocale,
} from './locales.generated';

export { DEFAULT_LOCALE, RTL_LOCALES, TAYMEX_LOCALES, type TaymexLocale };

export function isTaymexLocale(value: string): value is TaymexLocale {
  return (TAYMEX_LOCALES as readonly string[]).includes(value);
}

export function requireTaymexLocale(value: string): TaymexLocale {
  return assertSupportedLocale(value, TAYMEX_LOCALES);
}

export function direction(locale: TaymexLocale): 'rtl' | 'ltr' {
  return directionForLocale(locale, RTL_LOCALES);
}

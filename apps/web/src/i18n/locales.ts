export const TAYMEX_LOCALES = ['ar', 'tr', 'en'] as const;
export type TaymexLocale = typeof TAYMEX_LOCALES[number];
export const DEFAULT_LOCALE: TaymexLocale = 'ar';
export function isTaymexLocale(value: string): value is TaymexLocale { return (TAYMEX_LOCALES as readonly string[]).includes(value); }
export function direction(locale: TaymexLocale): 'rtl' | 'ltr' { return locale === 'ar' ? 'rtl' : 'ltr'; }

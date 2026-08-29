import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import '@engineering-platform/design-tokens/tokens.css';
import '@engineering-platform/ui/styles.css';
import '@engineering-platform/app-shell/styles.css';
import './taymex-theme.generated.css';
import './taymex.css';
import { DEFAULT_LOCALE, direction, isTaymexLocale } from '../src/i18n/locales';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const requestHeaders=await headers();
  const candidate=requestHeaders.get('x-taymex-locale') ?? DEFAULT_LOCALE;
  const locale=isTaymexLocale(candidate)?candidate:DEFAULT_LOCALE;
  return <html lang={locale} dir={direction(locale)} data-project-theme="taymex" data-theme="light"><body>{children}</body></html>;
}

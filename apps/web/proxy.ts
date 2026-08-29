import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, TAYMEX_LOCALES } from './src/i18n/locales.generated';

export function proxy(request:NextRequest) {
  const firstSegment=request.nextUrl.pathname.split('/').filter(Boolean)[0];
  const locale=(TAYMEX_LOCALES as readonly string[]).includes(firstSegment) ? firstSegment : DEFAULT_LOCALE;
  const requestHeaders=new Headers(request.headers);
  requestHeaders.set('x-taymex-locale',locale);
  return NextResponse.next({request:{headers:requestHeaders}});
}

export const config={matcher:['/((?!_next/static|_next/image|favicon.ico).*)']};

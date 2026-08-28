'use client';
import type { ReactNode } from 'react';
import { AppShell } from '@engineering-platform/app-shell';
import type { TaymexLocale } from '../i18n/locales';
import { messages } from '../i18n/messages';

export function AdminShell({ locale, children }: { locale: TaymexLocale; children: ReactNode }) {
  const t=messages[locale];
  return <AppShell
    brand={<strong>TAYMEX</strong>}
    navigation={[{id:'administration',label:t.administration,items:[{id:'products',label:t.products,href:`/${locale}/admin/products`,current:true}]}]}
    header={{context:<span>{t.administration}</span>}}
    labels={{skipToContent:t.skip,primaryNavigation:t.navigation,mobileNavigation:t.mobileNavigation,openNavigation:t.open,closeNavigation:t.close,collapseNavigation:t.collapse,expandNavigation:t.expand}}
    footer={<small>TAYMEX</small>}
  >{children}</AppShell>;
}

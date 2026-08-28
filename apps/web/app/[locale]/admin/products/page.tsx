import { notFound } from 'next/navigation';
import { CrudPage, PageState } from '@engineering-platform/ui-patterns';
import { AdminShell } from '../../../../src/components/admin-shell';
import { direction, isTaymexLocale } from '../../../../src/i18n/locales';
import { messages } from '../../../../src/i18n/messages';

export default async function ProductsBootstrapPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(!isTaymexLocale(locale)) notFound();
  const t=messages[locale];
  return <div lang={locale} dir={direction(locale)}><AdminShell locale={locale}><CrudPage title={t.products} description={t.platformReady} content={<PageState kind="empty" title={t.platformReady}/>} /></AdminShell></div>;
}

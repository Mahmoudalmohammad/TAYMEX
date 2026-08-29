import { notFound } from 'next/navigation';
import { Card, PageHeader } from '@engineering-platform/ui';
import { direction, isTaymexLocale } from '../../src/i18n/locales';
import { messages } from '../../src/i18n/messages';

export default async function LocaleHome({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;
  if(!isTaymexLocale(locale)) notFound();
  const t=messages[locale];
  return <main lang={locale} dir={direction(locale)} data-taymex-public-home>
    <PageHeader title="TAYMEX" description={t.publicIntro}/>
    <div data-taymex-card-grid>
      <Card title={t.products}><p>{t.productsIntro}</p><p><a href={`/${locale}/admin/products`}>{t.openSection}</a></p></Card>
      <Card title={t.foundationUi}><p>{t.foundationIntro}</p><p><a href={`/${locale}/foundation/ui`}>{t.openSection}</a></p></Card>
    </div>
  </main>;
}

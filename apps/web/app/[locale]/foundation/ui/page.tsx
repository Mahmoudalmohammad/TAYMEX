import { notFound } from 'next/navigation';
import { AdminShell } from '../../../../src/components/admin-shell';
import { F8ReferenceSurface } from '../../../../src/components/f8-reference-surface';
import { uiFormatExamples } from '../../../../src/i18n/formatting';
import { direction, isTaymexLocale } from '../../../../src/i18n/locales';
import { uiReferenceMessages } from '../../../../src/i18n/ui-reference-messages';

export default async function UiFoundationPage({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;
  if(!isTaymexLocale(locale)) notFound();
  const copy=uiReferenceMessages[locale];
  return <div lang={locale} dir={direction(locale)}><AdminShell locale={locale} current="ui-foundation"><F8ReferenceSurface copy={copy} formats={uiFormatExamples(locale)}/></AdminShell></div>;
}

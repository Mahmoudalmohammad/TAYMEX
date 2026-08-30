import type { TaymexLocale } from './locales';

const localeTags: Record<TaymexLocale,string> = { ar:'ar-SY', tr:'tr-TR', en:'en-US' };
export interface UiFormatExamples { number:string; currency:string; date:string; unit:string; }
export function uiFormatExamples(locale:TaymexLocale):UiFormatExamples {
  const tag=localeTags[locale];
  return {
    number:new Intl.NumberFormat(tag,{maximumFractionDigits:2}).format(1234567.89),
    currency:new Intl.NumberFormat(tag,{style:'currency',currency:'USD'}).format(12450.75),
    date:new Intl.DateTimeFormat(tag,{dateStyle:'medium',timeZone:'UTC'}).format(new Date('2026-08-29T00:00:00Z')),
    // ECMA-402 only accepts sanctioned unit identifiers here. Solar units such as kW/kWh
    // remain canonical TAYMEX quantity codes and are not passed to Intl.NumberFormat unit style.
    unit:new Intl.NumberFormat(tag,{style:'unit',unit:'celsius',unitDisplay:'short',maximumFractionDigits:1}).format(5),
  };
}

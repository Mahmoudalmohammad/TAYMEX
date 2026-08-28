import type { TaymexLocale } from './locales';
export const messages: Record<TaymexLocale, {products:string; administration:string; platformReady:string; skip:string; navigation:string; mobileNavigation:string; open:string; close:string; collapse:string; expand:string}> = {
  ar: {products:'المنتجات',administration:'الإدارة',platformReady:'جاهز لبدء الشريحة العمودية للمنتجات',skip:'انتقل إلى المحتوى',navigation:'التنقل الرئيسي',mobileNavigation:'التنقل على الهاتف',open:'فتح القائمة',close:'إغلاق القائمة',collapse:'طي القائمة',expand:'توسيع القائمة'},
  tr: {products:'Ürünler',administration:'Yönetim',platformReady:'Ürünler dikey dilimine başlamaya hazır',skip:'İçeriğe geç',navigation:'Ana gezinme',mobileNavigation:'Mobil gezinme',open:'Menüyü aç',close:'Menüyü kapat',collapse:'Menüyü daralt',expand:'Menüyü genişlet'},
  en: {products:'Products',administration:'Administration',platformReady:'Ready to begin the Products vertical slice',skip:'Skip to content',navigation:'Primary navigation',mobileNavigation:'Mobile navigation',open:'Open navigation',close:'Close navigation',collapse:'Collapse navigation',expand:'Expand navigation'}
};

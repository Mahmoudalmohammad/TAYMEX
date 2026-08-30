import type { TaymexLocale } from './locales';

export interface UiReferenceCopy {
  pageTitle: string; pageDescription: string; foundation: string; themeLight: string; themeDark: string;
  introTitle: string; introBody: string; formTitle: string; formDescription: string; profileSection: string; profileDescription: string;
  name: string; namePlaceholder: string; email: string; emailStatus: string; password: string; showPassword: string; hidePassword: string;
  passwordHint: string; role: string; roleDescription: string; roleAdmin: string; roleEditor: string; roleViewer: string;
  language: string; languageAr: string; languageTr: string; languageEn: string; consent: string; notifications: string;
  upload: string; uploadDescription: string; chooseFile: string; noFile: string; save: string; saving: string; cancel: string; disabledAction: string;
  dataTitle: string; search: string; clearSearch: string; tableLabel: string; colName: string; colStatus: string; colAmount: string;
  statusActive: string; statusDraft: string; pagination: string; previous: string; next: string; pageOfTemplate: string;
  feedbackTitle: string; successTitle: string; successBody: string; toastTitle: string; toastBody: string; modalOpen: string; modalTitle: string;
  modalBody: string; modalClose: string; tabsLabel: string; emptyTab: string; loadingTab: string; emptyTitle: string; emptyBody: string; loadingLabel: string;
  formattingTitle: string; numberLabel: string; currencyLabel: string; dateLabel: string; unitLabel: string; mixedLabel: string; mixedValue: string;
}

export const uiReferenceMessages: Record<TaymexLocale, UiReferenceCopy> = {
  ar: {
    pageTitle:'مرجع واجهة TAYMEX', pageDescription:'سطح إثبات واحد للمكونات والحالات والاستجابة والاتجاه والتنسيق المحلي.', foundation:'أساس الواجهة', themeLight:'الوضع الفاتح', themeDark:'الوضع الداكن',
    introTitle:'عقد واجهة واحد', introBody:'هذه الصفحة تستهلك مكونات المنصة المقفلة فقط، وتستخدم الحالات والسلوكيات نفسها التي ستستخدمها الشاشات الفعلية.',
    formTitle:'النماذج وحالات الحقول', formDescription:'حقول موحدة مع تسميات ووصف وحالات نجاح وتعطيل وتحميل.', profileSection:'بيانات الحساب', profileDescription:'مثال تمثيلي لا يحفظ بيانات حقيقية.',
    name:'الاسم', namePlaceholder:'أدخل الاسم', email:'البريد الإلكتروني', emailStatus:'صيغة البريد صالحة', password:'كلمة المرور', showPassword:'إظهار', hidePassword:'إخفاء', passwordHint:'استخدم كلمة مرور طويلة وفريدة.',
    role:'الدور', roleDescription:'اختر دورًا واحدًا.', roleAdmin:'مدير', roleEditor:'محرر', roleViewer:'مشاهد', language:'اللغة', languageAr:'العربية', languageTr:'التركية', languageEn:'الإنجليزية', consent:'أوافق على الشروط', notifications:'إشعارات التشغيل',
    upload:'صورة الحساب', uploadDescription:'PNG أو JPEG فقط في المسار الفعلي.', chooseFile:'اختيار ملف', noFile:'لم يتم اختيار ملف', save:'حفظ', saving:'جارٍ الحفظ', cancel:'إلغاء', disabledAction:'غير متاح',
    dataTitle:'الجداول والبحث', search:'بحث', clearSearch:'مسح البحث', tableLabel:'جدول تمثيلي', colName:'العنصر', colStatus:'الحالة', colAmount:'القيمة', statusActive:'نشط', statusDraft:'مسودة', pagination:'ترقيم الصفحات', previous:'السابق', next:'التالي', pageOfTemplate:'الصفحة {page} من {count}',
    feedbackTitle:'الرسائل والحالات', successTitle:'تم التحقق', successBody:'رسالة حالة واضحة دون الاعتماد على اللون وحده.', toastTitle:'تم الحفظ', toastBody:'مثال رسالة قصيرة غير حاجبة.', modalOpen:'فتح نافذة', modalTitle:'تأكيد الإجراء', modalBody:'النوافذ الحاجبة للحالات التي تحتاج تركيزًا واضحًا فقط.', modalClose:'إغلاق', tabsLabel:'حالات الصفحة', emptyTab:'فارغ', loadingTab:'تحميل', emptyTitle:'لا توجد نتائج', emptyBody:'غيّر عوامل التصفية أو أضف عنصرًا جديدًا.', loadingLabel:'جارٍ تحميل المحتوى',
    formattingTitle:'التنسيق والكتابة المختلطة', numberLabel:'رقم', currencyLabel:'عملة', dateLabel:'تاريخ', unitLabel:'وحدة', mixedLabel:'نص مختلط', mixedValue:'TAYMEX Solar 5 kW — نموذج 2026'
  },
  tr: {
    pageTitle:'TAYMEX arayüz referansı', pageDescription:'Bileşenler, durumlar, duyarlılık, yön ve yerel biçimlendirme için tek kanıt yüzeyi.', foundation:'Arayüz temeli', themeLight:'Açık tema', themeDark:'Koyu tema',
    introTitle:'Tek arayüz sözleşmesi', introBody:'Bu sayfa yalnızca kilitli platform bileşenlerini tüketir ve gerçek ekranların kullanacağı aynı durum ve davranışları gösterir.',
    formTitle:'Formlar ve alan durumları', formDescription:'Etiket, açıklama, başarı, devre dışı ve yükleme durumları ortak kurallara bağlıdır.', profileSection:'Hesap bilgileri', profileDescription:'Gerçek veri kaydetmeyen temsili örnek.',
    name:'Ad', namePlaceholder:'Ad girin', email:'E-posta', emailStatus:'E-posta biçimi geçerli', password:'Parola', showPassword:'Göster', hidePassword:'Gizle', passwordHint:'Uzun ve benzersiz bir parola kullanın.',
    role:'Rol', roleDescription:'Tek bir rol seçin.', roleAdmin:'Yönetici', roleEditor:'Editör', roleViewer:'Görüntüleyici', language:'Dil', languageAr:'Arapça', languageTr:'Türkçe', languageEn:'İngilizce', consent:'Koşulları kabul ediyorum', notifications:'Operasyon bildirimleri',
    upload:'Profil görseli', uploadDescription:'Gerçek akışta yalnızca PNG veya JPEG.', chooseFile:'Dosya seç', noFile:'Dosya seçilmedi', save:'Kaydet', saving:'Kaydediliyor', cancel:'İptal', disabledAction:'Kullanılamıyor',
    dataTitle:'Tablolar ve arama', search:'Ara', clearSearch:'Aramayı temizle', tableLabel:'Temsili tablo', colName:'Öğe', colStatus:'Durum', colAmount:'Değer', statusActive:'Aktif', statusDraft:'Taslak', pagination:'Sayfalama', previous:'Önceki', next:'Sonraki', pageOfTemplate:'Sayfa {page} / {count}',
    feedbackTitle:'Mesajlar ve durumlar', successTitle:'Doğrulandı', successBody:'Yalnız renge dayanmayan açık durum mesajı.', toastTitle:'Kaydedildi', toastBody:'Engelleyici olmayan kısa bildirim örneği.', modalOpen:'Pencereyi aç', modalTitle:'İşlemi onayla', modalBody:'Modal yalnızca açık odak gerektiren engelleyici durumlar içindir.', modalClose:'Kapat', tabsLabel:'Sayfa durumları', emptyTab:'Boş', loadingTab:'Yükleniyor', emptyTitle:'Sonuç yok', emptyBody:'Filtreleri değiştirin veya yeni bir öğe ekleyin.', loadingLabel:'İçerik yükleniyor',
    formattingTitle:'Yerel biçimlendirme ve karışık yazı', numberLabel:'Sayı', currencyLabel:'Para birimi', dateLabel:'Tarih', unitLabel:'Birim', mixedLabel:'Karışık metin', mixedValue:'TAYMEX Solar 5 kW — model 2026'
  },
  en: {
    pageTitle:'TAYMEX UI reference', pageDescription:'One proof surface for components, states, responsiveness, direction and locale formatting.', foundation:'UI foundation', themeLight:'Light theme', themeDark:'Dark theme',
    introTitle:'One interface contract', introBody:'This page consumes locked platform components only and exercises the same states and behaviours real screens will use.',
    formTitle:'Forms and field states', formDescription:'Shared labels, descriptions, success, disabled and loading states.', profileSection:'Account details', profileDescription:'Representative example that does not persist real data.',
    name:'Name', namePlaceholder:'Enter a name', email:'Email', emailStatus:'Email format is valid', password:'Password', showPassword:'Show', hidePassword:'Hide', passwordHint:'Use a long, unique password.',
    role:'Role', roleDescription:'Choose one role.', roleAdmin:'Administrator', roleEditor:'Editor', roleViewer:'Viewer', language:'Language', languageAr:'Arabic', languageTr:'Turkish', languageEn:'English', consent:'I accept the terms', notifications:'Operational notifications',
    upload:'Profile image', uploadDescription:'PNG or JPEG only in the real path.', chooseFile:'Choose file', noFile:'No file selected', save:'Save', saving:'Saving', cancel:'Cancel', disabledAction:'Unavailable',
    dataTitle:'Tables and search', search:'Search', clearSearch:'Clear search', tableLabel:'Representative table', colName:'Item', colStatus:'Status', colAmount:'Value', statusActive:'Active', statusDraft:'Draft', pagination:'Pagination', previous:'Previous', next:'Next', pageOfTemplate:'Page {page} of {count}',
    feedbackTitle:'Messages and states', successTitle:'Validated', successBody:'A clear status message that does not depend on colour alone.', toastTitle:'Saved', toastBody:'Example of a short non-blocking notification.', modalOpen:'Open dialog', modalTitle:'Confirm action', modalBody:'Use blocking overlays only for tasks that need explicit focus.', modalClose:'Close', tabsLabel:'Page states', emptyTab:'Empty', loadingTab:'Loading', emptyTitle:'No results', emptyBody:'Change the filters or add a new item.', loadingLabel:'Loading content',
    formattingTitle:'Locale formatting and mixed script', numberLabel:'Number', currencyLabel:'Currency', dateLabel:'Date', unitLabel:'Unit', mixedLabel:'Mixed text', mixedValue:'TAYMEX Solar 5 kW — model 2026'
  }
};

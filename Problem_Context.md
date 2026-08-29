لدي المحادثة التالية 
نعم، وهذه برأيي **المشكلة الأهم من اختيار التقنية نفسها**.

إذا كان لدينا Architecture ممتازة ثم أعطينا الوكيل مهمة مثل:

> “نفّذ Module المنتجات وفق الخطة”

فغالبًا سيقرأ جزءًا من الخطة، يختصرها، يتخذ قرارات من عنده، ثم بعد عدة Tasks يصبح المشروع مختلفًا تدريجيًا عن الـBlueprint.

الحل ليس كتابة خطة أطول، بل جعل الخطة **قابلة للإنفاذ آليًا**.

## ما أقترحه لـ TAYMEX

نجعل المشروع مبنيًا على 4 طبقات حاكمة:

```text
Architecture
      ↓
Executable Specifications
      ↓
Agent Tasks
      ↓
Automated Gates
```

أي أن الوكيل **لا يملك حرية تفسير الخطة بالكامل**.

---

# 1. الخطة ليست Markdown فقط

بدل ملف ضخم مثل:

`ARCHITECTURE.md`

نقسمها إلى ملفات صغيرة قابلة للفحص:

```text
/docs
 ├── architecture/
 │    ├── 00-system-overview.md
 │    ├── 01-domain-boundaries.md
 │    ├── 02-data-ownership.md
 │    ├── 03-security.md
 │    └── 04-i18n.md
 │
 ├── modules/
 │    ├── products/
 │    │    ├── SPEC.md
 │    │    ├── API.md
 │    │    ├── DATA_MODEL.md
 │    │    ├── RULES.md
 │    │    └── ACCEPTANCE.md
 │    │
 │    ├── solar/
 │    └── quotations/
 │
 └── adr/
```

وبذلك الوكيل المكلف بالـProducts لا يحتاج قراءة 400 صفحة.

يأخذ فقط:

* القواعد العامة
* Spec الخاص به
* الـContracts المرتبطة به

---

# 2. كل مهمة للوكيل تصبح Contract

لا نعطيه:

> أنشئ Product Management.

بل شيئًا مثل:

```yaml
task: PRODUCT-014

objective:
  Implement product creation API.

allowed_files:
  - apps/api/src/modules/products/**
  - packages/contracts/products/**

forbidden_files:
  - apps/commerce/**
  - services/solar-engine/**
  - packages/auth/**

must_follow:
  - docs/modules/products/SPEC.md
  - docs/modules/products/API.md
  - docs/architecture/02-data-ownership.md

requirements:
  - multilingual name AR/TR/EN
  - no hardcoded locale
  - audit event on create
  - permission products.create
  - validation through shared schema

tests_required:
  - unit
  - integration
  - permission test
  - rtl/ltr UI test if applicable

acceptance:
  - AC-PROD-01
  - AC-PROD-04
  - AC-I18N-02
```

هنا الوكيل أصبح **منفذًا لعقد** وليس مهندسًا يعيد اختراع المشروع.

---

# 3. ممنوع تعديل ملفات خارج Scope

هذه من أقوى القواعد.

إذا الوكيل يعمل على Solar Calculator فلا يحق له فجأة تعديل:

`auth`
أو
`commerce`
أو
`design-system`

إلا إذا ظهرت Dependency فعلية.

وفي هذه الحالة لا يعدلها.

بل ينشئ:

```text
BLOCKER-REQUEST.md
```

مثلاً:

> Solar Engine requires a new ProductCompatibility contract.

ثم يأتي Orchestrator أو Agent مسؤول ويقرر.

هذا يمنع أكثر مشكلة أراها في المشاريع متعددة الوكلاء:

> Agent يصلح مشكلة محلية ويكسر Architecture عالمية.

---

# 4. Definition of Done إلزامية

كل Feature لها Definition of Done موحدة.

مثلًا لا تعتبر المهمة مكتملة حتى:

* الكود يطابق Spec.
* Tests ناجحة.
* لا توجد تغييرات خارج Scope.
* لا توجد Hardcoded translations.
* AR/TR/EN موجودة.
* RTL/LTR تم اختباره.
* Permission موجودة.
* Audit موجود.
* Logs صحيحة.
* API contract لم يتغير.
* Documentation محدثة.
* لا توجد TODO غير مسجلة.

إذا فشل واحد:

**Task = Failed**

حتى لو “الواجهة تعمل”.

---

# 5. Acceptance Tests تكتب قبل التنفيذ

هذه نقطة حاسمة جدًا.

قبل أن يبدأ الوكيل:

```text
AC-SOLAR-001
Given:
  house load = 12 kWh/day
  backup = 8 hours

When:
  assessment is calculated

Then:
  result contains:
  - daily_energy
  - peak_load
  - inverter_size
  - battery_capacity
  - pv_capacity
```

ثم Agent ينفذ حتى تنجح الاختبارات.

وليس:

> نفذ أولًا ثم نرى هل يناسب الخطة.

---

# 6. Architecture Tests

يمكننا حتى اختبار الـArchitecture بالكود.

مثلاً:

```text
Solar module
MUST NOT
import Commerce repositories directly.
```

بل يجب استخدام:

```text
ProductCatalogPort
```

أو:

```text
CommerceContract
```

وكذلك:

```text
Admin UI
MUST NOT
query database directly.
```

و:

```text
AI
MUST NOT
calculate solar sizing.
```

هذه قواعد يمكن فحصها داخل CI.

وهنا يتحول الـArchitecture من “نصيحة” إلى **قانون**.

---

# 7. Code Owners

لكل منطقة Owner.

مثلاً:

```text
/services/solar-engine/**     → Solar Architecture
/apps/api/src/auth/**         → Platform Core
/apps/commerce/**             → Commerce
/packages/design-system/**    → UI Foundation
```

Agent يعمل في Products لا يستطيع اعتماد تعديل في Auth.

حتى لو كان هو نفسه الوكيل تقنيًا، الـworkflow يمنعه.

---

# 8. Agent لا يكتب Plan جديدًا من عنده

هذه مشكلة متكررة جدًا.

نعطيه:

> Do not redesign the architecture.

ومسموح له فقط بثلاث حالات:

### IMPLEMENT

الخطة واضحة، ينفذ.

### BLOCK

الخطة غير قابلة للتنفيذ.

### RFC

وجد تحسينًا معماريًا.

لكن لا ينفذ الـRFC بنفسه.

مثلاً:

```text
RFC-017
Current specification requires X.
I recommend Y because...
Impact:
...
```

ثم نقرر نحن.

---

# 9. فصل Architect Agent عن Implementer Agent

هذه فكرة مهمة جدًا.

لا أجعل نفس الوكيل:

**يقرر + ينفذ + يراجع نفسه.**

نعمل مثلًا:

```text
Architect
    ↓
Task Spec
    ↓
Implementer
    ↓
Reviewer
    ↓
QA
```

### Architect Agent

لا يكتب Production code.

### Implementer

لا يعدل Architecture.

### Reviewer

لا يصلح الكود مباشرة.

فقط يقول:

```text
PASS
FAIL
BLOCK
```

### QA Agent

يشغل Acceptance Tests.

هذا يقلل Drift جدًا.

---

# 10. Context صغير للوكيل

أحد أسباب تجاهل الخطة هو أننا نعطي Agent:

> اقرأ المشروع كله.

ثم يدخل في ملايين Tokens.

الأفضل:

```text
Task Context Pack
```

يتولد تلقائيًا لكل مهمة.

مثلاً:

```text
TASK_CONTEXT/
 ├── TASK.md
 ├── SPEC.md
 ├── API_CONTRACT.md
 ├── DATA_MODEL.md
 ├── RULES.md
 ├── ACCEPTANCE.md
 └── RELEVANT_FILES.txt
```

ولا يحتاج أي شيء آخر.

---

# 11. منع Agent من “التبسيط الذكي”

نضع قواعد صريحة مثل:

```text
DO NOT:
- replace architecture with simpler alternative
- remove existing abstraction
- merge modules
- introduce new dependencies
- rename public contracts
- bypass permission layer
- bypass localization
- bypass settings system
```

لأن كثيرًا من الوكلاء عندما يرون Architecture منظمة يقولون:

> يمكنني تنفيذها بطريقة أبسط.

وهنا يبدأ الانهيار.

---

# 12. Every Task Produces Evidence

ليس:

> Done ✅

بل:

```text
IMPLEMENTATION_REPORT.md
```

يحتوي:

```text
Task: PRODUCT-014

Changed files:
...

Requirements implemented:
REQ-01 ✅
REQ-02 ✅
REQ-03 ✅

Acceptance:
AC-01 PASS
AC-02 PASS

Tests:
Unit: 24/24
Integration: 8/8

Architecture deviations:
NONE

Known issues:
NONE
```

وبالتالي نعرف ماذا فعل.

---

# 13. Plan Traceability

كل Requirement له ID.

مثلاً:

```text
REQ-PROD-001
REQ-PROD-002
REQ-SOLAR-001
REQ-AUTH-004
```

ثم في الكود والاختبارات:

```text
REQ-SOLAR-014
```

وهكذا نستطيع أن نسأل النظام:

> هل تم تنفيذ REQ-SOLAR-014؟

بدل مراجعة 200 ملف.

---

# 14. قاعدة مهمة جدًا

## الوكيل لا يعلن المهمة مكتملة.

الـCI هو الذي يعلنها مكتملة.

أي:

```text
Agent says DONE
      ↓
CI
      ↓
Architecture checks
Tests
Security
Lint
Contracts
Translations
RTL/LTR
      ↓
PASS
      ↓
DONE
```

هذه وحدها تغير جودة العمل جذريًا.

---

# 15. بالنسبة لـ TAYMEX بالتحديد

سأضع في الجذر شيئًا مثل:

```text
AGENTS.md
```

لكن لا يكون مجرد تعليمات عامة.

بل:

```text
# TAYMEX EXECUTION CONSTITUTION

1. Architecture is immutable during implementation.
2. Module boundaries are mandatory.
3. No cross-domain DB access.
4. No hardcoded user-facing text.
5. AR/TR/EN mandatory.
6. RTL/LTR mandatory.
7. All configurable behavior uses Settings.
8. Solar calculations cannot be performed by AI.
9. AI outputs never modify critical business data without validation.
10. Every mutation requires permission check where applicable.
11. Every critical mutation generates audit event.
12. Public contracts cannot change without ADR.
13. No new dependency without approval.
14. No changes outside task scope.
15. Tests and acceptance criteria are mandatory.
```

هذا يصبح **دستور المشروع**.

---

# 16. ثم نضيف Machine-readable rules

مثلاً:

```text
/project-rules/
 ├── architecture.yml
 ├── dependencies.yml
 ├── permissions.yml
 ├── translations.yml
 ├── ownership.yml
 └── quality-gates.yml
```

لأن الوكيل يستطيع تجاهل نص Markdown بالخطأ.

لكن من الصعب عليه تجاوز CI يفشل بسبب:

```text
Architecture violation:
solar-engine imports commerce database model
```

---

# 17. والأفضل أن يكون التنفيذ Feature-by-Feature

لا نقول للوكيل:

> ابنِ لوحة الإدارة.

هذه مهمة ضخمة جدًا.

بل:

```text
ADMIN-001 Layout
ADMIN-002 Navigation
ADMIN-003 Dashboard shell
ADMIN-004 User table
ADMIN-005 User filtering
ADMIN-006 User permissions
ADMIN-007 User audit
...
```

كل واحدة:

صغيرة
محددة
قابلة للاختبار
يمكن الرجوع عنها.

---

# 18. لا نستخدم Multi-Agent بشكل عشوائي

أحد الأخطاء:

```text
Agent A → products
Agent B → orders
Agent C → auth
Agent D → UI
```

وكلهم يعملون في نفس الوقت من البداية.

هذا ينتج Merge Hell.

الأفضل يكون لدينا Dependencies Graph:

```text
Core Contracts
      ↓
Auth / i18n / Settings
      ↓
Products
      ↓
Commerce
      ↓
Solar
      ↓
Quotations
```

ويعمل الوكلاء Parallel فقط عندما تكون الـDomains مستقلة فعليًا.

---

# ما أراه الحل النهائي

نحن لا نحتاج فقط:

## Technical Blueprint

بل نحتاج وثيقتين مختلفتين:

### 1. TAYMEX Architecture Blueprint

تقول **ماذا سنبني ولماذا**.

### 2. TAYMEX Agent Execution System

تقول **كيف يمنع الوكلاء من مخالفة الـBlueprint**.

وهذه الثانية برأيي لا تقل أهمية عن الأولى.

---

## البنية التي أريدها في الجذر

```text
TAYMEX/
│
├── AGENTS.md
├── ARCHITECTURE.md
├── REQUIREMENTS.md
│
├── docs/
│   ├── architecture/
│   ├── modules/
│   ├── adr/
│   └── workflows/
│
├── project-rules/
│   ├── architecture.yml
│   ├── dependencies.yml
│   ├── ownership.yml
│   ├── quality-gates.yml
│   └── localization.yml
│
├── tasks/
│   ├── backlog/
│   ├── ready/
│   ├── in-progress/
│   ├── review/
│   └── done/
│
└── scripts/
    ├── validate-architecture
    ├── validate-i18n
    ├── validate-task-scope
    └── validate-acceptance
```

وبهذا عندما نستخدم Codex أو أي Agent آخر، لا نقول له:

> “ابنِ TAYMEX.”

بل:

> “نفذ `TASK-SOLAR-017` وفق الـContract. لا يسمح بتعديل أي ملف خارج القائمة. لا تعتبر المهمة مكتملة قبل نجاح جميع Gates.”

هنا **نحوّل الوكيل من شريك يتخذ قرارات إلى منفذ منضبط داخل نظام هندسي**.

وهذا بالضبط ما أراه ضروريًا قبل أن نكتب أول سطر إنتاجي في TAYMEX.

-----------------------
تحدث المشكلة عند حدوث اخطاء او عدم التصميم بشكل صحيح او جيد وبالتالي عند اصلاح المشاكل يتم انشاؤ مشاكل اخرى تغافل امور تكرار اكواد - كتابة بطريقة مختلفة وليس بنمط المشروع او حتى اختراع ملفات وبنى جديدة 
هذا واجهته بمشروع حربوء كثيرا وخاصة في الواجهة الامامية 
لديجة انني كل ماريد تنفيذ صفحة اعطيه كل مرة القواعد md التصميمة اللازمة والصفحة المرجعية 
--------------------------
نعم، الآن وصلنا إلى **جذر المشكلة الحقيقي** التي واجهتها في Harbuk، وخصوصًا بالواجهة الأمامية.

المشكلة ليست أن الوكيل لا يقرأ القواعد. غالبًا يقرأها، وينفذ أول مرة بشكل مقبول. المشكلة تظهر عند دورة:

**تنفيذ → مشكلة بصرية → إصلاح → مشكلة جانبية → إصلاح جديد → Drift**

وبعد عدة جولات تبدأ ترى بالضبط ما وصفته:

* Component جديد يشبه Component موجود أصلًا.
* CSS جديد بدل استخدام الـDesign System.
* ملفات `helpers` أو `utils` مخترعة دون حاجة.
* الصفحة أصبحت تعمل لكن بأسلوب مختلف عن باقي المشروع.
* duplication.
* أسماء مختلفة لنفس المفهوم.
* Tailwind classes عشوائية.
* معالجة خاصة للصفحة تكسر Responsive أو RTL.
* إصلاح عنصر يفسد عنصرًا آخر.
* Agent ينسى المرجع الذي أعطيته له قبل 3 رسائل.

والحل هنا ليس أن نستمر بإعطائه كل مرة:

`rules.md + design.md + reference page`

بل يجب أن **نزيل منه أصلًا القدرة على مخالفة النظام بسهولة**.

## الفكرة الأساسية

في TAYMEX لا أريد Frontend مفتوحًا بحيث يستطيع الوكيل كتابة أي HTML/CSS يراه مناسبًا.

أريده **Closed Frontend System**.

أي أن الصفحة الجديدة لا "تُصمَّم".

بل يتم **تركيبها من نظام موجود مسبقًا**:

```text
Design Tokens
      ↓
Primitives
      ↓
Components
      ↓
Patterns
      ↓
Page Templates
      ↓
Pages
```

كلما صعدنا للأعلى تقل حرية الوكيل.

---

## أول شيء: نتوقف عن بناء الصفحات مباشرة

قبل أول صفحة فعلية في TAYMEX، نبني:

```text
packages/design-system/
```

ويحتوي مثلًا:

```text
tokens/
    colors
    spacing
    typography
    radius
    shadows
    breakpoints
    z-index

primitives/
    Button
    Input
    Select
    Checkbox
    Dialog
    Popover
    Tooltip
    Icon
    Typography

components/
    PageHeader
    DataTable
    FilterBar
    SearchBox
    StatCard
    InfoCard
    FormSection
    StatusBadge
    EmptyState
    Pagination
    FileUploader
    LanguageTabs
    ConfirmDialog

layouts/
    AdminLayout
    PortalLayout
    PublicLayout

patterns/
    CrudPage
    EditFormPage
    DetailsPage
    SettingsPage
    DashboardPage
    WizardPage
```

ثم تأتي الصفحة.

مثلاً إدارة المنتجات لا يجب أن يكتب لها Agent تصميمًا جديدًا.

بل:

```tsx
<AdminLayout>
  <CrudPage>
    <PageHeader />
    <Stats />
    <FilterBar />
    <DataTable />
    <Pagination />
  </CrudPage>
</AdminLayout>
```

هنا حتى لو كان الوكيل متوسط الجودة، **مجال الخطأ البصري أصبح صغيرًا جدًا**.

---

# ما فعلته في Harbuk كان Reference by Documentation

كنت تقول له تقريبًا:

> هذه القواعد MD
> وهذه الصفحة المرجعية
> ابنِ مثلها.

وهذا جيد بشريًا، لكنه ضعيف مع Agent.

في TAYMEX نريد:

# Reference by Implementation

بدل أن تقول له:

> انظر إلى صفحة المستخدمين.

نعطيه Component:

```text
AdminCrudPage
```

هو نفسه الذي تستخدمه صفحة المستخدمين.

فلا يعود يستطيع "تقليدها بطريقة مختلفة".

---

# ونبني عدة Golden Pages فقط

لا نحتاج صفحة مرجعية لكل شيء.

نبني يدويًا وبجودة عالية 5–7 صفحات نسميها:

### Golden References

مثل:

```text
golden/
    dashboard
    crud-list
    form
    details
    settings
    wizard
    storefront-product
```

هذه ليست فقط Screenshots.

بل **Implementation فعلي معتمد**.

مثلاً:

### Golden CRUD Page

تحدد:

* Header.
* Actions.
* Search.
* Filters.
* Stats.
* Table.
* Bulk actions.
* Pagination.
* Mobile cards.
* Loading.
* Empty.
* Error.

بعدها أي صفحة CRUD في النظام تستخدم **نفس Pattern**.

Products
Customers
Orders
Users
Quotations

كلها Composition لنفس النظام.

---

# أهم قاعدة في المشروع

## ممنوع Page-specific reinvention

مثلاً Agent يرى أنه يحتاج Card.

لا يسمح له بكتابة:

```tsx
<div className="rounded-xl bg-white p-5 shadow-sm">
```

من عنده.

بل يجب:

```tsx
<Card>
```

وإذا Card غير موجود:

**يتوقف.**

ولا يخترع واحدًا.

---

# نفس الشيء في Tailwind

هذه كانت غالبًا إحدى أسباب Harbuk.

Tailwind يعطي الوكيل حرية هائلة:

```text
p-3
p-4
p-5
p-6

rounded-lg
rounded-xl
rounded-2xl

text-gray-500
text-slate-600
text-neutral-700
```

كلها قد تبدو صحيحة محليًا، وبعد 100 صفحة يصبح المشروع غير متناسق.

في TAYMEX نمنع ذلك.

مثلاً:

```text
surface-default
surface-muted

text-primary
text-secondary
text-danger

space-section
space-card

radius-control
radius-card
radius-modal
```

والوكيل لا يقرر القيم.

---

# والأهم: نمنع Arbitrary Values

مثل:

```text
w-[437px]
mt-[13px]
text-[15px]
rounded-[11px]
```

إلا بحالة نادرة جدًا.

لأن هذه أسرع طريقة لتحويل المشروع إلى خليط Patch فوق Patch.

---

# RTL/LTR كذلك لا نتركه للوكيل

بدل أن نتوقع منه أن يتذكر دائمًا:

```css
margin-right
padding-left
left: 0
```

نمنعها أصلًا في Components المشتركة.

نعتمد فقط:

```css
margin-inline-start
padding-inline-end
inset-inline-start
text-align: start
```

وبذلك:

Arabic
Turkish
English

كلها تعمل من نفس Component.

---

# ثم نحل أكبر مشكلة: الإصلاحات

في Harbuk غالبًا السيناريو كان:

> الصفحة فيها مشكلة.

فيقوم Agent بفتح الصفحة ويرى أسرع Patch ممكن.

وهذا خطأ.

في TAYMEX يجب أن يكون لدينا:

# Repair Protocol

عند وجود مشكلة، الوكيل لا يصلح مباشرة.

أول شيء يصنف المشكلة:

```text
TOKEN
COMPONENT
PATTERN
PAGE
DATA
RESPONSIVE
RTL
```

مثلاً:

هناك مشكلة في Padding داخل كل Cards.

لا يصلح:

```text
products/page.tsx
```

بل يصلح:

```text
Card
```

إذا المشكلة موجودة في Component.

وبذلك **إصلاح واحد يصلح المشروع كله**.

---

# وهذا قانون مهم جدًا

قبل أي Fix:

> Find the lowest shared layer responsible for the defect.

مثلاً:

```text
Page
 ↓
Pattern
 ↓
Component
 ↓
Primitive
 ↓
Token
```

ابحث عن أدنى طبقة مسؤولة.

ولا تعمل Patch في Page إلا إذا المشكلة فعلًا خاصة بها.

هذا وحده يمنع 70% تقريبًا من الفوضى التي وصفتها.

---

# أيضًا نمنع "Fix by duplication"

مثلاً الوكيل يقول:

> DataTable الحالي لا يحقق المطلوب.

ثم يعمل:

```text
AdvancedDataTable
NewDataTable
ProductsTable
ModernTable
```

في TAYMEX هذا ممنوع.

لدينا قاعدة:

```text
Same responsibility = same component.
```

إذا Component ناقص Feature:

نوسعه.

لا ننشئ نسخة جديدة.

إلا إذا كان هناك اختلاف Domain حقيقي.

---

# كيف نمنع هذا آليًا؟

هذا أهم جزء.

الـMD وحده لا يكفي.

نضيف Gates في CI.

مثلاً:

### ESLint custom rules

تمنع:

```text
inline styles
hardcoded colors
direct hex
forbidden Tailwind arbitrary values
direct left/right CSS
imports خارج حدود module
```

### Dependency rules

مثلاً:

```text
pages
    ↓
patterns
    ↓
components
    ↓
primitives
```

ولا يسمح:

```text
primitive → page
```

أو:

```text
products → users internal component
```

---

# ونضيف Duplicate Detection

أداة CI تفحص الكود.

إذا بدأ Agent ينسخ Blocks كبيرة بدل إعادة استخدام Components:

يظهر:

```text
Duplicated code detected: 84%
Existing implementation:
packages/ui/data-table/...
```

وTask تفشل.

يمكن حتى تحديد Threshold.

---

# Visual Regression أهم شيء للواجهة

وهذا ما كان سينقذك كثيرًا في Harbuk.

بعد اعتماد Golden Pages نحفظ Screenshot Baselines.

مثلاً:

```text
Admin Users
Desktop Arabic
Desktop English
Mobile Arabic
Mobile English
```

بعد كل تعديل Agent:

Playwright يفتح الصفحات
يلتقط Screenshots
يقارنها بالنسخة المعتمدة.

إذا أصلح Modal لكنه كسر Header:

CI تقول:

```text
VISUAL REGRESSION FAILED
Header changed 8.3%
```

قبل أن تقول أنت:

> لماذا أفسدت الهيدر؟

---

# ليس Screenshot للصفحة فقط

أيضًا Components.

مثلاً Storybook:

```text
Button
Card
Input
Table
Modal
Sidebar
Navbar
```

لكل Component حالات:

```text
Default
Hover
Focus
Disabled
Error
RTL
LTR
Mobile
Dark
```

وبالتالي الوكيل عندما يعدل Input، نعرف فورًا إن كسر RTL أو Error state.

---

# وهنا يصبح Storybook أهم من MD

الـMD يشرح القاعدة.

لكن Storybook يقول:

**هذا هو الشكل الصحيح فعليًا.**

والوكيل يستطيع رؤية Component Story بدل تخمين التصميم.

---

# أفضل شيء يمكننا فعله: Page Schema

يمكن أن نذهب أبعد.

بدل أن يكتب Agent JSX كامل لبعض صفحات الإدارة، نبني Schema مثل:

```ts
defineCrudPage({
  title: "Products",

  permissions: {
    view: "products.view",
    create: "products.create",
  },

  stats: [...],

  filters: [...],

  columns: [...],

  actions: [...],
});
```

ومنها النظام يولد:

Header
Filters
Desktop Table
Mobile Cards
Pagination
Empty State
Loading State

تخيل حجم الأخطاء الذي سنلغيه.

بدل كتابة 500 سطر لكل صفحة:

Agent يكتب 80 سطر Configuration.

---

# وهذا مناسب جدًا للوحة TAYMEX

لأن معظم صفحات الإدارة ستكون:

Products
Categories
Customers
Orders
Quotations
Assessments
Users
Roles
Invoices
Leads

كلها نفس الهيكل تقريبًا.

فلماذا نسمح للوكيل بإعادة بنائها كل مرة؟

---

# وبالنسبة للForms أيضًا

نبني:

```text
Form Schema
```

مثلًا:

```ts
fields: [
 {
   name: "name",
   type: "localized-text",
   required: true
 },
 {
   name: "price",
   type: "money"
 }
]
```

ويولد:

Arabic
Turkish
English tabs
Validation
Error messages
Accessibility
Spacing

بدل أن Agent يعيد اختراع Form كل مرة.

---

# ونضع نظام Variants

بدل:

```text
UserCard
ProductCard
QuoteCard
SolarCard
```

كلها مبنية على:

```text
EntityCard
```

مع Variants.

وبدل:

```text
GreenBadge
RedBadge
YellowBadge
```

لدينا:

```tsx
<StatusBadge status="approved" />
```

Design System يقرر اللون.

---

# لذلك AGENTS.md لن يحتوي 300 قاعدة

في الحقيقة أريده قصيرًا جدًا.

مثلاً أهم قاعدة Frontend تكون:

> **Do not design inside pages. Compose approved components and patterns.**

وبعدها:

> If the required component does not exist, stop and request a Design System extension.

و:

> Do not create page-local alternatives to existing components.

و:

> Fix defects at the lowest shared abstraction layer.

هذه الأربع قواعد أقوى من 50 صفحة تعليمات تصميم.

---

# والأهم: الوكيل لا يرى فقط الصفحة المرجعية

بل في Task نفسه نضع:

```text
REFERENCE_IMPLEMENTATION:
packages/design-system/patterns/crud-page

REFERENCE_STORY:
Admin/CRUD/Default

VISUAL_BASELINE:
tests/visual/admin-crud
```

أي عنده:

الكود المرجعي
الشكل المرجعي
اختبار المرجع

وليس Screenshot فقط.

---

# نظام الإصلاح الذي أوصي به

عندما تقول:

> هناك مشكلة في الصفحة 7.

لا نعطي Agent:

> أصلحها.

بل Workflow تلقائي:

```text
1. Reproduce
2. Capture screenshot
3. Identify responsible layer
4. Find existing component
5. Confirm no duplicate
6. Apply smallest shared fix
7. Run component tests
8. Run page tests
9. Run RTL/LTR
10. Run responsive
11. Visual regression
12. Architecture check
```

إذا فشل أي شيء:

لا يعتبر الإصلاح مكتملًا.

---

# ونمنع الملفات الجديدة تلقائيًا

وهذا مهم جدًا بناءً على تجربتك.

كل Task يحتوي:

```text
allow_new_files: false
```

افتراضيًا.

إذا احتاج Agent ملفًا جديدًا:

يصدر:

```text
NEW_FILE_REQUEST
```

ويشرح:

```text
Why existing file cannot be extended
Proposed location
Responsibility
Dependency direction
```

ولا ينشئه بنفسه.

بذلك تختفي:

```text
helpers2.ts
common-new.ts
utils-v2.ts
new-components/
shared2/
```

التي تظهر مع مرور الوقت.

---

# نفس الشيء للDependencies

لا:

```bash
npm install ...
```

من نفسه.

أي Dependency جديدة تحتاج:

```text
DEPENDENCY_REQUEST
```

لأن Agent أحيانًا يحل مشكلة صغيرة بإضافة Library كاملة.

---

# ونمنع Rename / Move أيضًا

لأن بعض الوكلاء يحبون "تنظيف" المشروع أثناء تنفيذ Feature.

Task:

```text
NO:
- renames
- moves
- refactors
- cleanup outside task
```

إذا لاحظ مشكلة:

يسجلها.

ولا يصلحها الآن.

---

# والمراجعة يجب أن تكون Diff-based

Reviewer Agent لا يقرأ المشروع كله.

يقرأ:

```text
Task Contract
+
Git Diff
+
Affected dependency graph
```

ثم يسأل:

هل فعل أكثر مما طلب؟

هذه مهمة جدًا.

لأن Agent قد يقول لك:

> أصلحت 3 أشياء إضافية أثناء العمل.

وهذه أحيانًا بداية الكارثة.

---

# بالنسبة لي أفضل Architecture Frontend لـTAYMEX ستكون:

```text
apps/
    web
    admin
    portal

packages/
    design-tokens
    ui-primitives
    ui-components
    ui-patterns
    page-schemas
    forms
    i18n
    icons
```

ثم:

```text
Feature
    ↓
uses patterns
    ↓
uses components
    ↓
uses primitives
    ↓
uses tokens
```

ولا يوجد CSS عشوائي داخل Feature إلا حالات محدودة جدًا.

---

# والأهم من كل شيء

في Harbuk كنت أنت تعمل كـ**Visual QA Engine**:

تنفذ الصفحة
تنظر إليها
تجد المشاكل
ترجعها للوكيل
ثم تجد مشاكل جديدة.

في TAYMEX يجب أن نحول جزءًا كبيرًا من هذا الدور إلى النظام نفسه:

```text
You
 ↓
Approve Golden Design Once
 ↓
Design System
 ↓
Visual Tests
 ↓
Agent
```

بدل:

```text
Agent
 ↓
You review
 ↓
Agent fix
 ↓
You review
 ↓
Agent fix
 ↓
Something else breaks
```

وهذا في رأيي أكبر درس يجب أن نأخذه من Harbuk.

**لا نحتاج Agent أذكى فقط. نحتاج مشروعًا يجعل حتى Agent متوسط الذكاء غير قادر بسهولة على إنتاج كود خارج النمط.**

إذا بنينا TAYMEX بهذا الأسلوب، فلن تحتاج كل مرة أن ترسل له `MD + المرجع + قواعد التصميم`. سيقرأ Task صغيرة، لكن **الكود نفسه والـCI والـDesign System والـGolden References هي التي ستفرض عليه التصميم**.
----------------------------
اكير المشاكل مثلا العناصر المشتركة (صناديق النصوص والازرار والثيم كلها لدينا مركزية)
عندما يحدث مشكلة او صفحة جديدة لايتبع ذلك وينشا احيانا الوان داخل الكود او صناديق كمكونات جديدة ولايستخدم المكونات المشتركة 
على الرغم من وجود قواعد التصيميم md 
----------------------------
بالضبط. هنا المشكلة ليست في نقص قواعد التصميم، بل في أن **قواعد التصميم عندكم إرشادية وليست تنفيذية**.

وجود `design-rules.md` يقول للوكيل:

> استخدم الألوان المركزية
> استخدم TextBox المشترك
> استخدم Button المشترك

لكن الوكيل يستطيع مع ذلك كتابة:

```tsx
<div className="bg-[#174A42] rounded-xl p-4">
```

أو:

```tsx
function CustomInput() { ... }
```

وتبقى الصفحة تعمل. بالنسبة له المهمة نجحت، رغم أنه خالف النظام.

الحل في TAYMEX يجب أن يكون مختلفًا جذريًا:

## نجعل المخالفة غير ممكنة أو تفشل آليًا

مثلًا لو عندنا:

```text
packages/ui/
├── Button
├── Input
├── Textarea
├── Select
├── Card
├── Modal
├── Badge
├── DataTable
└── ...
```

فالـFeature لا يسمح له بإنشاء بديل محلي.

### قاعدة أساسية

أي Component يحقق وظيفة موجودة في `packages/ui`:

**ممنوع إنشاؤه داخل الصفحة أو الـFeature.**

إذا احتاج تعديلًا:

```text
Existing component insufficient
        ↓
Extend shared component
```

وليس:

```text
Create ProductButton
Create NewCard
Create ModernInput
```

---

# 1. منع الألوان داخل الكود

هذه يجب ألا تعتمد على MD إطلاقًا.

إذا Design System عندنا:

```css
--color-primary
--color-secondary
--color-danger
--surface-card
--text-muted
```

نمنع في كود التطبيقات:

```text
#xxxxxx
rgb()
hsl()
bg-red-500
text-slate-600
border-gray-200
```

ويُسمح فقط مثلًا:

```text
bg-surface
text-primary
text-secondary
border-default
```

إذا كتب Agent:

```tsx
className="bg-[#123456]"
```

الـLint يعطي:

```text
ERROR:
Raw color values are forbidden.
Use a design token.
```

ولا ينجح الـCI.

هذا أقوى من قولها له عشر مرات في Markdown.

---

# 2. نفس الشيء مع الـButtons

لا نكتفي بوجود:

```tsx
<Button />
```

بل نمنع:

```tsx
<button className="...">
```

في صفحات التطبيق.

إلا داخل تنفيذ `Button` نفسه.

مثلاً ESLint Rule:

```text
native <button> is forbidden outside packages/ui/button
```

فيصبح Agent مجبرًا على:

```tsx
<Button variant="primary">
```

---

# 3. Inputs أيضًا

بدل أن يكتب:

```tsx
<input ... />
<textarea ... />
<select ... />
```

نمنعها خارج الـUI package.

مسموح فقط:

```tsx
<Input />
<Textarea />
<Select />
```

وهكذا أي:

RTL
Error state
Focus
Disabled
Font
Border
Radius
Spacing

كلها مضمونة مركزيًا.

---

# 4. Card أهم مثال على مشكلتك

في Harbuk الوكيل غالبًا يفعل:

```tsx
<div className="rounded-2xl bg-white shadow p-6">
```

رغم أن لديكم Card مركزي.

في TAYMEX:

أي block فيه Pattern مثل:

```text
background
border-radius
border
shadow
padding
```

داخل Feature يمكن اعتباره مخالفة.

ويطلب منه استخدام:

```tsx
<Card>
```

ويمكن أن يكون عندنا Variants:

```tsx
<Card variant="default" />
<Card variant="muted" />
<Card variant="outlined" />
<Card variant="danger" />
```

فلا توجد حجة لإنشاء Card آخر.

---

# 5. لا نسمح للصفحات باستيراد Primitives عشوائيًا

ننشئ واجهة واحدة فقط:

```ts
@taymex/ui
```

مثلاً:

```tsx
import {
  Button,
  Card,
  Input,
  Modal,
  DataTable
} from "@taymex/ui";
```

ولا يسمح:

```tsx
import Button from "../../../components/new/button"
```

ولا:

```tsx
import { Button } from "some-ui-library"
```

ولا:

```tsx
import * from "@radix-ui/..."
```

داخل Features.

المكتبات الخارجية تستخدم فقط داخل الـDesign System.

هذه نقطة قوية جدًا.

---

# 6. نجعل UI package هو البوابة الوحيدة

أي مكتبات مثل:

Radix
Headless UI
Floating UI
Lucide
Charts

لا يحق للFeatures التعامل معها مباشرة.

مثلًا:

```text
Application Feature
       ↓
@taymex/ui
       ↓
Radix
```

وليس:

```text
Feature → Radix
Feature → Tailwind custom
Feature → Lucide
```

وبذلك لا يستطيع Agent إنشاء Modal جديد بأسلوب مختلف.

---

# 7. Icons أيضًا مركزية

حتى الأيقونات تسبب Drift.

بدل:

```tsx
import { Trash2 } from "lucide-react"
```

في أي مكان، يكون:

```tsx
<AppIcon name="delete" />
```

أو:

```tsx
import { DeleteIcon } from "@taymex/icons";
```

وبالتالي نحدد:

* الحجم.
* stroke.
* RTL mirroring.
* color.
* accessibility.

مركزيًا.

---

# 8. CSS داخل الصفحات شبه ممنوع

أرى في TAYMEX أن يكون قانوننا:

> الصفحة لا تصمم.

الصفحة **تركب Components فقط**.

مثلاً صفحة Products لا تحتوي 400 Tailwind Class.

بل شيء قريب من:

```tsx
<Page>
  <PageHeader ... />

  <StatsGrid>
    <StatCard ... />
  </StatsGrid>

  <Toolbar>
    <SearchInput />
    <FilterButton />
    <Button />
  </Toolbar>

  <DataTable ... />
</Page>
```

إذا وجدت في الصفحة:

```text
rounded-
shadow-
bg-
border-
text-[...]
```

بكثرة، فهذا مؤشر أن الـDesign System لم يتم استخدامه.

---

# 9. نضع ميزانية Tailwind للFeatures

مثلًا يمكننا حتى وضع قاعدة:

### داخل `apps/**/features/**`

مسموح فقط:

* layout utilities.
* responsive layout.
* grid/flex.
* gap.
* visibility.

مثل:

```text
flex
grid
gap-4
md:grid-cols-2
hidden
lg:block
```

لكن ممنوع:

```text
bg-*
text-color-*
border-color-*
rounded-*
shadow-*
font-*
```

لأن هذه يجب أن تأتي من Component.

هذا سيحل نسبة كبيرة من المشكلة.

---

# 10. منع إنشاء Components داخل الصفحات

لا نترك للAgent حرية:

```text
features/products/components/ProductCard.tsx
```

إذا ProductCard ليس Domain-specific فعلًا.

نضع تصنيفًا واضحًا:

### Shared UI

```text
packages/ui
```

مثل Button, Card, Table.

### Shared Pattern

```text
packages/patterns
```

مثل CRUD Toolbar.

### Domain component

```text
features/products
```

فقط إذا يحتوي منطقًا خاصًا بالمنتج.

مثلاً:

```tsx
<ProductCompatibilityStatus />
```

مقبول.

أما:

```tsx
<ProductButton />
<ProductTextBox />
<ProductModal />
```

غير مقبول.

---

# 11. الوكيل يجب أن يبحث قبل الإنشاء

قبل إنشاء Component جديد، يجب على Agent تنفيذ خطوة إلزامية:

```text
COMPONENT_DISCOVERY
```

يبحث في:

```text
@taymex/ui
@taymex/patterns
current domain
```

ثم في تقريره:

```text
Existing matching component: none
```

إذا وجد:

```text
Card
```

ثم أنشأ `ProductCardBox` لنفس المسؤولية:

Task تفشل.

---

# 12. يمكننا بناء Component Registry

هذا سيكون مفيدًا جدًا للوكلاء.

مثلاً:

```json
{
  "Button": {
    "import": "@taymex/ui",
    "purpose": "All clickable actions",
    "variants": [
      "primary",
      "secondary",
      "danger",
      "ghost"
    ]
  },

  "Card": {
    "import": "@taymex/ui",
    "purpose": "All standard surfaces"
  },

  "TextField": {
    "import": "@taymex/forms"
  }
}
```

الوكيل قبل التنفيذ يقرأ Registry.

بل يمكن توليد `UI_CATALOG.md` تلقائيًا منه.

---

# 13. Storybook مهم جدًا

في حالتكم لا يكفي أن يعرف الوكيل أن:

```text
Card exists
```

قد لا يعرف كيف يبدو أو ما Variants الموجودة.

لذلك:

```text
Storybook
```

يصبح الكتالوج الرسمي.

Agent يستطيع رؤية:

```text
Card/Default
Card/Muted
Card/Interactive

Button/Primary
Button/Danger
Button/Icon

Input/Default
Input/Error
Input/RTL
```

وبذلك يقل اختراع البدائل.

---

# 14. صفحة Design System داخل المشروع

ويمكن أن يكون لدينا Route داخلي:

```text
/dev/design-system
```

يعرض كل:

* Colors.
* Typography.
* Buttons.
* Inputs.
* Cards.
* Modals.
* Tables.
* States.
* Layouts.

هذه أفضل مرجعية من 20 ملف MD.

---

# 15. MD يصبح توثيقًا وليس Enforcement

أي أن:

`DESIGN_RULES.md`

يشرح **لماذا**.

لكن التنفيذ تفرضه:

```text
Design Tokens
Components
ESLint
Import rules
Visual tests
CI
```

هذه هي النقلة التي نفتقدها.

---

# 16. عند إصلاح مشكلة لا يسمح بإنشاء Component جديد تلقائيًا

نضع في Fix Tasks:

```yaml
new_components: forbidden
new_tokens: forbidden
new_dependencies: forbidden
```

إلا إذا تم فتح RFC منفصل.

هذا مهم جدًا.

لأن Agent أثناء إصلاح مشكلة صغيرة قد يقول:

> الأنسب إنشاء Component جديد.

لا.

إذا أصلحنا Page:

**يستخدم الموجود أولًا.**

---

# 17. إصلاح الـShared Component يجب أن يختبر الجميع

مثلًا حدثت مشكلة في:

```text
Input
```

وAgent عدل Input المركزي.

حينها لا نكتفي باختبار الصفحة الحالية.

Visual Tests لكل Stories المرتبطة بـInput تعمل:

```text
Login
Profile
Product form
Checkout
Solar wizard
Admin settings
```

إذا كسر أي واحدة:

التعديل يفشل.

وهذا يحل مشكلة:

> أصلح هنا وأفسد مكانًا آخر.

---

# 18. نحتاج Dependent Visual Tests

لدينا Mapping مثل:

```text
Button
 ├── Products
 ├── Orders
 ├── Settings
 └── Solar Wizard
```

إذا تغير Button:

CI يعرف الصفحات المتأثرة.

ولا يشغل فقط اختبار الصفحة الحالية.

---

# 19. نمنع `!important`

هذه علامة Patch غالبًا.

داخل Features:

```css
!important
```

= خطأ CI.

ونفس الشيء:

```text
z-[9999]
w-[437px]
top-[17px]
```

كلها غالبًا إصلاحات محلية سيئة.

---

# 20. نضع Naming Rule

لا نسمح بأسماء مثل:

```text
NewButton
CustomCard
BetterModal
ModernTable
TestInput
StyledBox
CommonBox
Container2
```

هذه إشارات واضحة أن الوكيل أنشأ بديلًا للموجود.

يمكن حتى فحصها آليًا.

---

# 21. Component Ownership

مثلاً:

```text
packages/ui/**
```

لا يمكن لـAgent Feature عادي تعديلها.

إذا وجد مشكلة في `Button`:

لا يعدله بنفس Task.

بل يفتح:

```text
UI-CHANGE-REQUEST
```

ثم Task منفصلة:

```text
DS-041 Fix button height in RTL
```

لماذا؟

لأن تعديل Component مشترك قد يؤثر على 50 صفحة.

يجب ألا يحدث كجزء جانبي من إصلاح صفحة واحدة.

---

# 22. فصل Design System Agent

حتى لو كنا نستخدم نفس Codex فعليًا، نعطيه Role مختلف.

### Feature Agent

يمكنه:

```text
apps/**
```

لا يستطيع:

```text
packages/ui/**
```

### Design System Agent

يمكنه:

```text
packages/ui/**
tokens/**
patterns/**
```

لكنه لا يغير صفحات Feature.

وهذا فصل ممتاز.

---

# 23. قاعدة أساسية للإصلاح

إذا الصفحة تحتاج لونًا جديدًا:

Feature Agent لا يضيف اللون.

إذا اللون مطلوب فعلاً:

```text
Token Request
```

ثم نقرر:

هل هذا:

`status-warning`

مثلًا موجود أصلًا؟

غالبًا نعم.

---

# 24. نفس المنهج للSpacing

لا:

```text
padding: 13px
```

بل Tokens:

```text
xs
sm
md
lg
xl
```

حتى لو Agent رأى أن 13px "أجمل".

لا يهم.

Consistency أهم.

---

# 25. المشكلة إذًا ليست أن الوكيل “ينسى”

هذه نقطة دقيقة.

حتى أفضل Agent قد يخالف النظام إذا:

1. أسهل له إنشاء شيء جديد.
2. لا يوجد Compiler يمنعه.
3. لا يوجد Test يكشفه.
4. لا يوجد Registry واضح للموجود.
5. Task تقول له حل المشكلة بأي طريقة.

نحن نريد عكس ذلك:

**أصعب طريق = إنشاء شيء جديد.**

**أسهل طريق = استخدام الـDesign System.**

---

## لذلك Frontend Guardrails عندي لـTAYMEX ستكون تقريبًا

```text
UI-01
No raw colors.

UI-02
No native form controls outside UI package.

UI-03
No native buttons outside UI package.

UI-04
No local card/modal/table primitives.

UI-05
No direct third-party UI imports in apps.

UI-06
No arbitrary Tailwind values.

UI-07
No left/right directional CSS.

UI-08
No inline styles.

UI-09
No new shared component from feature tasks.

UI-10
No design-system modification from feature task.

UI-11
Existing component discovery required.

UI-12
Visual regression required.
```

لكن المهم:

**11 من هذه القواعد لن تكون مجرد نص داخل MD، بل Lint/CI Rules.**

---

### الفرق بين Harbuk وTAYMEX

في Harbuk:

```text
MD says:
"Use central Card"

Agent:
Creates another Card.

You:
Discover it later.
```

في TAYMEX:

```text
Agent:
Creates another Card.

ESLint:
ERROR

CI:
FAILED

Task:
NOT DONE
```

هذا هو النظام الذي نحتاجه.

وأنا أرى أن قبل بناء صفحات TAYMEX نفسها يجب أن نخصص مرحلة مستقلة اسمها مثلًا **Frontend Governance Foundation**، نبني فيها الـTokens، الـUI package، الـComponent Registry، Storybook، ESLint rules، dependency boundaries والـvisual tests. بعد ذلك فقط نسمح للوكلاء ببناء الصفحات. عندها يصبح ملف `design-rules.md` مرجعًا مساعدًا، وليس خط الدفاع الوحيد.
-----------------------------------------
ليست فقط هذه المشاكل التي واجهتها واجهنا مشاكل اخرى متعددة :
1- مشاكل في model وطريقة تسمية المتغيرات الحقول المثيود ... الخ احيانا تكون غير متسقة وغير متجانسة عبر النظام -ايضا رغم وجود قواعد واضحة وصريحة للتسميات 
لكن احيانا عند الانشاء لايلتزم بها
احيانا يفترض امور او اسماء او اكود انها مكتوبة بطريقة معينة او ترجع شيء معين وهو مخالف للواقع 
2-  مشاكل في قواعد الامن - عد اتباعها ونضطر في كل مرة لاعادة التحقق وتضمين الامور الامنية والحماية يكتب اكواد دون مراجعة او مناقشة او حساب المعايير الامنية المحددة رغم وجود القواعد 
3- الاداء والسرعة نفس المشكلة يكتب اكواد دون مراجعة او مناقشة او حساب افضل اداء رغم وجود القواعد 
4- التجاوبية مع جميع الشاشات وسياسة الموبايل اولا من اكثر المشاكل التي جعلتنا ننفق وقت كبير لاعادة ومراجعة وكلفت وقت ومال وجهد 
5-الوظائفية - تجده يريد حل وكتابة الوظيفية دون اخذ كل المعايير والشروط اولاحتياطات اولاستثناءات واحيانا ينفذ بسطحية شديدة 
6- الاعدادات لدينا اعدادت مركزية كثيرة تخص كل حشي في النظام من اعاددات الحماية -الامان -السرعة - المستخدم - الثيمات ...... الخ 
الا انه لايستهلك هذه الاعدادات ونضطر للرجوع دوما وهذه يكلفنا المزيد والمزيد والمزيد
-------------------------------------------
بالضبط. بعد هذه النقاط الست، أنا لا أرى أن المشكلة يمكن حلها بزيادة ملفات `MD` أو كتابة تعليمات أكثر صرامة. في Harbuk كان لديكم **نظام قواعد جيد، لكن نظام تنفيذ ضعيف**: الوكيل يستطيع قراءة القاعدة ثم كتابة كود يخالفها، ولا يكتشف ذلك إلا بعد أن تراجعوه يدويًا.

في TAYMEX يجب أن نعكس المعادلة:

> **الـMD يشرح القاعدة، لكن الكود والـCI والاختبارات والعقود هي التي تفرضها.**

وأرى أننا نحتاج فعليًا إلى طبقة مستقلة أسميها مبدئيًا **TAYMEX Engineering Governance** أو **Agent Execution System**.

## المشكلة المشتركة بين كل ما ذكرته

كل المشاكل الست لها أصل واحد:

```text
Agent receives task
       ↓
Agent interprets project
       ↓
Agent makes assumptions
       ↓
Agent writes solution
       ↓
We discover later that:
- naming differs
- existing model differs
- settings were ignored
- security missing
- query inefficient
- mobile broken
- edge cases missing
```

نريد تحويلها إلى:

```text
Task
 ↓
Repository Discovery
 ↓
Verified Context
 ↓
Execution Contract
 ↓
Implementation
 ↓
Automated Governance Gates
 ↓
Specialized Review
 ↓
Merge
```

أي **ممنوع WRITE قبل READ + VERIFY**.

---

# 1. مشكلة الـModels والتسميات والافتراضات

هذه أخطر مما تبدو.

الوكيل أحيانًا يفترض مثلًا أن لدينا:

```text
product.status
```

بينما الحقيقي:

```text
product.state
```

أو يتوقع:

```text
user.fullName
```

بينما النظام يستخدم:

```text
display_name
```

أو يظن أن method تعيد Model بينما ترجع DTO.

ثم يبني فوق افتراضه عشرات الأسطر.

الحل ليس `NAMING_RULES.md` فقط.

ننشئ **Repository Truth Layer**.

مثلًا:

```text
project-registry/
├── domain-models.json
├── database-schema.json
├── api-contracts/
├── settings-registry.json
├── permissions-registry.json
├── events-registry.json
├── components-registry.json
└── terminology.yaml
```

هذه الملفات لا نكتبها يدويًا قدر الإمكان، بل **تُولّد من الكود الحقيقي**.

قبل أن يعمل Agent على Product، يحصل تلقائيًا على:

```text
MODEL: Product
PATH: ...
FIELDS:
  id
  sku
  name
  status
  price

METHODS:
  activate()
  archive()

RELATIONS:
  category
  variants

SETTINGS:
  products.allow_backorder
  products.default_currency

PERMISSIONS:
  products.view
  products.create
  products.update
```

وبالتالي لا يحق له التخمين.

### قاعدة جديدة

> إذا لم يجد الاسم أو الـContract في المشروع، لا يفترضه.

إما:

**FOUND**

أو:

**UNKNOWN → BLOCK**

وليس:

**UNKNOWN → GUESS**

---

# 2. Ubiquitous Language

أيضًا نحتاج قاموسًا مركزيًا للمصطلحات.

مثلًا نقرر:

```text
Customer
وليس Client في مكان وCustomer في مكان آخر.

Quotation
وليس Quote + Offer + Proposal عشوائيًا.

SolarAssessment
وليس SolarRequest في Module وEnergyStudy في Module آخر.
```

ويكون لدينا:

```text
domain-language.yaml
```

الجديد لا يدخل النظام إلا من خلال هذا القاموس.

حتى أسماء:

Models
Services
Events
Enums
Fields
Permissions
Routes

تتبع نفس المصطلح.

---

# 3. الـAPI لا تعتمد على ذاكرة Agent

نعمل **Contract First**.

مثلاً Solar API لها OpenAPI Schema.

الـFrontend لا يكتب:

```ts
interface SolarResult {
 ...
}
```

من عنده.

بل الـType يتولد من الـAPI Contract.

وبالتالي Backend وFrontend لا يستطيعان الاختلاف حول:

```text
battery_capacity
```

مقابل:

```text
batteryCapacity
```

إلا وفق السياسة التي اعتمدناها.

---

# 4. الأمن

هذه النقطة تحديدًا يجب ألا تُترك للAgent ليستحضرها أثناء البرمجة.

نحن لا نقول له:

> تذكر الأمن.

بل نجعل Security جزءًا من كل Mutation.

مثلاً أي Endpoint يغير بيانات يجب أن يمر آليًا عبر:

```text
Authentication
      ↓
Authorization
      ↓
Validation
      ↓
Business Rules
      ↓
Mutation
      ↓
Audit
```

لا يحق للFeature اختراع Security Flow خاص به.

ويكون لدينا Policies مركزية مثل:

```text
canCreateProduct()
canApproveQuotation()
canViewCustomer()
canModifySolarAssessment()
```

بدل:

```text
if (user.role === "admin")
```

مبعثرة في النظام.

---

# 5. Security Manifest لكل Module

مثلاً:

```yaml
module: quotations

data_classification:
  customer_data: confidential

permissions:
  - quotations.view
  - quotations.create
  - quotations.approve

mutations:
  create:
    auth: required
    audit: required
    rate_limit: true

  approve:
    auth: required
    permission: quotations.approve
    audit: required
    step_up_auth: optional
```

ومن هذا نستطيع اختبار التنفيذ.

---

# 6. Security Gate

قبل Merge تعمل اختبارات مثل:

* Authorization.
* IDOR/BOLA.
* Input validation.
* Mass assignment.
* Rate limiting.
* Secrets.
* CSRF حيث ينطبق.
* Injection.
* Dependency vulnerabilities.
* Unsafe file uploads.
* Audit coverage.

مع أدوات مثل:

**Semgrep / CodeQL / dependency scanning / secret scanning / OWASP ZAP**

لكن الأهم من الأدوات هو أن لدينا **Security Contract معروفًا قبل كتابة Feature**.

---

# 7. الأداء

نفس المشكلة.

Agent يرى:

```ts
const products = await ...
```

ويقول انتهينا.

لكن لا يسأل:

هل يعمل مع:

100 Product؟
100,000 Product؟
10,000 Order؟

لذلك كل Feature تحتاج **Performance Budget**.

مثلاً Endpoint:

```text
GET /products
```

له:

```yaml
p95: < 300ms
max_db_queries: 5
pagination: required
max_page_size: 100
n_plus_one: forbidden
```

والـDashboard:

```yaml
initial_payload: < ...
queries: <= ...
cache: required
```

لا يعني أننا سنضع أرقامًا اعتباطية لكل شيء، لكن نحدد Budget للفروع الحرجة.

---

# 8. Query Governance

نمنع Agent من كتابة Query دون فهم.

خصوصًا:

N+1
full-table scans
unbounded queries
loading relations بلا حاجة
count المتكرر
pagination السيئة.

للـQueries المهمة:

```text
EXPLAIN ANALYZE
```

جزء من المراجعة.

ونضع اختبارات:

```text
expected DB queries <= N
```

في بعض السيناريوهات.

---

# 9. الأداء مرتبط بالإعدادات

وهنا نصل لمشكلتك السادسة.

لو عندنا:

```text
advanced.cache_enabled
advanced.cache_ttl
products.per_page
search.max_results
uploads.max_size
```

فلا يجوز أن يكتب Agent:

```text
cache(..., 60)
```

أو:

```text
limit(20)
```

من رأسه.

---

# 10. الإعدادات يجب أن تكون Typed

بدل:

```ts
settings.get("something")
```

نعمل:

```ts
SettingsKey.CACHE_TTL
SettingsKey.PRODUCTS_PER_PAGE
SettingsKey.SECURITY_LOGIN_ATTEMPTS
```

وكل Setting لها:

```text
key
type
default
scope
validation
sensitive
owner
description
```

---

# 11. Module Settings Manifest

وهذه أراها مهمة جدًا لحل مشكلة Harbuk.

كل Module يصرح **ما هي الإعدادات التي يعتمد عليها**.

مثلاً:

```yaml
module: users

settings:
  - security.require_email_verification
  - security.max_login_attempts
  - users.registration_enabled
  - users.default_role
  - users.profile_image_max_size
  - admin.users_per_page
```

عندما يعمل Agent على Users، هذه المفاتيح تدخل تلقائيًا في Context الخاص بالمهمة.

لا تحتاج أنت أن تقول له:

> انتبه لدينا Settings.

النظام يعرفها.

---

# 12. ممنوع Hardcode لشيء قابل للإعداد

إذا هناك Setting معتمدة:

```text
security.max_login_attempts
```

ثم وجد CI:

```ts
if (attempts > 5)
```

يجب أن يعتبر ذلك Suspicious أو مخالفة وفق القاعدة.

والحل:

```ts
settings.security.maxLoginAttempts
```

---

# 13. التجاوبية وMobile First

أتفق معك أنها من أكثر الأشياء التي تهدر الوقت مع Agents.

لأن الصفحة تبدو جميلة على شاشة Agent الافتراضية 1440px فيعلن:

> Done.

ثم:

375px → كارثة.

لذلك **Responsive ليس Review يدويًا**.

لدينا Test Matrix ثابت.

مثلاً:

| العرض | الاستخدام       |
| ----: | --------------- |
|   320 | Small mobile    |
|   375 | Standard mobile |
|   430 | Large mobile    |
|   768 | Tablet          |
|  1024 | Laptop/tablet   |
|  1440 | Desktop         |

ولا نختبر العربية فقط.

Critical Components:

```text
AR + RTL
EN + LTR
TR + LTR
```

---

# 14. Visual Regression Mandatory

Playwright يفتح الصفحة على هذه المقاسات.

ويتحقق من:

* Horizontal overflow.
* عناصر خارج الشاشة.
* Text clipping.
* Navbar.
* Tables.
* Modals.
* Forms.
* Touch targets.

ويأخذ Screenshot.

إذا كان الإصلاح كسر Mobile:

لا يصل إلينا أصلًا.

---

# 15. Mobile First تصبح قاعدة برمجية

لا نريد:

```css
desktop
@media mobile {
   undo desktop
}
```

بل الأساس Mobile.

ثم:

```text
sm
md
lg
xl
```

للزيادة التدريجية.

ونمنع بقدر الإمكان:

```text
fixed widths
absolute positioning for layout
magic numbers
```

التي عادة تكسر الأجهزة الصغيرة.

---

# 16. الوظائفية السطحية

هذه مشكلة مختلفة قليلًا ولا يحلها Lint.

مثلًا تقول للAgent:

> أنشئ اعتماد عرض السعر.

فيكتب:

```text
status = approved
```

وينتهي.

لكنه لم يفكر:

* هل العرض منتهي؟
* هل يوجد Permission؟
* هل تم تعديل الأسعار منذ آخر مراجعة؟
* هل يمكن اعتماد عرض ملغى؟
* هل يتطلب مديرًا فوق مبلغ معين؟
* ماذا لو اعتمده شخصان بنفس الوقت؟
* Audit؟
* Notification؟
* Currency؟
* Customer status؟

لذلك الوظائف الحرجة يجب ألا توصف بفقرة نثرية فقط.

---

# 17. Decision Tables

مثلاً:

| حالة العرض | المستخدم مخول | منتهي | النتيجة          |
| ---------- | ------------- | ----- | ---------------- |
| draft      | نعم           | لا    | لا يمكن الاعتماد |
| pending    | نعم           | لا    | يعتمد            |
| pending    | لا            | لا    | forbidden        |
| pending    | نعم           | نعم   | expired          |
| cancelled  | نعم           | لا    | forbidden        |

Agent ينفذ **جدول قرار**.

لا “يفهم المطلوب على طريقته”.

---

# 18. State Machines

للعمليات الحساسة:

```text
Order
Quotation
SolarAssessment
Payment
Project
```

نعتمد State Machine.

مثلاً:

```text
DRAFT
  ↓
SUBMITTED
  ↓
UNDER_REVIEW
  ↓
APPROVED
  ↓
CONVERTED
```

ولا يمكنه كتابة:

```text
status = whatever
```

بل توجد Transitions معرفة مركزيًا.

---

# 19. Exceptions جزء من Specification

كل Task وظيفية يجب أن تحتوي:

```text
Happy path
Validation
Permissions
Edge cases
Failure modes
Concurrency
Idempotency
Audit
Notifications
Settings
Performance
Security
```

وهذه ليست Checklist يقرأها Agent اختياريًا.

بل حقول إلزامية في Task Contract.

---

# 20. أهم تغيير: Preflight إلزامي

قبل أن يلمس Agent الكود، يقدم تقريرًا قصيرًا آليًا مثل:

```text
TASK: QUOTE-027

Relevant existing code:
- Quotation model: ...
- QuotationService: ...
- ApprovalPolicy: ...
- Status enum: ...

Relevant settings:
- quotation.approval_limit
- quotation.expiry_days

Permissions:
- quotations.approve

Existing events:
- QuotationApproved

Existing shared UI:
- ApprovalDialog
- StatusBadge

Security considerations:
...

Performance considerations:
...

Files expected to change:
...

New files required:
NONE

Unverified assumptions:
NONE
```

إذا كتب:

```text
Unverified assumptions:
- I assume Quotation.status returns string
```

لا يبدأ التنفيذ.

يجب أن يتحقق أولًا.

هذه وحدها ستمنع كمية هائلة من أخطاء Harbuk.

---

# 21. Fix Tasks تحتاج Workflow مختلفًا

عندما تقول:

> يوجد خطأ.

لا نسمح للAgent بإصلاحه فورًا.

لأن هذا تحديدًا ما كان يؤدي إلى مشاكل جديدة.

Workflow الإصلاح:

```text
REPRODUCE
     ↓
ROOT CAUSE
     ↓
IMPACT ANALYSIS
     ↓
REGRESSION TEST
     ↓
FIX
     ↓
AFFECTED TESTS
     ↓
FULL RELEVANT GATES
```

أي قبل Fix يجب أن يكون لدينا Test يفشل بسبب المشكلة.

ثم نصلح حتى ينجح.

وبذلك إذا عاد الخطأ لاحقًا، CI يمنعه.

---

# 22. Impact Graph

إذا عدّل Agent:

```text
UserModel
```

النظام يعرف أنه يؤثر على:

```text
Auth
Admin Users
Profile
Orders
Quotations
Audit
```

ولا يختبر الصفحة التي كان يعمل عليها فقط.

هذا مهم جدًا لمنع:

> أصلحنا A وكسرنا B.

---

# 23. Specialized Reviewers

لا أريد Agent واحد يقول:

> راجعت الكود والأمان والأداء والتصميم، كله ممتاز.

هذه مراجعة ذات قيمة محدودة.

بل Gates مختلفة:

```text
Architecture Reviewer
Security Reviewer
Performance Reviewer
Functional Reviewer
Frontend/Responsive Reviewer
Settings Reviewer
```

كل واحد لديه Scope واضح.

حتى إذا كانوا نفس Model تحت الغطاء، **السياق والمعايير منفصلة**.

---

# 24. كل Reviewer لا يصلح

هذه نقطة مهمة.

Security Reviewer يجد مشكلة:

```text
FAIL SEC-017
```

لا يدخل ويعدل خمسة ملفات.

يرجعها للImplementer.

لأن Reviewer إذا بدأ الإصلاح، سيخلق Drift جديدًا.

---

# 25. Task Completion ليست قرار Agent

الحالة تكون:

```text
IMPLEMENTED
```

بعد Agent.

ثم:

```text
Architecture: PASS
Naming: PASS
Security: PASS
Performance: PASS
Functionality: PASS
Settings: PASS
Responsive: PASS
Visual: PASS
Tests: PASS
```

بعدها فقط:

```text
DONE
```

---

# 26. أرى أن كل Module يحتاج Manifest

وهذه قد تصبح قلب TAYMEX.

مثلاً:

```yaml
module: products

owns:
  models:
    - Product
    - ProductVariant

settings:
  - products.default_currency
  - products.allow_backorder

permissions:
  - products.view
  - products.create
  - products.update

events:
  emits:
    - ProductCreated
    - ProductUpdated

dependencies:
  allowed:
    - media
    - catalog
    - audit

security:
  classification: internal

performance:
  paginated: true
  max_page_size: 100
```

هذه ليست Documentation فقط.

CI تستخدمها.

---

# 27. ونفصل بين 3 أنواع من القواعد

هذا مهم جدًا:

### Human Rules

لماذا نفعل الشيء.

```text
docs/*.md
```

### Machine-readable Rules

ما هو المسموح.

```text
*.yaml / schemas
```

### Executable Rules

ما الذي يمنع المخالفة.

```text
lint
tests
CI
architecture checks
```

في Harbuk كان الوزن الأكبر على النوع الأول.

في TAYMEX يجب أن يكون الوزن الأكبر على الثالث.

---

# 28. كيف نعالج نقاطك الست تحديدًا؟

| المشكلة           | العلاج الأساسي                                                       |
| ----------------- | -------------------------------------------------------------------- |
| Naming / Models   | Generated registries + contracts + terminology + no guessing         |
| Security          | Security manifests + centralized policies + automated security gates |
| Performance       | Performance budgets + query checks + load/performance tests          |
| Mobile/Responsive | viewport matrix + visual regression + mobile-first component system  |
| Functionality     | decision tables + state machines + edge-case contracts               |
| Settings          | typed registry + module settings manifests + hardcode detection      |

ويضاف إليهم ما تحدثنا عنه سابقًا:

| UI Consistency  | Design System enforcement        |
| --------------- | -------------------------------- |
| Duplicates      | duplication detection            |
| New files       | default deny                     |
| Scope drift     | allowed-files contracts          |
| Fix regressions | regression-first repair protocol |

---

# 29. والأمر الذي سيغير تجربتنا مع Codex جذريًا

بدل أن تكتب له كل مرة:

> راجع `security.md`
> و`performance.md`
> و`design.md`
> و`settings.md`
> وهذه الصفحة المرجعية...

نحن نبني أداة داخل المشروع مثل:

```bash
taymex task prepare PRODUCT-014
```

فتجمع له تلقائيًا:

```text
TASK.md
Relevant architecture
Actual models
Actual APIs
Actual settings
Relevant permissions
Existing components
Reference patterns
Security requirements
Performance requirements
Acceptance tests
Allowed files
```

وتنشئ:

```text
.agent-context/PRODUCT-014/
```

وهذا هو **السياق الوحيد المطلوب للمهمة**.

لا تعتمد بعد الآن على أنك تتذكر ماذا ترسل له.

---

# 30. ثم عند الانتهاء

```bash
taymex task verify PRODUCT-014
```

تشغل:

```text
scope
architecture
naming
types
tests
security
settings
performance
i18n
RTL/LTR
responsive
visual regression
duplication
```

إذا فشل شيء:

المهمة ليست منتهية.

---

## وهذه في رأيي هي النقلة الحقيقية

المشروع السابق كان تقريبًا:

> **Rules-driven development**

TAYMEX يجب أن يصبح:

> **Governance-driven development**

حيث Agent **لا يحتاج أن يكون مثاليًا**.

قد ينسى قاعدة.

قد يحاول Hardcode.

قد يفترض اسمًا.

قد ينسى Setting.

قد يكتب Query سيئًا.

لكن المشروع نفسه يقول له:

> **لا. هذا التغيير لا يمر.**

وهذا هو المستوى الذي أراه ضروريًا قبل بناء TAYMEX، خصوصًا بعد الدروس المكلفة التي ظهرت في Harbuk.
------------------------------
نعم. فحصت المجلدات التي حددتها، وراجعت معها أجزاء من **الكود الفعلي** وليس ملفات الـMD فقط. الصورة أصبحت أوضح بكثير، وهي تؤكد تقريبًا كل ما وصفته عن تجربة Harbuk.

الأهم أن Harbuk **لم يكن يعاني من نقص القواعد**. بالعكس، القواعد كانت كثيرة وصريحة جدًا. مثلًا `requirements/04-DESIGN_UI_REQUIREMENTS.md` يقول حرفيًا إن كل عنصر واجهة يجب أن يأتي من المكونات المركزية، ويمنع HTML المباشر للعناصر المكررة، ويحدد Mobile-First وRTL. و`05-CODE_STANDARDS.md` يمنع Hardcode، ويطلب تجزئة الملفات فوق 200 سطر، ويفرض المكونات المركزية. وهناك Checklists مستقلة للأمن والأداء ولكل صفحة ومكون.

ومع ذلك، دورة العمل أصبحت فعليًا:

**Rule → Implementation مخالفة → Audit → Fix → Re-Audit → New gaps → Phase أخرى → Resolved report → Audit جديد.**

وهذا ظاهر جدًا في بنية الملفات نفسها. ضمن المجلدات التي طلبتها وحدها وجدت تقريبًا **428 ملف Markdown**، بأكثر من **650 ألف كلمة** وحوالي **112 ألف سطر توثيق**. `admin` وحده فيه 198 ملف MD، و`Auction` فيه 80؛ والمزاد لديه `audit` ثم `audit2` ثم `Resolved` ثم `audit3` ثم `audit4`. وفي الإعدادات وصلتم حتى إلى ملفات باسم `TRIPLE_CHECK`.

لكن الأهم هو ما وجدته داخل تلك التدقيقات والكود:

* **النماذج والتسميات والافتراضات:** تدقيق `admin/users/04-SECURITY_AND_PROTECTION.md` اكتشف كودًا يستخدم الحقل `role` رغم أن الـUser Model يستخدم `type`، وValidation تسمح بـ`user,dealer,admin` بينما النموذج يعرف `admin, individual, dealer, company`. هذا مثال مباشر جدًا على ما قلته: الوكيل **افترض شكل الـModel بدل التحقق منه**. وفي Auction audit4 توجد أيضًا Naming Drift موثقة مثل `WalletLedger` في التصميم مقابل `CreditTransaction` في التنفيذ، واختلاف تسميات أنواع رسوم المزاد. في الكود الحالي نفسه ما زال لدينا `TYPE_AUCTION_LISTING_FEE` في `CreditTransaction` مقابل `TYPE_AUCTION_FEE` في `Order`؛ قد يكون السياق مختلفًا، لكنه يوضح أن المصطلحات المالية لم تُبنَ من Vocabulary واحد صارم.

* **الأمن:** رغم وجود Security Requirements مفصلة، تدقيق إدارة المستخدمين وحده وجد **23 مشكلة أمنية: 5 Critical و9 High**، منها غياب Authorization، عدم وجود Policy، إمكانية التأثير على Admin، LIKE/Sort injection، Bulk actions غير محمية، وتصدير بيانات حساسة. وفي Orders كان لا بد من Phase مستقلة لإصلاح **17 مشكلة أمن/أداء حرجة وعالية**. وحتى في الكود الحالي توجد أمثلة تستحق المراجعة لاحقًا مثل `POST /contact` بدون throttle مباشر، رغم وجود validation وreCAPTCHA اختياري.

* **الأداء:** الوثائق كانت واضحة حول N+1، caching، pagination وSELECT المحدد. مع ذلك اكتشف التدقيق في Orders `SELECT *`، أربع Queries للإحصاءات بدل Query مجمعة، Export بـ`get()` كامل، Cache keys hardcoded وغيرها. وحتى في الكود الحالي ما زالت هناك Queries داخل Blade نفسه؛ مثل `resources/views/auctions/partials/_post-auction-actions.blade.php` حيث يتم استدعاء `AuctionReview::where()` و`Order::where()` مباشرة من الـView. هذا بالضبط نوع الاختصار الذي يعمل وظيفيًا لكنه يخالف البنية ويصعب ضبط الأداء.

* **الواجهة والمكونات:** يوجد حاليًا **39 مكونًا مركزيًا داخل `components/ui`** مثل Button, Card, Input, Select, Modal, ResponsiveImage… ومع ذلك في Views التطبيق غير التابعة لمجلد components أحصيت تقريبًا **761 `<button>` خامًا** مقابل حوالي **23 استخدامًا فقط لـ`x-ui.button`**. والأغرب أن `x-ui.card` موجود كمكون مركزي ولم أجد استخدامًا فعليًا له في الـViews الحالية. وهذه ليست مجرد آثار قديمة؛ `resources/views/admin/dashboard.blade.php` ما زال يحتوي على `bg-blue-100`, `bg-green-100`, `border-gray-200` وألوان Hex داخل JavaScript مثل `#3B82F6`، رغم أن نظام الثيم المركزي والقواعد تمنع ذلك صراحة.

* **التجاوبية:** المشكلة موثقة مرارًا في Home وSearch وPost Ad وAdmin. تدقيق Search مثلًا وجد أن أحد مساري البحث يستخدم UI قديمًا، Mobile Drawer مختلفًا، عناصر inline، وعدم الالتزام بالمكونات المركزية. Home مر بعدة تقارير redesign/audit ثم بقيت ملاحظات حول responsive image وMobile/Performance. هذا يفسر لماذا كنتم مضطرين لمعاينة Desktop/Mobile كل مرة يدويًا: لم يكن هناك حاجز آلي يمنع Regression.

* **الوظائفية:** `Post_Ad/07-VERIFICATION_CHECKLIST.md` بدأ بالتحقق من **76 مشكلة** ثم انتهى بالتوثيق بأن الإصلاحات صارت **84 مشكلة**. Search وجد نظامي بحث يعملان بالتوازي، أحدهما لا يستخدم `DynamicFilterService` ويكرر المنطق يدويًا. أي أن المشكلة ليست Bug فقط؛ أحيانًا الوكيل يبني **مسارًا وظيفيًا موازيًا** بدل اكتشاف المسار الموجود وإكماله.

* **الإعدادات:** هذه ربما أوضح مشكلة في المشروع. `Post_Ad/09-COMPREHENSIVE_SETTINGS_PLAN.md` وجد **18 إعدادًا غير مطبق من نحو 55 متعلقًا بالنموذج** رغم وجود الإعدادات أصلًا. `admin/users/06-SETTINGS_INTEGRATION.md` قيّم تكامل Setting::get بحوالي **20%** في تلك المرحلة. وفي الكود الحالي وجدت مثالًا ممتازًا: لديكم setting اسمها `storage.thumbnail_sizes` محفوظة في Seeder ولها حقل كامل في Admin Settings، بينما `MediaService.php` في الأسطر 28–31 ما زال يعرّف الأحجام مباشرة: `100x100`, `300x200`, `600x400`, `1200x800`. أي أن **الإعداد موجود والواجهة تسمح بتغييره، لكن محرك الصور لا يستهلكه**.

هناك أيضًا مشكلة بنيوية كبيرة تؤكد سبب استمرار الانحراف: القاعدة تقول إن الملفات فوق **200 سطر يجب تجزئتها**، لكن في النسخة الحالية وجدت 20 من 65 Controller فوق 200 سطر، و32 من 62 Service، و36 من 45 Livewire component، و99 View. `SettingsController.php` وصل إلى **1732 سطرًا**، `AuctionSettingsService.php` إلى **1103**، `AuctionController.php` إلى **1033**، و`AdminAuctionsTable.php` إلى **954**. أي أن القاعدة موجودة منذ وقت طويل، لكن لا توجد آلية تمنع Commit يخالفها.

وأكثر نقطة لفتت نظري: يوجد `E2E_TEST_PLAN.md` مرتب جدًا يحدد **127 اختبار Playwright** تقريبًا عبر Auth، Settings، Listings، Auctions، Payments وAdmin. لكن **في نسخة Harbuk التي رفعتها لا يوجد أصلًا مجلد tests فعلي ولا ملفات `.spec.ts`**، رغم وجود `playwright.config.ts` و`test.bat`. هذا يلخص المشكلة كلها تقريبًا: كان لديكم **خطة اختبار ممتازة، لكن الخطة نفسها لم تصبح Safety Net تنفيذيًا**.

إذًا بعد هذا الفحص، أنا متأكد أن وصف المشكلة على أنها “الوكيل لا يتبع الـMD” أدق بكثير من وصفها بأنها “التوثيق متضخم”. **التضخم كان آلية تعويض بشرية**: كلما خالف التنفيذ قاعدة، أضفتم Audit أو Phase أو Checklist جديدة لمحاولة منع تكرارها، لكن بما أن القاعدة بقيت نصًا يستطيع الوكيل تجاوزها، كانت المشكلة تعود بصيغة أخرى.

ولا أريد الآن أن أقفز للحل بما أنك طلبت الفحص فقط. لكن هذه المراجعة أعطتني صورة مهمة جدًا: في TAYMEX يجب أن نتعامل مع **التسمية، الـModels، الأمن، الأداء، الوظائفية، الإعدادات، الـUI، RTL/Mobile، وتجزئة الكود** كلها كقواعد يجب أن تصبح قابلة للتحقق من المشروع نفسه، وليس كمستندات يجب أن نتذكر إرسالها للوكيل في كل مهمة.
نعم، فحصت الحزمة الجديدة `Harbuk_doc.zip`، وهذه تعطيني صورة أدق بكثير عن **آخر مراحل Harbuk** من النسخة السابقة.

أهم تصحيح عندي الآن: الحزمة الجديدة هي **توثيق فقط** — تحتوي على **664 ملف Markdown و7 صور** ولا تحتوي على Source Code. لذلك أستطيع تقييم ما تم اكتشافه، تخطيطه، إصلاحه بحسب التقارير، لكن لا أستطيع من هذه الحزمة وحدها إثبات أن الكود النهائي يطابق كل ما كُتب.

### الصورة الزمنية أصبحت واضحة

التوثيق الموجود ليس كله “الحالة النهائية” بنفس الزمن، بل يحتفظ بتاريخ المشروع:

1. **فبراير 2026:** تدقيقات مكثفة للـHome، Auth، Search، Post Ad، Admin، Auction وغيرها.
2. **مارس 2026:** Hardening أعمق للإنتاج والأمن والأداء والإعدادات.
3. **أبريل–مايو 2026:** توسعة Harbuk v4 والخدمات الجديدة والـAI.
4. **6 مايو 2026:** ظهرت خطة `Refactor` الجديدة، وهي مهمة جدًا.
5. أحدث ملفات وجدتها تصل إلى **11 مايو 2026** في Live Prices.

وهذا مهم لأن تقريرًا قديمًا يقول “35% compliance” لا يعني أن النسخة النهائية بقيت كذلك؛ يجب اعتباره **تاريخ مشكلة** وليس حكمًا على آخر نسخة.

## الإصلاحات المتقدمة فعلًا

التوثيق الأحدث يظهر أنكم لم تبقوا عند مرحلة اكتشاف المشكلات.

مثلًا:

* `Auth/FINAL_VERIFICATION_REPORT.md`: يسجل **89/89 مشكلة معالجة**.
* `Post_Ad/07-VERIFICATION_CHECKLIST.md`: يسجل **84 معالجة** بعد أن بدأ التدقيق بـ76 مشكلة.
* `Audit/05-IMPLEMENTATION_RESULTS.md`: يوثق نقل الإنتاج إلى MySQL + Redis + Nginx/PHP-FPM + OPcache وغيرها.
* `Audit/06-ADVANCED_SETTINGS_AUDIT.md`: يدعي أن إعدادات الأداء والمطور المدققة أصبحت مستهلكة Runtime فعليًا.
* توجد Settings Audits منظمة حسب Tabs ومجالات منفصلة.

إذن بعض ملاحظاتي السابقة المبنية على النسخة القديمة لا ينبغي إسقاطها على الحالة النهائية.

---

## والأهم: مجلد `Refactor`

هذا أهم شيء وجدته في النسخة الجديدة بالنسبة للنقاش الذي نجريه الآن.

لأنه يبدو أنكم وصلتم بأنفسكم إلى أن:

> إصلاح المشاكل واحدة واحدة لم يعد كافيًا.

وأنشأتم خطة Refactor كاملة تشمل:

* `SAFETY_NET_AND_QUALITY_GATES`
* `TARGET_ARCHITECTURE`
* `MODULE_BOUNDARIES_AND_SHARED_RULES`
* `SETTINGS_REFACTOR_PLAN`
* `STATE_MACHINES_AND_WORKFLOWS`
* `UI_THEME_COMPONENTS_PLAN`
* `RELEASE_ROLLBACK_AND_OBSERVABILITY`
* `GO_NO_GO_AND_STOP_RULES`
* `PHASE_ZERO_PROOF_PLAN`
* `EXECUTION_BACKLOG`

وهذه الوثائق أقرب كثيرًا إلى التفكير الذي كنا نتحدث عنه لـTAYMEX.

مثلًا قاعدة مهمة جدًا موجودة حرفيًا بالمفهوم:

> **شارك الـprimitives وافصل الـworkflows.**

وفي UI:

> Shared UI primitives only
> Theme remains centralized
> Page Data before View Rendering

وفي الـSettings:

> Typed Providers
> DTOs
> Effective Resolvers
> Applied / Saved Only / Deprecated

وفي الـRefactor:

> لا يبدأ أي Refactor قبل وجود Baseline واختبارات وأداء وأمان وRollback.

هذه مرحلة نضج واضحة جدًا في المشروع.

---

## لكن هناك نقطة مهمة جدًا

في Backlog نفسه:

`B-15 — Architecture Rules / Static Checks`

و:

`B-16 — Visual Regression Harness`

ما زالا مدرجين كمهام مستقبلية ضمن Wave/Sprint لاحق.

وهذا يعني أنكم **عرفتم الحاجة إلى Enforcement آلي**، لكن بحسب التوثيق وحده لا أستطيع القول إنه كان قد أصبح مطبقًا بالكامل.

وهذه نقطة سأحتفظ بها بشدة عند تصميم TAYMEX.

---

# أقوى مثال وجدته على المشكلة التي نتحدث عنها

الأحدث والأوضح هو خدمة:

## `new/01-live-prices`

وهذه ليست مشكلة من مرحلة Harbuk القديمة؛ ملفاتها من **9 مايو 2026** تقريبًا، أي بعد تطور المشروع الكبير.

وجدت `implementation_plan.md` ثم `implementation_plan2.md` ثم:

`10-fetch-run-226-audit-report.md`

ثم:

`11-comprehensive-fix-report-2026-05-09.md`

وهنا عادت تقريبًا نفس الفئات التي كنت تصفها.

### مثلًا AI

النظام كان يحتوي على AI architecture وإعدادات متقدمة، ومع ذلك:

* `prices.normalize.observation` كان `lifecycle_phase = disabled`.
* لم توجد Routing Rule له.
* `ai.default_provider` كان مضبوطًا على `tmp_openai`.
* وبعد التحقق وجد أن **`tmp_openai` غير موجود أصلًا** في `ai_providers`.

هذه بالضبط مشكلة:

> افترض اسمًا/كيانًا/Configuration ولم يتحقق من الحقيقة الفعلية للنظام.

---

## ثم Settings

في Live Prices وجدوا أن نفس قرار AI يتم فحصه في عدة أماكن:

```text
LivePriceFetchRunService::aiAllowed()
LivePriceIngestionService::shouldUseAi()
PolicyEnforcer::evaluate()
```

والتوثيق نفسه يصفها بأنها:

**Triple Gate**

أي حتى عندما أصبح لديكم Settings مركزية، ظهرت مشكلة أخرى:

> استهلاك الإعداد المركزي بأكثر من طريقة وفي أكثر من طبقة.

وهو ما يؤدي إلى صعوبة معرفة:

> لماذا هذا Feature لا يعمل رغم أن Setting = enabled؟

---

## والأكثر وضوحًا

في تقرير الإصلاح الشامل وجدوا **5 Settings مطلوبة لكنها غير موجودة أصلًا**:

* `live_prices.ai_failure_requires_review`
* `live_prices.aggregation_window_hours`
* `live_prices.cards_enabled`
* `live_prices.kill_switch_cards`
* `ai.use_cases.prices.normalize.structured_sources.enabled`

ثم تمت إضافتها أثناء الإصلاح.

أي أن حتى Feature حديث جدًا مر بالدورة نفسها:

```text
Architecture / Settings Plan
        ↓
Implementation
        ↓
Actual behavior incorrect
        ↓
Audit
        ↓
Missing / duplicated settings
        ↓
Fix
```

---

# كذلك Data Sources

عدة مصادر كانت مضبوطة على:

`reference_snapshot`

مع أن هذا Adapter **لا يجلب HTTP أصلًا**.

ثم ظهر بعد التشغيل أن المصادر لا تعمل، فتمت إعادة تصنيفها واختيار adapters مختلفة.

وهذه أيضًا من نفس العائلة:

> تم اختيار قيمة صحيحة شكليًا لكنها غير صحيحة وظيفيًا لأن Contract الحقيقي للمكون لم يُفهم بالكامل قبل الاستخدام.

---

# ثم حصل شيء جيد جدًا

في `implementation_plan2.md` وجدت تحسنًا ملحوظًا في طريقة التفكير.

بدل قبول الافتراضات، توجد فقرة:

### Feedback Validation Summary

مثلًا:

* هل `tmp_openai` موجود؟ → **تم التحقق: لا**.
* هل model موجود؟ → **تم التحقق: نعم**.
* هل Source 5 يجب أن يكون AI؟ → **لا، deterministic HTML parser أولًا**.
* هل WFP API يعيد الأسعار مباشرة؟ → **لا، تم التحقق من تركيبه الفعلي**.
* هل يجب حذف `shouldUseAi()`؟ → **لا، بعد مراجعة الكود تبين أن لديه مسؤولية إضافية**.

وهذا بالضبط المنهج الذي يجب أن نحتفظ به لـTAYMEX:

**Verify before design.**

وليس فقط:

**Read docs → assume → implement.**

---

# مجلد `new`

أيضًا مهم جدًا.

فيه **142 ملفًا** وهو يمثل تقريبًا Harbuk v4:

* Live Prices
* Smart Directory
* Jobs & Tenders
* Reverse Marketplace
* Trust & Verification
* WhatsApp Bot
* Publishers Network
* Merchant Analytics
* Dealer Public Page
* Market Index
* Price Cards
* Cheapest Basket
* Contextual Ads
* AI System
* AI Agents

والشيء الجيد جدًا أنه بدأ بإضافة طبقات Governance مركزية مثل:

`00-glossary.md`

وهو **قاموس مصطلحات موحد** ويحدد حتى المرادفات الممنوعة.

وهذا علاج مباشر لمشكلة Naming التي تحدثنا عنها.

وكذلك:

`00-data-quality-policy.md`

ويضع:

```text
Raw Data ≠ Published Data
```

و:

```text
Collect
→ Store Raw
→ Normalize
→ Validate
→ Review
→ Publish
→ Monitor
→ Correct/Retire
```

كما يفرض أن AI:

> مساعد وليس Source of Truth.

وهذا مستوى معماري ناضج جدًا.

---

# AI نفسه أصبح أكثر مركزية

`new/14-ai-system`

يوضح أن كل الخدمات لا يفترض أن تستدعي AI مباشرة.

بل:

```text
AiClient::call(useCaseKey, variables, context)
```

ثم طبقة AI المركزية تتحكم بـ:

* provider routing
* prompts
* budgets
* PII redaction
* policies
* caching
* tracing
* evaluation
* fallbacks

وهذا مثال ممتاز على ما نريد تكراره في TAYMEX:

**Capability مركزي واحد، وليس تنفيذًا مختلفًا في كل Feature.**

---

# خلاصة فهمي الجديد لـHarbuk

بعد النسخة الجديدة، أرى Harbuk في ثلاث مراحل فكرية:

### المرحلة الأولى

**Rules + implementation**

وكان الاعتماد الأكبر على أن المنفذ يلتزم.

### المرحلة الثانية

**Audit + Fix + Re-audit**

وهي التي ولّدت الكم الكبير جدًا من ملفات Phase/Audit/Resolved.

### المرحلة الثالثة

بدأتم تتحركون نحو:

**Governance + Architecture Boundaries + Typed Interfaces + Safety Nets**

وهذا ظاهر بوضوح في `Refactor` و`new`.

لكن آخر Live Prices يبين أن **المشكلة الأساسية لم تختفِ بالكامل**:

حتى مع Architecture أفضل، ما زالت تظهر:

* assumptions غير متحققة.
* settings غير متجانسة.
* duplicated gates.
* configuration غير مطابق للحقيقة.
* component/service يستخدم بطريقة تختلف عن Contract الحقيقي.
* الحاجة إلى Audit بعد التنفيذ لاكتشاف ذلك.

وهذا بالنسبة لي أهم درس من كل الملفات.

### أيضًا ملاحظة مهمة

لم أجد `E2E_TEST_PLAN.md` في الحزمة الجديدة، والحزمة نفسها لا تحتوي الكود أو الاختبارات، لذلك لن أفترض الآن وضع الـE2E النهائي من الوثائق القديمة.

الآن أصبحت عندي **صورة أحدث بكثير** عن Harbuk، وسأعتبر التوثيق السابق الذي راجعته تاريخًا للمشروع، بينما عند أي استنتاج مستقبلي سأعطي الأولوية لـ:

**آخر Refactor docs + سياسات `new` المركزية + أحدث تقارير تنفيذ كل خدمة**، وليس للـAudits الأقدم.
نعم، فحصت توثيق **SARH**، وهو مهم جدًا لأنه يؤكد أن ما حدث في Harbuk **ليس مشكلة خاصة بـLaravel أو Frontend أو بنية Harbuk**؛ نفس النمط تكرر في مشروع مختلف جذريًا مبني على .NET / EF Core وبقواعد أكثر صرامة.

والدليل هنا أقوى مما توقعت.

### أول ملاحظة: القواعد في SARH ليست ناقصة إطلاقًا

الحزمة تحتوي تقريبًا على:

* **338 ملف Markdown**
* **11 ملف Requirements مركزي**
* **74 ملف إعدادات**
* **60 ملف Performance Guide**
* توثيق معماري مستقل.
* Security Requirements شديدة التفصيل.
* Code Standards.
* Architecture Decision.
* Settings Requirements.
* Performance rules.
* Audit Plans مستقلة لكل Module.

بل توجد تعليمات صريحة جدًا من نوع:

> لا تفترض أن الأمان مطبق — تحقق بالكود.

و:

> لا تعتمد على الذاكرة، اقرأ الوثائق كاملة قبل التنفيذ.

و:

> كل DB call داخل loop ممنوع.

و:

> كل List endpoint يجب أن يكون Paginated.

و:

> كل Runtime Setting يجب أن يأتي من Settings Engine.

و:

> كل ادعاء امتثال يجب أن يكون مدعومًا بدليل من الكود.

يعني من ناحية **وضوح التعليمات**، المشروع متقدم جدًا.

ومع ذلك ظهرت المشاكل نفسها.

---

## مثال صارخ جدًا: Infrastructure

في تدقيق:

`Modules/01_HR/Audit/B-01_Infrastructure_Report.md`

اكتُشف أن HR Module **لا يطبق Global Endpoint Filters** الموجودة أصلًا كنمط مرجعي في Core.

وهذا يعني غياب:

* Module Toggle check
* HTML Sanitization
* Automatic Validation
* ProblemDetails standardization

رغم أن الـArchitecture والـCode Standards يقولان صراحةً إنه يجب اتباع نمط Core.

أي أن المشكلة كانت حرفيًا:

> يوجد تنفيذ مرجعي صحيح أمام الوكيل، ويوجد Rule تقول استخدمه، ومع ذلك كتب Module بطريقة أخرى.

وهذا بالضبط ما كنت تصفه في Harbuk مع Components المشتركة.

---

## الأداء كذلك

في نفس الجولة:

`WorkflowEscalationService`

كان يستخدم:

```text
.ToListAsync()
```

بدون Pagination ويحمل البيانات في الذاكرة.

وفي نفس الوقت لديكم **60 ملف Performance Guide** يتحدث بالتفصيل عن:

* pagination
* N+1
* over-fetching
* query in loop
* AsNoTracking
* indexes
* cache
* async
* memory
* background processing

إذن المشكلة ليست أن Agent لا يعرف أن الأداء مهم.

بل:

> عند تنفيذ Feature محلي، لا يستحضر تلقائيًا النظام الكامل من القيود.

---

# المثال الأقوى: SIS Student

في:

`B-03_Student_Report.md`

بعد التنفيذ كان التدقيق يجد:

### أمان

حقول مثل:

* National ID
* Phone
* Guardian data

كانت مخزنة **كنص صريح**.

والـAudit Logger كان يسجل القيم الخام.

رغم وجود Security Requirements كاملة تحدد تشفير PII والـMasking.

---

### Idempotency

`CreateStudent`

كان يمكن إعادة إرساله بدون:

`Idempotency-Key`

رغم أن هذا منصوص عليه في القواعد المعمارية.

---

### Authorization

بوابة الطالب كانت تأخذ:

```text
studentId
```

من URL وتستخدم صلاحيات إدارية بدل Self-Service Scope حقيقي.

وهذه بالضبط فئة BOLA/IDOR التي يوجد لها فصل كامل في وثائق الأمن.

---

### Scope

`CreateStudent`

لم يكن يتحقق من نطاق:

* College
* Department

ووجدوا fallback يعتمد على **أسماء Roles**.

أي أن Agent كتب Shortcut بدل استخدام آلية Scope المعتمدة.

---

### Sensitive DTO

`StudentResponse`

كان يعيد:

* national_id
* phone
* email

مباشرة لأي قارئ عادي.

مرة أخرى رغم وجود قواعد Masking.

---

# ثم المشكلة التي تحدثنا عنها كثيرًا: Settings

في نفس Student Module:

> عدة مفاتيح موجودة في `Student_Data` و`Portal` لم تكن معرفة أو مستهلكة في التنفيذ.

واضطر التدقيق إلى ربط:

```text
require_*
student_number_*
university_email_*
portal_*
```

بالـHandlers فعليًا.

وهذا **نفس ما حصل في Harbuk تمامًا**.

Settings موجودة.

Documentation موجودة.

UI ربما موجود.

لكن Feature يكتب منطقه ولا يستهلكها.

---

# وحتى Concurrency

كان هناك:

`concurrency_stamp`

على Entity أصلًا.

لكن:

`UpdateStudent`

لم يكن يطلبه.

يعني البنية تحتية للحماية موجودة، لكن Feature الجديد لم يستهلكها.

هذه نقطة مهمة جدًا لأنها تشبه مشكلة Shared Components:

> وجود الإمكانية المركزية لا يعني أن Agent سيستخدمها.

---

# Admission أيضًا كرر نفس النمط

في:

`B-04_Admission_Report.md`

وجد التدقيق:

### Critical

لم يكن هناك:

* Persistent Idempotency
* حماية كافية للبيانات الحساسة
* Scoped access حسب College/Department

ثم تمت إضافتها في مرحلة Audit.

---

### File Upload Security

لم يكن هناك Surface كامل يربط رفع المستندات بنظام الملفات المركزي والتحقق من:

* الصلاحية
* verification
* expiry

رغم وجود Security Requirements واضحة جدًا لرفع الملفات.

---

### Settings

مرة أخرى:

> عدة Admission Settings كانت موثقة لكنها غير معرفة أو غير مستهلكة.

واضطر التدقيق لإضافتها وربطها.

---

# Registration ربما أوضح مثال على الوظائفية السطحية

في:

`B-05_Registration_Report.md`

وجدوا:

## Race Condition حرجة

التنفيذ كان يفعل تقريبًا:

```text
Check capacity
↓
later save registration
```

مما يسمح لمستخدمين بأخذ آخر مقعد معًا.

والحل بعد التدقيق كان إنشاء Reservation ذري.

هذه ليست Syntax bug.

هذه مشكلة:

> Agent نفذ الـHappy Path ولم يفكر بالConcurrency.

وهي بالضبط النقطة الخامسة التي ذكرتها سابقًا.

---

## Registration Windows

الإعدادات الخاصة بـ:

* early registration
* late registration
* add window
* drop window
* withdrawal
* refund

كانت موجودة في الوثائق.

لكن:

> لم تكن مستهلكة بالكامل في التنفيذ.

واضطر Audit إلى إنشاء:

`RegistrationPolicySupport`

لتوحيدها.

نفس المشكلة مرة أخرى.

---

## Waitlist

التوثيق يطلب Waitlist.

لكن التنفيذ لم يكن ينشئ Waitlist فعليًا عند امتلاء المقرر.

أي Agent قال ضمنيًا:

> التسجيل يعمل.

بينما الوظيفة الحقيقية تحتوي عشرات الحالات.

---

## الأداء

`GetCourseOfferings`

لم يكن:

* Paginated بشكل كامل.
* يعالج Scopes المتعددة جيدًا.
* يجلب Sections دون N+1.

ثم Audit أصلحه.

مع أن Performance Guide يشرح هذه الأمور بالتفصيل قبل التنفيذ.

---

# الاختبارات أيضًا تظهر نفس المشكلة

بعد كل Audit تقريبًا نرى:

> لم تكن هناك اختبارات مباشرة تغطي...

ثم يتم إنشاء:

```text
StudentPhase3HardeningTests
AdmissionPhase4HardeningTests
RegistrationPhase5HardeningTests
```

لاحظ الاسم:

**Hardening Tests**

أي أن الاختبارات جاءت **بعد اكتشاف المشكلة**.

بدل أن تكون قبلها Guard Rail يمنع المشكلة من الدخول أساسًا.

وهذه نقطة شديدة الأهمية لـTAYMEX.

---

# والأهم من ذلك كله: طريقة التوثيق نفسها

SARH دخل نفس دورة Harbuk تقريبًا.

لدينا:

```text
requirements/
Performance_Guide/
Settings/
Architecture/
HR_SYSTEM/
SIS_SYSTEM/
```

ثم:

```text
Audit/
    A-00 Initial Analysis
    B-01 ...
    B-02 ...
    B-03 ...
    ...
    C-01 ZeroHardCode
    C-02 Permissions
    C-03 DRY
    C-04 Outbox
    C-05 Localization
    C-06 Database
    C-07 Testing
    C-08 Performance
    C-09 Security
```

أي أنكم اضطررتم بعد وجود النظام الكامل من القواعد إلى بناء **نظام Audit كامل فوقه**.

وهذا نفس ما حصل في Harbuk.

---

# وهذا يغير استنتاجي قليلًا

كنت أقول سابقًا إن المشكلة:

> الوكيل لا يتبع الـMD.

الآن أصفها بدقة أكبر:

## الوكيل يعاني من Contextual Compliance Failure

يعني أثناء تنفيذ Feature معين يركز على:

```text
Current task
Current files
Immediate error
```

ويفقد بعض القيود العرضية:

```text
Architecture
Security
Settings
Performance
Concurrency
Localization
Shared infrastructure
Naming
Testing
Mobile
```

حتى لو قرأها قبل ساعة.

وهذا يفسر لماذا إعطاؤه ملف MD كل مرة **يحسن النتيجة لكنه لا يحل المشكلة**.

---

# وهناك نمط آخر مهم جدًا

Agents يميلون إلى:

## Local Optimization

مثلاً:

> أحتاج Authorization هنا.

فيكتب Authorization محلي.

بدل أن يسأل:

> ما هو Authorization Pattern المعتمد في المشروع؟

أحتاج Setting:

يضع Default محلي.

أحتاج Card:

ينشئ Card.

أحتاج Query:

يكتب Query.

أحتاج Error:

يرجع Error.

أحتاج Permission:

يكتب String.

كل حل **صحيح محليًا**.

لكن مجموعها ينتج مشروعًا غير متجانس.

وهذا ظهر في Harbuk وSARH معًا.

---

# الفرق المهم بين SARH وHarbuk

SARH يبدو أنه وصل إلى درجة أعلى قليلًا من Hardening الآلي.

في التقارير الأخيرة أرى مثلًا:

```text
dotnet build → PASS
dotnet test → PASS
Architecture Tests → PASS
```

وهذا جيد جدًا.

لكن حتى هنا:

الـArchitecture Tests الموجودة كانت قليلة نسبيًا؛ مثل:

```text
SIS Architecture Test 1/1
```

بينما المخالفات التي اكتشفها Audit عشرات.

أي أن:

> الـArchitecture Test كان يختبر Boundary، لكنه لا يختبر كل قواعد Architecture.

وهذه نقطة سنتجنبها.

---

# ما تعلمته الآن من المشروعين معًا

Harbuk أعطانا:

**Frontend/UI/Settings/Architecture Drift**

SARH أضاف وأكد:

**Backend/Domain/Security/Concurrency/Settings/Performance Drift**

وبذلك لدينا الآن Evidence من نظامين بتقنيات مختلفة جدًا.

يمكن تلخيص الفئات التي تتكرر في الاثنين:

| الفئة                             | Harbuk | SARH |
| --------------------------------- | -----: | ---: |
| عدم استخدام البنية المشتركة       |      ✅ |    ✅ |
| Hardcode                          |      ✅ |    ✅ |
| Settings غير مستهلكة              |      ✅ |    ✅ |
| Security gaps                     |      ✅ |    ✅ |
| Performance gaps                  |      ✅ |    ✅ |
| Naming/contract assumptions       |      ✅ |    ✅ |
| Functional shallow implementation |      ✅ |    ✅ |
| Missing edge cases                |      ✅ |    ✅ |
| Duplicate/local solutions         |      ✅ |    ✅ |
| Missing tests until audit         |      ✅ |    ✅ |
| Audit after implementation        |      ✅ |    ✅ |
| Documentation growth              |      ✅ |    ✅ |

وهذا بالنسبة لي مهم جدًا.

لأننا نستطيع الآن القول بثقة:

> **المشكلة ليست Technology Stack، وليست جودة التوثيق، وليست حتى مقدار التوثيق.**

المشكلة الأساسية هي أن **Architecture وRequirements وSettings وSecurity كانت موجودة خارج مسار التنفيذ الإلزامي للوكيل**.

وهذه النتيجة أصبحت عندي الآن واضحة جدًا من Harbuk وSARH معًا. لن أقفز بعد إلى تصميم TAYMEX حتى نستكمل فهم الدروس، لكن هذه الحزمة أضافت لنا Evidence مهم جدًا يجب ألا نضيعه.
نعم، وهذه بالضبط هي النقطة التي يجب أن نعتمد عليها في تصميم طريقة تنفيذ TAYMEX: **أنا أيضًا، أو Codex، أو أي وكيل آخر، يمكن أن يفقد أولوية بعض القيود عندما يصبح السياق طويلًا جدًا أو عندما ينشغل بإصلاح محلي أو Feature محددة**. لذلك لو بنينا المشروع على أساس أن الوكيل “سيتذكر كل ما اتفقنا عليه”، فسنكرر تجربة Harbuk وSARH مهما كانت جودة الخطة.

المبدأ الذي وصلت إليه من كل ما ناقشناه هو:

> **لا نعتمد على ذاكرة الوكيل لكي يبني الكود الصحيح. نجعل المشروع نفسه يقوده إلى الطريق الصحيح ويمنعه من الطريق الخطأ.**

وهذا يختلف جذريًا عن كثرة التدقيق.

### ما نريده فعليًا

لا نريد:

```text
Build
 ↓
Audit
 ↓
20 problems
 ↓
Fix
 ↓
Regression
 ↓
Audit again
 ↓
8 new problems
```

بل:

```text
Verified Project Context
        ↓
Strict Feature Contract
        ↓
Use Existing Architecture
        ↓
Correct Implementation
        ↓
Automatic Safety Checks
        ↓
Merge
```

والـAudit النهائي يصبح **تأكيدًا** وليس مرحلة اكتشاف للكوارث.

## البناء الصحيح من أول مرة

بالنسبة لي يجب أن تصبح هذه هي فلسفة TAYMEX:

**أولًا: لا يوجد تخمين.** قبل كتابة أي Feature، يتم استخراج الحقيقة من المشروع نفسه: الـModels الموجودة، الحقول، العلاقات، Services، APIs، Settings، Permissions، Events، Components، Patterns، Database schema. إذا لم يجد الوكيل شيئًا، لا يفترض اسمه أو سلوكه. الحالة تكون `UNKNOWN` ويتوقف عن ذلك الجزء بدل اختراع Contract وهمي.

**ثانيًا: لا توجد حلول محلية لما هو مركزي.** إذا عندنا Button مركزي، لا يوجد `<button>` جديد. إذا عندنا Card، لا ينشئ Card. إذا عندنا Authorization Policy، لا يكتب `if role == admin`. إذا عندنا Setting، لا يضع قيمة Hardcoded. إذا عندنا Cache abstraction أو Notification service أو audit system، يستخدمه. ونفرض ذلك بالكود وليس بالـMD فقط.

**ثالثًا: لا يبدأ Feature من صفحة بيضاء.** كل نوع وظيفة سيكون له Skeleton معتمد. CRUD، Settings، Wizard، Details، Workflow، Background Job، API mutation وغيرها. الوكيل يملأ Domain Logic داخل هيكل صحيح موجود مسبقًا.

**رابعًا: كل Module يعلن Dependencies الخاصة به مسبقًا.** Settings التي يستهلكها، Permissions، Events، Models، External services، Security classification، Performance expectations. فلا يمكن أن يبني Users مثلًا ثم “ينسى” ثلاثة Settings أمنية لأنها لم تكن في ذهنه.

**خامسًا: الوظيفة نفسها توصف بالكامل قبل تنفيذها.** ليس فقط Happy Path. قبل الكود نحدد الحالات، الاستثناءات، validation، permissions، concurrency، idempotency، audit، notifications، settings، failure modes والأداء. العمليات المعقدة تستخدم Decision Tables وState Machines، فلا يختزل الوكيل عملية كاملة إلى `status = approved`.

**سادسًا: الأمن جزء من مسار التنفيذ وليس Checklist بعده.** أي Mutation لها Pipeline مركزي: Authentication → Authorization → Validation → Business rules → Mutation → Audit. الوكيل لا يقرر كل مرة هل يحتاج هذه الطبقات.

**سابعًا: الأداء له نمط افتراضي صحيح.** Pagination افتراضية، bounded queries، عدم query داخل loop، لا `SELECT *` بدون سبب، caching من الإعدادات، Async/background للعمليات الثقيلة، ومراجعة Query plans للمسارات المهمة. أي انحراف يكون استثناءً يحتاج سببًا.

**ثامنًا: Mobile First وRTL/LTR يأتيان من Design System نفسه.** لا نترك للوكيل أن يتذكرهما عند كل صفحة. Components المشتركة تعمل تلقائيًا على 320/375/430/768/1024/1440 وعلى AR/EN/TR، والـvisual tests تمنع كسرها.

**تاسعًا: الإعدادات Typed وليست Strings منتشرة.** لا نريد:

```text
settings.get("some_key")
```

بشكل عشوائي.

بل Registry مركزي يعرف كل Setting ونوعها وDefault وScope وValidation والـModules التي تستهلكها. وإذا كان Behavior قابلًا للإعداد، يمنع Hardcode المقابل.

**عاشرًا: Agent لا يستطيع توسيع Architecture من نفسه.** إنشاء ملف جديد، Shared Component جديد، Dependency جديدة، Service جديد، Rename، Move أو Refactor خارج المهمة يكون `default deny`. إذا احتاج ذلك، يسجل طلبًا منفصلًا ولا “يحسن المشروع أثناء المرور”.

وهذا كله يجب أن يصبح **Executable Governance**.

---

# والفرق الجوهري عن Harbuk وSARH

هناك كنا نكتب مثلًا:

```text
security.md
performance.md
settings.md
design.md
naming.md
```

ثم نقول للوكيل:

> اقرأها والتزم بها.

في TAYMEX يصبح لدينا:

```text
Human documentation
        +
Machine-readable manifests
        +
Executable rules
```

مثلاً:

```text
Naming rule
→ Schema / analyzer

Shared UI rule
→ ESLint/import boundary

No raw colors
→ Lint failure

Settings consumption
→ Typed settings + module manifest

Security
→ policies + tests + static analysis

Performance
→ query budgets/tests

Architecture
→ dependency tests

Responsive
→ Playwright viewport tests

Regression
→ visual baselines

API contracts
→ generated types

Models
→ generated registry
```

هنا حتى لو نسيت أنا أو نسي Codex أن يقول:

> استخدم الإعداد المركزي،

سيمنعنا النظام من تمرير التنفيذ الخاطئ.

---

# والأهم: Preflight قبل الكود

هذه أصبحت عندي قاعدة أساسية بعد Harbuk وSARH.

أي مهمة مهما كانت بسيطة لا تبدأ مباشرة بالكود.

يصدر النظام أولًا شيئًا مثل:

```text
TASK: PRODUCT-031

Existing model:
Product

Existing fields:
...

Existing services:
...

Relevant settings:
...

Permissions:
...

Existing UI:
...

Existing patterns:
...

Security requirements:
...

Performance considerations:
...

Affected modules:
...

Expected changed files:
...

New files:
NONE

Unverified assumptions:
NONE
```

إذا ظهر:

```text
Unverified assumption:
I assume ProductService returns ...
```

لا يبدأ التنفيذ.

يعود ويتحقق.

وهذا يعالج بشكل مباشر واحدة من أكثر المشاكل التي تكررت في النظامين.

---

# والإصلاح يجب ألا يكون أخطر من المشكلة

هذه نقطة شديدة الأهمية مما ذكرته.

لا نسمح:

> رأيت المشكلة → غيرت الكود → جربت الصفحة → انتهى.

بل:

```text
Reproduce
  ↓
Determine root cause
  ↓
Determine responsible abstraction
  ↓
Determine affected consumers
  ↓
Create regression test
  ↓
Apply smallest fix
  ↓
Test affected graph
```

مثلاً Card به مشكلة.

إذا الخلل في Card المركزي، نصلح Card ونختبر كل الصفحات المستهلكة.

إذا المشكلة في Product Page وحدها، لا نعبث بـCard المركزي.

وهناك قاعدة مهمة ناقشناها:

> **Fix at the lowest correct shared abstraction layer — not at the quickest local location.**

وبهذه الطريقة لا يحصل:

> أصلحنا الصفحة الحالية لكن خربت خمس صفحات أخرى.

---

# ولا أريد “تصحيح كل شيء” أثناء Fix

الوكلاء يفعلون هذا كثيرًا:

> أثناء إصلاح المشكلة لاحظت أن هذه الملفات تحتاج Refactor فقمت بتحسينها أيضًا.

هذا يجب أن يكون ممنوعًا.

Fix task:

```text
Only root-cause changes.
No cleanup.
No opportunistic refactor.
No unrelated rename.
No architecture changes.
```

أي مشكلة أخرى تسجل Task أخرى.

هذا يقلل مساحة الـRegression بشكل هائل.

---

# نقطة مهمة جدًا حول الاختبارات

لا أريد أن نبني آلاف الاختبارات لأن الكود سيئ.

أريد الاختبارات في أماكن ذات قيمة عالية.

مثلاً:

**Architecture invariants**

لا تتغير.

**Security invariants**

لا تتغير.

**Critical business workflows**

لا تتغير إلا بقرار.

**Golden UI patterns**

لا تتغير عشوائيًا.

**Solar engineering calculations**

Golden datasets.

ثم Features العادية يكون اختبارها حسب المخاطر.

بذلك لا تتحول TAYMEX إلى مشروع فيه 100 ألف Test يجب صيانتها دون داعٍ.

---

# يجب أيضًا أن نعالج مشكلة السياق نفسها تقنيًا

بدل إرسال جميع وثائق المشروع إلى الوكيل كل مرة، نولد له:

```text
.agent-context/TASK-ID/
```

ويحتوي فقط على الحقيقة اللازمة للمهمة:

```text
TASK
Relevant Architecture
Actual Models
Actual API Contracts
Actual Settings
Actual Permissions
Relevant Existing Components
Relevant Workflows
Acceptance Criteria
Security Requirements
Performance Requirements
Allowed Files
```

ويُولد آليًا من المشروع الحالي، لا من ذاكرة المحادثة.

لذلك لو عدنا للمشروع بعد ستة أشهر، لا نحتاج أن نتذكر ماذا قلنا اليوم.

المشروع نفسه يتذكر.

---

# وهذه أيضًا تعالج فقدان سياقي أنا

ما اتفقنا عليه الآن لا يجب أن يبقى محصورًا في هذه المحادثة.

عندما نبدأ TAYMEX يجب أن يتحول إلى:

```text
Architecture
Governance Rules
Registries
Manifests
Schemas
Task Contracts
Automated Gates
Golden References
```

وبعدها تستطيع أن تعطيني Task في محادثة جديدة تمامًا، أو تعطيها Codex، ولا ينبغي أن تعتمد النتيجة على أننا “نتذكر Harbuk وSARH”.

**هذا هو الهدف الحقيقي.**

---

# كيف أرى البداية الصحيحة للمشروع

أنا الآن لا أنصح أن ننشئ Next.js أو NestJS ونبدأ بصفحة Home.

أول مرحلة فعلية يجب أن تكون:

## Foundation & Governance

ولا نبني Feature تجارية واحدة خلالها.

نبني:

Architecture boundaries
Naming conventions
Domain terminology
Design tokens
Shared UI
Responsive rules
Settings engine
Security primitives
Authorization
Audit
Logging
Error handling
API contracts
Module manifests
Repository registries
Testing foundations
CI gates
Agent task system.

ثم ننفذ **Feature تجريبية واحدة كاملة**.

وليكن Products مثلًا.

نختبر النظام نفسه:

هل أجبر الوكيل على استخدام Components؟

هل استهلك Settings؟

هل التزم Security؟

هل بقي Mobile صحيحًا؟

هل التزم naming؟

هل حاول إنشاء ملفات غير ضرورية؟

هل استطاع CI اكتشاف الانحراف؟

إذا Foundation فشلت، نصلح Foundation.

**لا نبني 20 Module ثم نكتشف أن آلية الحوكمة نفسها ضعيفة.**

---

## ثم تبدأ السرعة الحقيقية

قد يبدو أن هذا يجعل أول أسبوع أو أسبوعين أبطأ.

لكنه يمنع السيناريو الذي عشتموه:

```text
1 يوم تنفيذ
+
3 أيام إصلاح
+
2 أيام Audit
+
يوم Regression
+
إعادة فتح المهمة بعد أسبوعين
```

البناء الصحيح قد يأخذ:

```text
1.5 يوم
```

بدل:

```text
1 يوم + 6 أيام مشاكل
```

وبعد أن تصبح Foundation مستقرة، الوكيل نفسه يصبح أسرع لأن:

* لا يقرر Design.
* لا يخترع Security.
* لا يخترع Naming.
* لا يبحث كيف يتعامل مع Settings.
* لا يخترع Error handling.
* لا يخترع Responsive layout.
* لا يخترع API conventions.

كلها موجودة.

يبقى له فقط:

**تنفيذ الـBusiness Logic الخاص بالمهمة.**

وهذا هو بالضبط ما أريده لـTAYMEX.

لا نهدف إلى مشروع “نجح في التدقيق بعد عدة دورات”.

نهدف إلى مشروع **مصمم بحيث يصبح أسهل على الوكيل كتابة الكود الصحيح من كتابة الكود الخاطئ**.

وهذه بالنسبة لي خلاصة كل ما تعلمناه من Harbuk + SARH + كل المشاكل التي ناقشناها منذ بداية الحديث.
نريد ان يكون لدينا هيكل نموذجي يمكن استخدامه فيه بنية تحتية كاملة - يمكن استخدامها لاكثر من مشروع لاحقا بحيث البنية الاساسية المشتركة بين كل المشاريع لايعاد بنائها من الصفر مع كل مشروع
نعم، وهذا التعديل في الهدف **مهم جدًا**: بعد البحث لا أرى أننا يجب أن نبني “هيكل TAYMEX قابل للنسخ”، بل نبني **منصة هندسية داخلية قابلة لإعادة الاستخدام**، ثم يكون TAYMEX أول مشروع حقيقي يُولد منها ويختبرها.

هذا المفهوم معروف في Platform Engineering باسم **Golden Path / Paved Road**: بنية مشتركة تقلل الحمل المعرفي وتقدم قوالب، Guardrails، CI/CD، الأمن، observability والبنية التحتية بصورة جاهزة، مع إبقاء المجال مفتوحًا للاستثناءات المدروسة. CNCF نفسها تصف Golden Paths بأنها قوالب وممارسات وGuardrails وخدمات ذاتية للبنية التحتية والـCI/CD والـobservability. ([CNCF Contributors][1])

## أهم نتيجة من البحث

لا أنصح بهذا:

```text
TAYMEX_TEMPLATE/
   ├── auth
   ├── settings
   ├── ui
   ├── audit
   └── ...
            ↓
       Copy project
            ↓
       Project A

       Copy again
            ↓
       Project B
```

لأن اللحظة التي ننسخ فيها الكود تبدأ المشاريع بالانفصال.

بعد سنة يصبح لدينا:

```text
Project A → Settings v1
Project B → Settings v1.4
Project C → Security patches ناقصة
Project D → UI معدل محليًا
```

ونعود للمشكلة نفسها ولكن على مستوى **عدة مشاريع**.

الأقوى هو:

```text
                 OUR ENGINEERING PLATFORM
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
 Shared Packages      Golden Paths       Governance
        │                  │                  │
        ├───────┬──────────┴──────────┬───────┤
        │       │                     │       │
      TAYMEX  Project B            Project C  ...
```

كل مشروع مستقل، لكنه يستهلك **نسخًا Versioned** من البنية المشتركة.

---

# ما يجب أن نبنيه فعليًا

أرى أن منصتنا المستقبلية تتكون من سبعة أجزاء مستقلة:

```text
engineering-platform/
│
├── platform-foundation
├── platform-design-system
├── platform-tooling
├── platform-policies
├── platform-ci
├── platform-infra
├── platform-blueprints
│
└── platform-portal        ← لاحقًا
```

ثم كل مشروع تجاري يبقى Repo مستقلاً:

```text
products/
├── taymex
├── project-b
├── project-c
└── ...
```

ولا أوصي بوضع كل العملاء في Mega Monorepo واحد.

---

# 1. `platform-foundation`

هذه أهم حزمة.

تحتوي الأشياء التي **لا ينبغي أن نعيد كتابتها في أي مشروع**:

```text
@our-platform/config
@our-platform/settings
@our-platform/auth
@our-platform/authorization
@our-platform/audit
@our-platform/errors
@our-platform/i18n
@our-platform/observability
@our-platform/files
@our-platform/notifications
@our-platform/feature-flags
@our-platform/idempotency
@our-platform/pagination
@our-platform/contracts
@our-platform/outbox
@our-platform/testing
```

فمثلًا المشروع الجديد لا يبني Audit System.

بل:

```ts
import { AuditService } from '@our-platform/audit'
```

ولا يبني Settings Engine جديدًا.

بل:

```ts
import { Settings } from '@our-platform/settings'
```

وهذه الحزم لها Versions:

```text
@our-platform/settings@2.3.0
```

إذا أصلحنا خللًا أمنيًا:

```text
2.3.0
↓
2.3.1
```

تستطيع المشاريع التحديث بدل إعادة تطبيق الإصلاح يدويًا.

---

# 2. `platform-tooling`

هذه أراها من أهم الاكتشافات في البحث بالنسبة لمشكلتنا مع الوكلاء.

أرشح بقوة:

## Nx

ليس فقط لأنه Monorepo tool.

بل لأن الاتجاه الحالي لـNx في 2026 أصبح مناسبًا جدًا للـAgentic Development.

Nx يستطيع فرض Module Boundaries ومنع Libraries من استيراد بعضها بطريقة مخالفة للمعمارية. ويمكن تحديد قواعد بحسب Tags مثل `type:domain` و`type:ui` و`scope:admin` وغيرها، ويؤدي خرقها إلى فشل الـLint. ([nx.dev][2])

والأهم أن وثائق Nx نفسها تقول شيئًا مطابقًا تقريبًا لما واجهناه:

> توثيق Best Practices مهم، لكن المطورين لا يقرأونه دائمًا ولا يتبعونه باستمرار؛ لذلك يمكن ترميز هذه الممارسات في Generators.

([nx.dev][3])

وهذا بالضبط علاج Harbuk وSARH.

بدل أن نقول للوكيل:

> أنشئ Module وفق `CODE_STANDARDS.md`.

نمنعه من إنشائه يدويًا أصلًا.

يكتب:

```bash
nx g @our-platform/domain products
```

والGenerator ينشئ:

```text
products/
├── domain/
├── application/
├── infrastructure/
├── api/
├── manifest.yaml
├── permissions.ts
├── settings.ts
└── tests/
```

بالأسماء الصحيحة.

وبـImports الصحيحة.

وبالـTests الصحيحة.

وبالـTags الصحيحة.

وبالتالي لا يعود Agent يقرر Architecture في كل مرة.

---

# اكتشاف مهم جدًا بالنسبة لـCodex

Nx الآن لديه تكامل رسمي مع AI coding agents بما فيها:

**OpenAI Codex**.

الأمر:

```bash
npx nx configure-ai-agents
```

يدعم Codex وClaude وCursor وCopilot وGemini وغيرها، ويضيف MCP وSkills وقواعد Agent. ([nx.dev][4])

والهدف المعلن هو أن يحصل الوكيل على:

* Project Graph الحقيقي.
* Dependencies.
* المشاريع الموجودة.
* Generators المتاحة.
* Tasks.
* CI failures.

بدل أن يحاول فهم المشروع عن طريق قراءة ملفات عشوائية. Nx نفسه يصف مشكلة الوكلاء بأنها نقص فهم Architecture وإنتاج كود غير متسق. ([nx.dev][5])

هذه بالنسبة لي **نقطة قوية جدًا لصالح Nx** في منصتنا.

---

# 3. `platform-design-system`

هنا حصلت نتيجة بحث مهمة وربما مختلفة قليلًا عن اختياراتنا المعتادة.

أرى حاليًا أن أقوى Candidate عندنا هو:

```text
Base UI
   ↓
Our Primitives
   ↓
Our Components
   ↓
Our UX Patterns
   ↓
Pages
```

## Base UI

Base UI مكتبة Headless React غير مصممة بصريًا، وتركز أساسًا على Accessibility والأداء والتركيب، وتطبق أنماط WAI-ARIA وتتعامل مع keyboard/focus وغيرها. ([base-ui.com][6])

لكن:

**ممنوع المشروع أن يستورد Base UI مباشرة.**

فقط:

```text
platform-design-system
```

يستطيع ذلك.

التطبيق يستخدم:

```tsx
import {
    Button,
    Card,
    Field,
    Dialog
} from '@our-platform/ui'
```

وبالتالي نستطيع لاحقًا تغيير الـPrimitive الداخلية دون تغيير عشرين مشروعًا.

---

# Panda CSS بدل الاعتماد الكامل على Tailwind

هذه إحدى أهم النتائج التي أريد دراستها أكثر قبل اعتمادها النهائي.

بالنسبة لمشكلة الوكلاء التي عانيناها، **Panda CSS يقدم Enforcement أقوى من Tailwind العادي**.

عنده:

```ts
strictTokens: true
```

وبالتالي:

```ts
bg: 'red'
```

يصبح Type Error إذا لم يكن Token معتمدًا.

وكذلك:

```ts
fontSize: '123px'
```

غير مسموح إذا لم يأت من Token. ([panda-css.com][7])

ويدعم Recipes Typed:

```ts
button({
    variant: 'primary',
    size: 'md'
})
```

بدل أن يسمح لكل Agent بتركيب 15 utility class مختلفة. ([panda-css.com][8])

---

## والأهم: يمكن مشاركته بين المشاريع

Panda يدعم **Presets قابلة لإعادة الاستخدام** تحتوي:

* tokens
* theme
* utilities
* patterns
* recipes

ويذكر صراحة أن استخدامها مناسب عندما تريد Design System package واحدة تخدم عدة تطبيقات. ([panda-css.com][9])

أي:

```text
@our-platform/design-preset
```

وكل مشروع يستعمل:

```ts
presets: ['@our-platform/design-preset']
```

---

# RTL أيضًا

Panda يدعم Logical Properties أصلاً:

```ts
marginStart
marginEnd
insetStart
insetEnd
```

وتتحول تلقائيًا بحسب `LTR/RTL`. ([panda-css.com][10])

هذا مهم جدًا لـTAYMEX بسبب:

```text
AR → RTL
EN → LTR
TR → LTR
```

ولا أريد Agents تستخدم:

```text
margin-left
margin-right
```

ثم نعود لإصلاح العربية.

---

# لكن Panda لديه Escape Hatch

ما يزال يمكن كتابة:

```ts
fontSize: '[13px]'
```

ولذلك لن نكتفي بـ`strictTokens`.

سنضيف Rule خاصة بنا تمنع:

```text
[...]
```

خارج:

```text
platform-design-system
```

وبذلك تصبح إضافة Raw value داخل Feature **فشل CI**.

هذه بالضبط فلسفة:

> لا تخبر Agent ألا يفعل ذلك؛ اجعله غير قادر على تمريره.

---

# 4. Storybook أصبح مهمًا جدًا وليس مجرد Gallery

هذا ربما أقوى اكتشاف Frontend بالنسبة للمشكلة التي شرحتها.

في 2026 أضاف Storybook MCP رسميًا.

وهو يسمح لـCodex والـAgents بالوصول إلى:

* Components الموجودة فعلًا.
* Props الحقيقية.
* Documentation.
* Stories.
* Tests.

ثم استخدامها بدل اختراع Components جديدة. ([Storybook][11])

بل Storybook يقول صراحة إن الهدف هو:

> تمكين الـAgent من إعادة استخدام المكونات الموجودة بدل اختراع Patterns جديدة.

([Storybook][12])

وهذا بالضبط مشكلة Harbuk.

في TAYMEX إذا قال Agent:

> أحتاج Card.

بدل أن يبحث في الملفات بشكل عشوائي:

```text
Codex
 ↓
Storybook MCP
 ↓
What Card components exist?
 ↓
Card / InfoCard / StatCard / ActionCard
 ↓
Props + examples
```

ثم يستخدمها.

---

# Storybook أيضًا يصبح جزءًا من الاختبار

كل Component سيكون له Stories مثل:

```text
Button
├── Default
├── Hover
├── Focus
├── Disabled
├── Loading
├── Danger
├── RTL
└── Mobile
```

وStorybook يستطيع تشغيل:

**Interaction tests**

**Accessibility tests**

**Visual regression**. ([Storybook][13])

فتصبح المشكلة:

> أصلح Input لكنه أفسد 12 صفحة.

أصعب كثيرًا.

---

# ماذا نفعل بقواعد Design Motion؟

بعد فتح الموقع نفسه ودراسة UX Engine 2.0، أرى أنه **مفيد فعلًا** وليس مجرد صور جميلة.

يعتمد على مفاهيم ممتازة:

```text
Intent Discovery
Information Hierarchy
State Completeness
Form UX
Feedback & Affordance
Design System
Visual Character
UX Audit
```

مثلًا يفرض ست حالات من البداية:

```text
loading
empty
partial
error
success
offline
```

ويطلب التفكير بمن يستخدم الصفحة وما أخطر خطأ قد يقوم به قبل بناء الواجهة. ([Design Motion HQ][14])

كما أن Pattern الـHover لديه قواعد جيدة جدًا للموبايل، مثل عدم إخفاء Primary action خلف Hover، واستخدام pointer capability، وتوفير touch targets حول 44px. ([Design Motion HQ][15])

وSettings System يتحدث عن:

* grouping بحسب مهمة المستخدم.
* البحث.
* reset لكل setting.
* فصل الإجراءات التخريبية.
* فرق instant apply وexplicit save حسب خطورة الإعداد. ([Design Motion HQ][16])

هذه أفكار أريد تضمينها.

---

# لكن لن نعتمد على UX Engine نفسه كحارس

لسبب مهم جدًا وجدته في موقعهم.

هم أنفسهم يقولون:

عند Prompt عادي قد **لا يتم استدعاء Skill أصلًا**.

وفي اختبارهم:

> “build a pricing card component in React”

تم إنشاء أربعة ملفات **دون تشغيل أي Skill**.

ولذلك يوصون باستدعاء Command أو Skill صراحة. ([Design Motion HQ][14])

وهذه حرفيًا مشكلة المستخدم التي نحاول التخلص منها.

لذلك سنأخذ **المعرفة** من Design Motion ونحولها إلى:

```text
UX Rule
   ↓
Component API
   ↓
Page Pattern
   ↓
Storybook Story
   ↓
Automated Test
```

بدل أن نبقى بحاجة إلى قول:

> تذكر استخدام UX Skill.

---

# 5. `platform-policies`

هذه ستكون طبقة مستقلة.

وليست `RULES.md` ضخمة.

مثلًا:

```text
policies/
├── architecture
├── naming
├── security
├── settings
├── database
├── performance
├── ui
├── i18n
└── agents
```

وسنستخدم أدوات مختلفة حسب نوع القاعدة.

Nx يستطيع مثلًا منع Dependencies غير المرغوبة، وحتى منع External imports معينة. ([nx.dev][17])

Semgrep مناسب جدًا لقواعد خاصة بالمؤسسة؛ وثائقه نفسها تقترح كتابة Rules للأشياء التي تضطر لتكرارها في Code Review أو عندما توجد Library صحيحة لكن المطورين لا يستخدمونها باستمرار. ([semgrep.dev][18])

مثلًا نستطيع إنشاء Rule:

```text
SEC-021

Forbidden:
if (user.role === 'admin')

Use:
AuthorizationService.check(...)
```

أو:

```text
UI-004

Forbidden:
import '@base-ui/react/*'

outside:
platform-design-system
```

أو:

```text
SET-009

Forbidden:
literal retry count

Use:
typed settings
```

---

# 6. الأمن كجزء من الـPlatform

سنجعل:

## OWASP ASVS 5.0

المرجع الأمني الأساسي.

ASVS 5.0 هو الإصدار المستقر الحالي، وOWASP تصفه كقاعدة يمكن استخدامها كمتطلبات Secure Development وكمقياس للتحقق من الضوابط الأمنية. ([OWASP][19])

ويضاف إليه:

## OWASP API Security Top 10

خصوصًا:

* BOLA.
* Broken Authentication.
* Broken Property Authorization.
* Resource Consumption.
* Function Authorization.
* Sensitive Business Flows.
* SSRF.
* Misconfiguration.
* API inventory.
* Unsafe third-party API consumption. ([OWASP][20])

هذه لن تصبح Checklist ضخمة لكل Feature.

سنحوّل ما يمكن منها إلى:

```text
middleware
policy
generator
static rule
integration test
CI gate
```

---

# Authentication لا نعيد بناءه

سنضع **Authentication Adapter** مشتركًا.

ثم أحد Deployment Profiles يمكنه تشغيل:

## Keycloak

الإصدار الحالي وقت البحث هو 26.7.2، ويدعم OIDC/OAuth2/SAML، SSO، MFA، Federation وStep-up authentication. ([Keycloak][21])

لكن مهم:

لا أريد أن نجبر مشروعًا بسيطًا جدًا على تشغيل Keycloak.

لذلك:

```text
@our-platform/auth
```

هو العقد.

ثم Provider:

```text
Keycloak
External OIDC
Managed identity provider
```

حسب المشروع.

---

# Authorization كذلك نفصلها

إذا المشروع بسيط:

```text
RBAC
```

قد يكفي.

إذا المشروع فيه:

* multi-tenancy
* sharing
* hierarchies
* resource relationships

نضيف:

## OpenFGA

وهو مناسب للـReBAC ويمكنه أيضًا استخدام Conditions للسياق والوقت والـattributes. ([openfga.dev][22])

ولا نضع هذه التعقيدات في كل مشروع افتراضيًا.

---

# 7. Settings

بناءً على Harbuk + SARH، هذه ستكون من أعمق أجزاء الـFoundation.

سننشئ:

```text
@our-platform/settings
```

بـRegistry Typed.

مثلًا:

```ts
defineSetting({
    key: 'security.login.maxAttempts',
    type: 'integer',
    default: 5,
    min: 1,
    max: 20,
    scope: ['global', 'tenant'],
    owner: 'security',
    sensitive: false
})
```

ثم Generator يعرف أي Module يستهلك أي Settings.

وسنفرق بوضوح بين:

### Settings

تكوين مستمر.

### Feature Flags

تشغيل/إيقاف/rollout.

بالنسبة للـFeature Flags، OpenFeature يقدم API موحدًا Vendor-neutral بحيث يمكن تغيير الـProvider دون تغيير Application code. ([openfeature.dev][23])

---

# 8. البنية التحتية أيضًا لا نكررها

أرشح بقوة:

## OpenTofu

ونبني:

```text
platform-infra/
├── modules/
│   ├── network
│   ├── postgres
│   ├── containers
│   ├── cache
│   ├── object-storage
│   ├── secrets
│   ├── dns
│   ├── monitoring
│   └── backups
│
└── profiles/
    ├── small
    ├── standard
    └── high-availability
```

OpenTofu مصمم أصلًا لبناء Modules قابلة لإعادة الاستخدام والمشاركة. ([opentofu.org][24])

فتصبح بنية TAYMEX مثلًا:

```hcl
module "database" {
    source  = "@our-platform/postgres"
    profile = "standard"
}
```

ولا نعيد كتابة RDS/S3/IAM/Networking كل مرة.

---

# 9. CI/CD أيضًا مركزي

لا أريد:

```text
TAYMEX/.github/workflows
Project B/.github/workflows
Project C/.github/workflows
```

وكل واحد نسخة معدلة يدويًا.

ننشئ Repo مركزي:

```text
platform-ci
```

فيه:

```text
build.yml
test.yml
security.yml
visual.yml
deploy.yml
release.yml
```

والمشاريع تستدعيها كـGitHub Reusable Workflows. GitHub يدعم ذلك رسميًا لتجنب نسخ الـWorkflow logic بين المشاريع. ([GitHub Docs][25])

---

# وحتى GitHub يمنع تجاوزنا

نستخدم Organization Rulesets التي تستطيع فرض:

* Pull Request.
* Required status checks.
* Code scanning.
* Code-quality checks.
* file-path restrictions.
* منع force push. ([GitHub Docs][26])

إذًا Agent لا يستطيع القول:

> Tests failed but the code works.

لأنه ببساطة:

**Merge غير ممكن.**

---

# Cloud secrets كذلك

Deployments تستخدم:

## GitHub OIDC

بدل:

```text
AWS_ACCESS_KEY=...
AWS_SECRET_KEY=...
```

مخزنة في GitHub Secrets لفترات طويلة.

GitHub يدعم الحصول على Cloud credentials قصيرة العمر عبر OIDC. ([GitHub Docs][27])

---

# 10. Observability

كل مشروع يحصل تلقائيًا على:

## OpenTelemetry

من أول يوم.

OpenTelemetry Vendor-neutral ويدعم:

```text
traces
metrics
logs
```

والCollector يستطيع استقبالها ومعالجتها وتصديرها لأي Backend. ([OpenTelemetry][28])

وبالتالي لا نربط التطبيق بـDatadog أو Grafana أو AWS مباشرة.

---

# 11. الأداء يتحول إلى Contract

بدل `PERFORMANCE.md` يقول:

> يجب أن يكون النظام سريعًا.

كل Critical endpoint يحصل على Budget.

مثل:

```yaml
GET /products:
  p95: 250ms
  errors: "<1%"
  pagination: required
  max_page_size: 100
  max_queries: 5
```

ثم k6 يستطيع تعريف Thresholds تجعل Performance test نفسه يفشل إذا تجاوز SLO. ([Grafana Labs][29])

فتصبح:

```text
Performance rule
      ↓
CI
      ↓
PASS / FAIL
```

لا مراجعة بشرية بعد شهر.

---

# 12. Supply Chain Security

هذه الطبقة كثيرًا ما يتم تجاهلها في المشاريع الصغيرة.

لكن بما أننا نريد Foundation عالمية، سأضعها ضمن التصميم من البداية وإن كان تفعيل بعضها تدريجيًا.

SLSA 1.2 يقدم مستويات Provenance يمكن من خلالها تتبع كيف ومن أين تم بناء Artifact. ([SLSA][30])

ومع Cosign يمكن توقيع Container images والتحقق منها وحتى إضافة Attestations. ([docs.sigstore.dev][31])

ليست كلها مطلوبة في أول يوم، لكن Architecture يجب ألا تمنعها.

---

# 13. هل نستخدم Backstage؟

البحث يقول نعم **ولكن ليس الآن**.

Backstage ممتاز عندما يصبح لدينا عدة Projects/Services.

Software Catalog يسجل:

* من يملك Service.
* Dependencies.
* APIs.
* resources.
* lifecycle. ([Backstage][32])

وSoftware Templates تستطيع إنشاء Project من Skeleton ونشر Repo تلقائيًا. ([Backstage][33])

وTechDocs يبقي Documentation بجانب الكود. ([Backstage][34])

لكن تشغيل Backstage من اليوم الأول لـTAYMEX فقط سيكون Overengineering.

نجهز Architecture بحيث يمكن إدخاله لاحقًا.

عندما نصل مثلًا إلى:

```text
TAYMEX
Project B
Project C
Shared APIs
Shared packages
several services
```

وقتها يصبح مفيدًا جدًا.

---

# الشكل الذي أصل إليه حاليًا

```text
                    OUR ENGINEERING PLATFORM
                              │
     ┌────────────────────────┼────────────────────────┐
     │                        │                        │
 FOUNDATION               GOVERNANCE                DELIVERY
     │                        │                        │
 Settings                Architecture              CI/CD
 Auth                    Naming                    IaC
 Authorization           Security                  Deploy
 Audit                   Performance               Release
 i18n                    UI rules                  Supply chain
 Errors                  Agent rules
 Observability
     │
     └──────────────────────────┬─────────────────────────────┐
                                │
                       PLATFORM TOOLING
                                │
                        Nx generators
                        Nx project graph
                        MCP / agent context
                                │
                     ┌──────────┴──────────┐
                     │                     │
             DESIGN SYSTEM           BLUEPRINTS
                     │                     │
              Base UI                Web app
              Panda CSS              SaaS
              Storybook              Commerce
              UX patterns            AI
                     │                     │
                     └──────────┬──────────┘
                                │
                         PROJECT CREATION
                                │
        ┌───────────────────────┼────────────────────────┐
        │                       │                        │
      TAYMEX                Project B                Project C
        │                       │                        │
    Solar domain              Domain                 Domain
```

---

# التقنيات التي خرجت من البحث كأقوى Candidates حاليًا

| المجال                         | الاتجاه الأقوى حاليًا                   | Baseline؟            |
| ------------------------------ | --------------------------------------- | -------------------- |
| Workspace / Architecture graph | **Nx + pnpm**                           | نعم                  |
| Agent context                  | **Nx MCP + custom platform tooling**    | نعم                  |
| Frontend                       | **Next.js 16 Active LTS + React 19.2**  | مرشح قوي             |
| Runtime                        | **Node.js 24 LTS**                      | مرشح قوي             |
| Backend                        | **NestJS + Fastify**                    | مرشح قوي             |
| Database                       | **PostgreSQL 18**                       | نعم غالبًا           |
| UI primitive                   | **Base UI**                             | نعم للـReact profile |
| Styling governance             | **Panda CSS**                           | مرشح قوي جدًا        |
| Component source of truth      | **Storybook + MCP**                     | نعم                  |
| Identity                       | Auth abstraction + **Keycloak profile** | اختياري              |
| Fine AuthZ                     | **OpenFGA**                             | اختياري              |
| Feature Flags                  | **OpenFeature**                         | abstraction نعم      |
| IaC                            | **OpenTofu**                            | نعم                  |
| Observability                  | **OpenTelemetry**                       | نعم                  |
| Performance                    | **k6**                                  | نعم للحرج            |
| Security baseline              | **OWASP ASVS 5.0**                      | نعم                  |
| Durable Workflow               | **Temporal**                            | اختياري              |
| Developer portal               | **Backstage**                           | لاحقًا               |

Next.js 16.3.3 هو Active LTS حاليًا، React الحالي 19.2، وNode 24 هو LTS الحالي، لكن يوجد أيضًا درس مهم هنا: Next.js أصدر هذا الأسبوع تحديثًا يعالج ثغرات Critical، أي أن **التحديث الأمني وإدارة dependencies نفسها يجب أن تكون جزءًا مركزيًا من المنصة** وليست مهمة كل مشروع على حدة. ([nextjs.org][35])

وللـBackend، Nest يدعم Fastify رسميًا ويذكر أن Fastify قد يكون الاختيار الأنسب عندما تكون السرعة أولوية. ([docs.nestjs.com][36])

PostgreSQL 18.6 هو الإصدار المستقر الحالي وقت البحث. ([PostgreSQL][37])

---

# أهم مبدأ أريد تثبيته قبل أن نكمل

هناك فرق بين:

## Shared Mechanism

يذهب إلى المنصة.

مثل:

```text
Audit
Settings
Authorization
Notifications
UI
Observability
Pagination
Idempotency
```

وبين:

## Domain Policy

تبقى في المشروع.

مثل:

```text
TAYMEX Solar sizing
Harbuk Auctions
SARH Student registration
```

لا أريد إعادة خطأ شائع في Platform Architecture بأن نصنع Framework داخليًا ضخمًا يعرف تفاصيل كل الأعمال.

**المنصة توفر الأدوات والقواعد. المشروع يحدد منطق العمل.**

---

# وأكثر نتيجة مهمة بالنسبة لمشكلة الوكلاء

أرى أننا نستطيع بناء شيء أقوى بكثير من `AGENTS.md`.

مثلاً:

```bash
platform task prepare SOLAR-017
```

فيقوم Tooling تلقائيًا بجمع:

```text
Actual project graph
Actual models
Actual API contracts
Actual settings
Actual permissions
Actual events
Existing UI components
Storybook stories
Architecture rules
Security requirements
Performance budget
Allowed files
```

ويعطيها لـCodex.

ثم:

```bash
platform task verify SOLAR-017
```

يشغل:

```text
Architecture
Naming
Settings
Security
Types
Tests
UI
Responsive
Visual
Performance
```

وبهذا لا نكرر تجربة:

> اقرأ هذه الـ15 ملفات MD قبل التنفيذ.

بل الوكيل يحصل على **Context مولد من الواقع الحالي للمشروع**.

وهذه النقطة أعتبرها جزءًا أصيلًا من المنصة، وليست إضافة لاحقة.

---

## حدّثت جذر المشروع بنتائج البحث

أضفت:

```text
01_research/
├── 00_DEEP_RESEARCH_SYNTHESIS.md
├── architecture/
│   └── REUSABLE_PLATFORM_MODEL.md
└── ux-ui/
    └── AGENT_SAFE_UI_RESEARCH.md
```

وحدثت سياق المشروع ليصبح الهدف صراحةً **بنية مشتركة لعدة مشاريع وليس TAYMEX فقط**.

[تحميل جذر المشروع بعد إضافة البحث](sandbox:/mnt/data/TAYMEX_PLATFORM_ROOT_RESEARCH.zip)

الخطوة التالية التي أراها صحيحة ليست البدء بالكود حتى الآن؛ نحتاج الآن **مرحلة مقارنة وحسم Architecture Decisions**، وأول قرارين يجب أن نحسمهما بعمق هما: **شكل الـReusable Platform نفسه وكيف يتم Versioning/ترقية المشاريع منه**، ثم **Frontend/Design-System architecture** لأنهما أكثر منطقتين تسببتا سابقًا في الانحراف والتكاليف.

[1]: https://contribute.cncf.io/community/tcgs/platform-engineering/?utm_source=chatgpt.com "Platform Engineering Technical Community Group | CNCF Contributors"
[2]: https://nx.dev/docs/features/enforce-module-boundaries?utm_source=chatgpt.com "Enforce Module Boundaries | Nx"
[3]: https://nx.dev/docs/kb/organization-specific-plugin?utm_source=chatgpt.com "Enforce Organizational Best Practices with a Local Plugin | Nx"
[4]: https://nx.dev/docs/getting-started/ai-setup?utm_source=chatgpt.com "Integrate Nx with your Coding Assistant | Nx"
[5]: https://nx.dev/docs/features/enhance-ai?utm_source=chatgpt.com "Enhance Your AI Coding Agent | Nx"
[6]: https://base-ui.com/react/overview/about?utm_source=chatgpt.com "About Base UI · Base UI"
[7]: https://panda-css.com/docs/concepts/writing-styles?utm_source=chatgpt.com "Writing Styles | Panda CSS - Panda CSS"
[8]: https://panda-css.com/docs/concepts/recipes?utm_source=chatgpt.com "Recipes | Panda CSS - Panda CSS"
[9]: https://panda-css.com/docs/customization/presets?utm_source=chatgpt.com "Presets | Panda CSS - Panda CSS"
[10]: https://panda-css.com/docs/utilities/layout?utm_source=chatgpt.com "Layout | Panda CSS - Panda CSS"
[11]: https://storybook.js.org/docs/ai/mcp/overview?utm_source=chatgpt.com "MCP server | Storybook docs"
[12]: https://storybook.js.org/ai?utm_source=chatgpt.com "Storybook for AI | Storybook"
[13]: https://storybook.js.org/docs/9/writing-tests/interaction-testing?utm_source=chatgpt.com "Interaction tests | Storybook docs"
[14]: https://www.designmotionhq.com/ux-engine "UX Engine 2.0: senior-designer reasoning for Claude Code · designmotionhq"
[15]: https://www.designmotionhq.com/patterns/hover-trap "Hover Trap · designmotionhq"
[16]: https://www.designmotionhq.com/patterns/settings-system "Settings System · designmotionhq"
[17]: https://nx.dev/docs/kb/enforce-module-boundaries?utm_source=chatgpt.com "Enforce Module Boundaries ESLint Rule | Nx"
[18]: https://semgrep.dev/docs/writing-rules/rule-ideas?utm_source=chatgpt.com "Rule structure syntax examples | Semgrep"
[19]: https://owasp.org/www-project-application-security-verification-standard/?utm_source=chatgpt.com "OWASP Application Security Verification Standard (ASVS) | OWASP Foundation"
[20]: https://owasp.org/API-Security/editions/2023/en/0x11-t10/?utm_source=chatgpt.com "OWASP Top 10 API Security Risks – 2023 - OWASP API Security Top 10"
[21]: https://www.keycloak.org/docs/latest/server_admin/?utm_source=chatgpt.com "Server Administration Guide"
[22]: https://openfga.dev/docs/modeling/conditions?utm_source=chatgpt.com "Conditions | OpenFGA"
[23]: https://openfeature.dev/docs/reference/intro/?utm_source=chatgpt.com "Introduction | OpenFeature"
[24]: https://opentofu.org/docs/language/modules/develop/?utm_source=chatgpt.com "Creating Modules | OpenTofu"
[25]: https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations?utm_source=chatgpt.com "Reusing workflow configurations - GitHub Docs"
[26]: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets?utm_source=chatgpt.com "Available rules for rulesets - GitHub Docs"
[27]: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws?utm_source=chatgpt.com "Configuring OpenID Connect in Amazon Web Services - GitHub Docs"
[28]: https://opentelemetry.io/docs/?utm_source=chatgpt.com "Documentation | OpenTelemetry"
[29]: https://grafana.com/docs/k6/latest/using-k6/thresholds/?utm_source=chatgpt.com "Thresholds | Grafana k6 documentation"
[30]: https://slsa.dev/spec/v1.2/build-track-basics?utm_source=chatgpt.com "SLSA • Build: Track Basics"
[31]: https://docs.sigstore.dev/cosign/signing/signing_with_containers/?utm_source=chatgpt.com "Signing Containers - Sigstore"
[32]: https://backstage.io/docs/features/software-catalog/?utm_source=chatgpt.com "Backstage Software Catalog | Backstage Software Catalog and Developer Platform"
[33]: https://backstage.io/docs/features/software-templates/?utm_source=chatgpt.com "Backstage Software Templates | Backstage Software Catalog and Developer Platform"
[34]: https://backstage.io/docs/next/features/techdocs/?utm_source=chatgpt.com "TechDocs Documentation | Backstage Software Catalog and Developer Platform"
[35]: https://nextjs.org/blog?utm_source=chatgpt.com "Next.js by Vercel - The React Framework | Next.js by Vercel - The React Framework"
[36]: https://docs.nestjs.com/techniques/performance?utm_source=chatgpt.com "Performance (Fastify) | NestJS - A progressive Node.js framework"
[37]: https://www.postgresql.org/docs/release/18.6/?utm_source=chatgpt.com "PostgreSQL: Release Notes"

تم تنفيذ المرحلة التالية وحسم **أول القرارات المعمارية الأساسية** داخل جذر المشروع، بدون بدء البرمجة بعد.

### 1. البنية القابلة لإعادة الاستخدام حُسمت

لن نعتمد Starter Project يتم نسخه لكل مشروع. اعتمدت:

**Platform Monorepo مركزي + Repository مستقل لكل مشروع.**

المنصة المركزية تحتوي المكونات المشتركة، Design System، الأمن، Settings، أدوات الاختبار، سياسات الوكلاء، Generators، Migrations، CI/CD والبنية التحتية. أما TAYMEX وأي مشروع مستقبلي فيبقى مستقلاً ويستهلك نسخًا Versioned من المنصة.

اخترت **Nx** كعمود فقري لهذه الطبقة لأن أهم ميزة لنا ليست فقط الـMonorepo، بل إمكانية تحويل قواعد المؤسسة إلى Generators وModule Boundaries وMigrations بدل الاعتماد على قراءة الوكيل للـMD. وثائق Nx نفسها تذكر صراحة أن التوثيق وحده لا يكفي لأن المطورين لا يتبعونه دائمًا، وتقترح ترميز الممارسات في Generators. ([Nx][1])

### 2. تحديث المشاريع لن يكون Copy/Paste

اعتمدت:

**Private packages + Semantic Versioning + Release Groups + automated migrations.**

مثلًا:

```text
Foundation release
UI release
Tooling release
Optional capabilities
Infrastructure modules
```

وسيتم إنشاء المشروع الجديد مستقبلًا بشيء من نمط:

```bash
create-nx-workspace ... --preset=@org/platform
```

Nx يدعم Custom Presets وGenerators، كما يدعم Nx Release للـversioning/changelog/publishing وإصدارات مستقلة أو Release Groups. ([Nx][2])

عندما نغير Architecture مستقبلًا، لا نعطي الوكيل 20 خطوة يطبقها يدويًا، بل نصدر **Migration Generator / Codemod** يقوم بالتغيير بطريقة محددة وقابلة للاختبار. ([Nx][3])

### 3. Frontend الأساسي حُسم

للـWeb profile:

**React 19.2 + Next.js 16 Active LTS + Node.js 24 LTS.**

Next.js 16 هو خط Active LTS الحالي، وNode 24 خط LTS الحالي. ([nextjs.org][4])

---

## 4. عدّلت قرار الـUI primitives بعد المقارنة

بعد مقارنة Base UI وRadix وReact Aria، اعتمدت:

### React Aria Components

كطبقة Interaction/Accessibility الافتراضية.

السبب أنها مناسبة جدًا لما نريده:

* Accessibility قوية.
* RTL وInternationalization من أصل المكتبة.
* Mouse + Keyboard + Touch.
* Tables متقدمة.
* Collections.
* Drag & Drop.
* Virtualization للقوائم والجداول الكبيرة.

وهذا يجعلها مناسبة أكثر من مجرد primitives بسيطة لمنصة فيها Admin dashboards وبيانات كثيرة وAR/TR/EN. ([react-aria.adobe.com][5])

لكن التطبيقات **لن تستورد React Aria مباشرة**.

بل:

```text
React Aria
    ↓
Our UI Primitives
    ↓
Our Components
    ↓
Our Patterns
    ↓
Pages
```

ويمكن استخدام Base UI فقط كـAdapter داخلي استثنائي إذا وجدنا Primitive محددًا يتفوق فيه، وليس داخل Feature code.

---

# 5. Panda CSS حُسم أيضًا

اعتمدته بدل جعل Tailwind هو الأساس المفتوح للوكلاء.

السبب الرئيسي ليس أن Tailwind سيئ، بل لأن Panda يعطينا Enforcement أقوى:

```text
strictTokens: true
strictPropertyValues: true
```

مع:

* Typed recipes.
* Shared presets.
* Logical properties للـRTL/LTR.
* Custom patterns.
* Token enforcement.

([panda-css.com][6])

وسنمنع آليًا Panda escape hatch مثل:

```text
[13px]
[#123456]
```

خارج Design System.

---

# 6. لكن Panda لن يكون مصدر الحقيقة للثيم

هذه إضافة معمارية مهمة جدًا.

اعتمدت **DTCG Design Tokens 2025.10** كالمصدر المركزي الحقيقي:

```text
Design Tokens
     ↓
Panda
     ↓
Web
```

وليس:

```text
Panda tokens = design system
```

DTCG 2025.10 أصبح أول إصدار مستقر من صيغة Design Tokens المحايدة تقنيًا، ويهدف تحديدًا لمشاركة التصميم بين الأدوات والمنصات المختلفة. ([W3C][7])

أي مستقبلًا نستطيع توليد:

```text
Web
Mobile
PDF
Native app
Design tools
```

من نفس Design Tokens.

---

# 7. Storybook أصبح جزءًا من Architecture

ليس فقط صفحة لعرض Buttons.

سيكون:

**Executable UI Catalog + Agent Discovery Source.**

Storybook MCP يسمح للوكيل بالاستعلام عن:

* المكونات الموجودة.
* Props.
* Stories.
* Documentation.
* الاستخدام الصحيح.

وهذا مصمم تحديدًا لمساعدة الوكلاء على إعادة استخدام المكونات الموجودة بدل اختراع مكونات جديدة. ([Storybook][8])

لكن لأن MCP ما زال Preview، لن نعتمد عليه كحاجز وحيد.

---

# 8. Playwright سيكون الحارس البصري

اعتمدته لـ:

```text
320
375/390
430
768
1024
1440
```

مع:

```text
Arabic RTL
English LTR
Turkish LTR
```

وPlaywright يدعم Device/viewport/touch emulation وVisual screenshot comparisons. ([Playwright][9])

---

## أصبحت سلسلة الواجهة كالتالي

```text
DTCG Tokens
      ↓
Token Compiler
      ↓
Panda Platform Preset
      ↓
React Aria
      ↓
UI Primitives
      ↓
UI Components
      ↓
UX Patterns
      ↓
Page Schemas
      ↓
TAYMEX Pages
```

وهذا مهم جدًا:

**الصفحة لن تكون مكانًا للتصميم.**

الصفحة ستكون مكانًا لتركيب التصميم المعتمد.

---

## أضفت الملفات التالية

[ADR-001 — Reusable Engineering Platform](sandbox:/mnt/data/TAYMEX_PLATFORM/03_architecture/decisions/ADR-001_REUSABLE_ENGINEERING_PLATFORM_OPERATING_MODEL.md)

[ADR-002 — Versioning & Migrations](sandbox:/mnt/data/TAYMEX_PLATFORM/03_architecture/decisions/ADR-002_PLATFORM_DISTRIBUTION_VERSIONING_AND_MIGRATIONS.md)

[ADR-003 — Frontend & Design System](sandbox:/mnt/data/TAYMEX_PLATFORM/03_architecture/decisions/ADR-003_WEB_FRONTEND_AND_DESIGN_SYSTEM_FOUNDATION.md)

كما أضفت البحث المقارن التفصيلي:

[Platform Distribution Research](sandbox:/mnt/data/TAYMEX_PLATFORM/01_research/architecture/PLATFORM_DISTRIBUTION_AND_UPGRADE_RESEARCH.md)

[Frontend Stack Comparison](sandbox:/mnt/data/TAYMEX_PLATFORM/01_research/ux-ui/FRONTEND_DESIGN_SYSTEM_STACK_COMPARISON.md)

وحدثت `00_DECISIONS_PENDING.md` بحيث أصبحت القرارات المحسومة موثقة بدل أن تبقى Pending.

[تحميل جذر المشروع بعد هذه المرحلة](sandbox:/mnt/data/TAYMEX_PLATFORM_ARCH_DECISIONS_01.zip)

### المرحلة التالية

الآن نصل إلى الجزء الذي أعتبره **الأكثر أهمية بعد تجربتي Harbuk وSARH**:

**Agent Governance & Correct-by-Construction Architecture**

وسنبنيه بالتفصيل ليغطي معًا:

```text
Repository Truth
Naming
Models
Contracts
Settings
Security
Performance
Business rules
Concurrency
Responsive
UX/UI
File creation
Dependencies
Repair protocol
Regression control
Task preflight
Automated gates
```

أي المرحلة القادمة ستكون تصميم النظام الذي يجعل Codex أو أي وكيل **يكتشف البنية الحقيقية قبل الكتابة، ويُمنع تقنيًا من تنفيذ كثير من الأخطاء التي اضطررنا سابقًا لاكتشافها بالـAudits**.

[1]: https://nx.dev/docs/kb/organization-specific-plugin?utm_source=chatgpt.com "Enforce Organizational Best Practices with a Local Plugin | Nx"
[2]: https://nx.dev/docs/kb/create-preset?utm_source=chatgpt.com "Create a Custom Plugin Preset | Nx"
[3]: https://nx.dev/docs/kb/migration-generators?utm_source=chatgpt.com "Migration Generators | Nx"
[4]: https://nextjs.org/support-policy?utm_source=chatgpt.com "Next.js Support Policy | Next.js by Vercel - The React Framework"
[5]: https://react-aria.adobe.com/quality?utm_source=chatgpt.com "Quality | React Aria - Adobe"
[6]: https://panda-css.com/docs/references/config?utm_source=chatgpt.com "Configuring Panda | Panda CSS - Panda CSS"
[7]: https://www.w3.org/community/design-tokens?utm_source=chatgpt.com "Design Tokens Community Group"
[8]: https://storybook.js.org/docs/ai/mcp/overview?utm_source=chatgpt.com "MCP server | Storybook docs"
[9]: https://playwright.dev/docs/next/emulation?utm_source=chatgpt.com "Emulation | Playwright"

مثلا اغلب المشاريع تحتوي مستخدمين(تسجبل -تسجيل دخول - ادارة المستخدمين - بروفايل - اعادادت - ادارة الدخول والامن ونسيان وتجديد كلمة المرور )وادراتهم وادراة تسجيلهم وبروفايلهم .....
اغلب المشاريع فيها اعدادات
اغلب المشاريع فيها لوحة تحكم ومعلومات وقد تكون متعددة الطبقات بحسب المستخدم (مثلا لوحة تحكم الادارة - البائع - المشتري)
اغلب المشاريع نظام ثيم (كما هو حددناها في اعدادات حربوء بحيث يمكن التحكم بالقيم والمتغيرات وليس قيم ثابتة حتى الخطوط واحجامها  ... الخ)
اغلب المشاريع فيها بنية تقريا مثلا مشتركة عبارة عن 
سايد بار جانبي قابل للطي اعلاه -شعار المنصة - وفي المنتصف التبويبات مقسمة او مجمعة الى مجموعات رئيسية وثانوية مع ايقونات ) - مع هيدر قد يكون مخصص بحسب المستخدم او الصفحة - مثلا لوحة التحكم مختلف عن غيره حيث مثلا يحوي شريط للبحث - قائمة المستخدم -ايقونة الاعدادت - تبديل اللغة -تبديل العملة -تبدل الثيم .. الخ بنفس الفكرة التذييل - ايضا يحتلف تصميمه بحسب الشاشة ايضا 
محتوى الصفحة في لوحة التحكم وهنا ممكن ان تكون هيدر داخب ثابت - مع سايد بار عمودي او غيرها من التخطيطات 
صفحات محتوى مثلا المنتجات عباة عن سلايدات تعرض بطاقات المنتجات
صفحات البحث اللمتقدم وفيه فلاتر متقدمة 
صفحة تفاصيل المنتج 
صفحات الدفع والتحويل .. الخ
....
وكثير من الامور المشتركة التي قد تكون مشتركة في عدة مشاريع سواء اعلانات - شركة طاقة -شركة عقارية - بيع الكتروني او منصة متعددة البائعين -...... الخ 
---------
وقد يكون هناك شيء مشترك كما هو وقد يكون مثلا في مشروع معين يكتب فوقه بعض التفاصيل الخاصة بالمشروع المحدد او يعاد بنائه بشكل كامل - 

هل تفهم علي ماهو القصد وكيف سنعمل على ذلك وماهو جدواه 
لان كثير من الامور المشتركة ان استطعنا بنائها مرة واحدة ثم استخدامها في مشاريع مختلفة نوفر على انفسنا الكثير من الوقت والجهد والتكلفة 
مارياك فكر جيد
نعم، أفهم قصدك تمامًا، وأرى أن هذه الفكرة **قد تكون أهم قرار اقتصادي وهندسي في المشروع كله**، لأنها تنقلنا من فكرة:

> نبني TAYMEX ثم نكرر العمل في المشروع التالي

إلى:

> نبني **منصة أساس مشتركة** مرة واحدة، ثم نركب فوقها TAYMEX أو منصة عقارية أو متجرًا أو Marketplace أو نظام إعلانات أو منصة خدمات.

وهذا ليس مجرد Starter Template. ما تصفه أقرب إلى **Product Platform / Application Platform** لها مجموعة قدرات جاهزة ومترابطة، لكن كل مشروع يستطيع استخدام ما يحتاجه فقط.

## النموذج الذي أقترحه

أرى أن نفصل كل تطبيق إلى أربع طبقات:

```text
┌─────────────────────────────────────┐
│          Project Domain             │
│ Solar / Real Estate / Ads / ...     │
├─────────────────────────────────────┤
│         Reusable Capabilities       │
│ Commerce / Search / Chat / ...      │
├─────────────────────────────────────┤
│        Application Platform         │
│ Users / Settings / Dashboard / UI   │
├─────────────────────────────────────┤
│        Engineering Foundation       │
│ Security / Audit / Config / CI ...  │
└─────────────────────────────────────┘
```

وهذا الفرق مهم جدًا.

**TAYMEX Solar Calculator** خاص بـTAYMEX.

لكن **Users, Profiles, Authentication, Settings, Theme, Notifications, Admin shell, Search UI, Tables, Forms, Audit, Files...** ليست خاصة بـTAYMEX أصلًا.

---

# المستوى الأول: Engineering Foundation

هذه أشياء لا يفترض أن يعيد أي مشروع بناءها إطلاقًا:

Authentication infrastructure، Authorization، Settings engine، Audit، Logging، Errors، Validation، Pagination، File storage، Cache abstractions، Notifications، i18n، Feature flags، Observability، Security controls، Idempotency، Background jobs، Testing infrastructure، CI/CD، Design tokens وقواعد الوكلاء.

هذه تصبح تقريبًا:

```text
@platform/auth
@platform/settings
@platform/security
@platform/audit
@platform/files
@platform/notifications
@platform/i18n
@platform/observability
@platform/ui
```

المشروع **يستهلكها** ولا ينسخها.

---

# المستوى الثاني: Application Platform

وهنا تقع معظم الأمثلة التي ذكرتها.

## Users ليست صفحة، بل Capability كاملة

بدل أن نبني في كل مشروع:

تسجيل → Login → Forget password → Reset → Verify email → Profile → Change password → Sessions → Devices → MFA → Security settings → User management

نبني Capability اسمها مثلًا:

```text
identity-management
```

وتحتوي:

```text
Auth
User
Profile
Account
Security
Sessions
Devices
MFA
Password lifecycle
Email verification
Admin user management
Roles
Permissions
User settings
```

المشروع الجديد يقول فقط:

```text
users.enabled = true
registration.enabled = true
mfa.enabled = false
```

ويحدد ما يحتاجه.

---

# Settings نفس الفكرة

نحن لا نعيد بناء صفحة Settings.

نبني **Settings Platform**.

ومنها يستطيع كل Module تسجيل إعداداته:

```text
Security
Users
Theme
Localization
Currency
Commerce
Notifications
Uploads
Performance
AI
Search
...
```

والـUI نفسه يولد جزءًا كبيرًا من صفحات الإعدادات.

وبذلك إذا أضفنا Module جديدًا:

```text
Solar
```

يقول:

```text
solar.default_losses
solar.currency
solar.quick_estimate_enabled
```

فتظهر تلقائيًا في المكان المناسب وفق Schema.

---

# والـTheme مهم جدًا كما ذكرت

لا أريد مجرد:

```text
Primary color
Secondary color
```

بل **Theme Engine حقيقي**.

مثلًا:

```text
Brand
Colors
Surfaces
Typography
Font families
Font sizes
Font weights
Line heights
Spacing
Radius
Borders
Shadows
Density
Sidebar
Header
Tables
Forms
Buttons
Cards
Status colors
Charts
```

وحتى:

```text
Admin Theme
Customer Theme
Dealer Theme
Public Theme
```

يمكنها مشاركة الأساس مع اختلاف بعض الـTokens.

مثلًا مشروع عقاري:

```text
Primary = ...
Font = ...
Card radius = ...
```

TAYMEX:

```text
Primary = ...
Font = ...
```

لكن **Button component نفسه لم يتغير**.

---

# الـDashboard كذلك يجب ألا يكون Dashboard واحدة

نبني:

## Dashboard Framework

ثم تعريف Dashboards يكون Configuration/Composition.

مثلاً:

```text
Admin Dashboard
Customer Dashboard
Seller Dashboard
Dealer Dashboard
Engineer Dashboard
Accounting Dashboard
```

كل واحد يتكون من Widgets:

```text
Stats
Charts
Recent Activity
Tasks
Orders
Notifications
Quick Actions
KPIs
Alerts
Tables
```

المشروع يحدد ماذا يظهر لمن.

لا يعيد بناء Dashboard Framework.

---

# ما وصفته عن Sidebar/Header/Footer مهم جدًا

هذه يجب أن تصبح:

## Application Shell

وليس Layout خاصًا بكل مشروع.

مثلًا:

```text
AppShell
├── Sidebar
├── Header
├── Content
├── PageHeader
├── Breadcrumb
├── Footer
└── MobileNavigation
```

Sidebar نفسه يدعم:

```text
expanded
collapsed
hover-expand
mobile drawer
icons only
grouped menu
nested menu
badges
permissions
feature flags
```

والقائمة لا تكتب يدويًا في HTML.

بل:

```ts
navigation = [
 {
   group: 'commerce',
   items: [...]
 }
]
```

وبالتالي:

Admin يرى Menu.

Seller يرى Menu أخرى.

Customer يرى أخرى.

والـShell نفسه.

---

# والـHeader أيضًا composable

لا نبني Header منفصلًا لكل حالة.

بل Slots مثل:

```text
Header
├── Start
├── Search
├── Context
├── Actions
└── UserMenu
```

TAYMEX قد يستخدم:

```text
Search
Language
Currency
Theme
Notifications
Settings
User
```

بينما نظام HR يستخدم:

```text
Organization
Search
Notifications
User
```

نفس الـHeader infrastructure.

---

# الأمر نفسه بالنسبة للصفحات

وهنا توجد وفورات هائلة.

الصفحات المتكررة عبر المشاريع يمكن تحويلها إلى **Page Patterns**.

مثلاً:

```text
CRUD List
Details
Create/Edit Form
Settings
Dashboard
Advanced Search
Wizard
Checkout
Profile
Notifications
Files
Activity Log
```

والوكيل لا يصمم كل واحدة من الصفر.

---

# مثال Products

أي Marketplace أو متجر أو TAYMEX أو عقارات لديه مفهوم قريب من:

```text
Catalog
Category
Entity Card
Listing
Search
Filters
Details
Favorites
Comparison
Media Gallery
```

لكن Domain يختلف.

لذلك لا نسمي Shared Component:

```text
ProductCard
```

ونحشر فيه كل شيء.

بل يمكن أن تكون لدينا طبقات:

```text
EntityCard
     ↓
CatalogCard
     ↓
ProductCard / PropertyCard / AdCard
```

وبذلك نستطيع إعادة الاستخدام دون قتل مرونة المشروع.

---

# البحث المتقدم مثال ممتاز

هذا تقريبًا Capability كاملة يمكن إعادة استخدامها:

```text
Search
├── Query
├── Facets
├── Filters
├── Sort
├── Pagination
├── Saved searches
├── History
├── Suggestions
├── Empty state
└── Mobile filters
```

ثم Domain يسجل Filters الخاصة به.

TAYMEX:

```text
brand
power
battery_type
voltage
price
```

العقارات:

```text
city
rooms
area
price
property_type
```

Harbuk:

```text
category
location
condition
price
seller
```

**UI ومحرك الفلاتر واحد.**

Schema فقط مختلف.

---

# الدفع أيضًا

لا نبني Checkout من الصفر لكل مشروع.

نبني:

```text
Commerce Payment Capability
```

وفيه:

Payment methods، transaction lifecycle، success/failure/pending، retries، idempotency، receipts، refunds، payment status، provider adapters.

ثم:

```text
Stripe
PayPal
Bank transfer
Local gateway
Cash
```

Providers.

---

# وهذا يقودنا إلى أهم مفهوم

## Shared كما هو / Extend / Replace

أي Capability يجب أن تدعم ثلاثة أنماط.

### USE

المشروع يستخدمها كما هي.

مثلاً:

```text
Forgot Password
```

غالبًا لا يوجد سبب لإعادة بنائها.

### EXTEND

المشروع يضيف فوقها.

مثلًا User Profile الأساسي:

```text
name
email
phone
avatar
```

TAYMEX يضيف:

```text
company
tax_number
project_type
```

لا نعدل Core Profile.

بل:

```text
BaseProfile
+
TaymexProfileExtension
```

### REPLACE

أحيانًا Domain مختلف جذريًا.

حينها يستطيع المشروع استبدال implementation.

لكن يبقى ملتزمًا بالـContract.

هذه نقطة أساسية حتى لا تصبح منصتنا المشتركة سجنًا للمشاريع.

---

# وبذلك يمكن أن يكون لدينا Profiles جاهزة

مثلًا مستقبلًا:

```text
platform profiles
```

| Profile     | القدرات                                  |
| ----------- | ---------------------------------------- |
| Corporate   | Website + CMS + users + contact          |
| Commerce    | Catalog + cart + checkout + orders       |
| Marketplace | Commerce + sellers + commissions         |
| SaaS        | Accounts + subscriptions + organizations |
| Directory   | Listings + search + profiles             |
| Portal      | Users + dashboards + workflows           |
| AI Platform | AI gateway + RAG + agents                |
| Enterprise  | All governance/security capabilities     |

TAYMEX قد يبدأ من:

```text
Corporate
+
Commerce
+
Customer Portal
+
Solar custom domain
```

أما مشروع عقاري:

```text
Marketplace
+
Advanced Search
+
Property Domain
```

---

# وهنا تبدأ الفائدة الاقتصادية الحقيقية

لنفترض أن المشروع التقليدي يحتاج 100 وحدة جهد.

بدل أن يكون:

```text
Users            12
Auth              8
Settings         10
Theme             8
Dashboard        10
Forms/UI         12
Notifications     5
Files              4
Security           8
Audit              4
Domain            19
--------------------
Total            100
```

إذا كانت المنصة ناضجة، كثير من أول 81 وحدة **لن يعاد تنفيذها**.

لن تختفي كلها لأن كل مشروع يحتاج configuration/integration/testing، لكن يمكن فعليًا أن يصبح الجزء الأكبر من جهد الفريق منصبًا على:

```text
Domain-specific value
```

بدل إعادة اختراع Login للمرة العاشرة.

وهذا بالضبط المكان الذي نريد أن نصل إليه.

---

# لكن هناك خطر يجب أن ننتبه له

يمكن أن نحول الفكرة الجيدة إلى **Framework داخلي عملاق ومزعج**.

إذا حاولنا من اليوم الأول بناء كل شيء لكل مشروع ممكن، سنقضي سنة نبني Platform ولا ننتج TAYMEX.

لذلك أريد عكس ذلك.

## نبني المنصة Evolutionary

TAYMEX يصبح أول Consumer.

نبني فقط الأشياء التي:

1. نعرف أنها مشتركة فعلًا.
2. نحتاجها الآن.
3. لدينا Evidence من Harbuk وSARH أنها تتكرر.
4. نستطيع تحديد Contract واضح لها.

ثم المشروع الثاني يكشف Extension جديدة.

المشروع الثالث يكشف Pattern آخر.

وبذلك تنضج المنصة من الاستخدام الحقيقي.

---

# وأرى ثلاث درجات للمشاركة

هذا سيساعد جدًا في منع Over-generalization:

```text
LEVEL 1 — Universal
```

مثل:

Auth
Settings
Audit
Design System
Errors
Observability.

هذه مشتركة تقريبًا دائمًا.

```text
LEVEL 2 — Common Capability
```

مثل:

Commerce
Search
Chat
Payments
Notifications
Dashboards.

تستخدم في مشاريع كثيرة ولكن ليست كلها.

```text
LEVEL 3 — Domain
```

مثل:

Solar sizing
Auction bidding
Student registration
Property valuation.

هذه تبقى في المشروع.

هذا الفصل مهم جدًا.

---

# وكذلك قاعدة البيانات

لا أريد إنشاء جدول Users مختلف في كل مشروع.

Core identity يملك User.

ثم Domain يعمل:

```text
User
  │
  ├── CustomerProfile
  ├── SellerProfile
  ├── EmployeeProfile
  └── EngineerProfile
```

بدل أن نحشر 80 عمودًا في User لأن جميع مشاريعنا المختلفة تحتاج أشياء مختلفة.

---

# وأيضًا Permissions

Shared infrastructure:

```text
Permission Engine
```

لكن Permission definitions تأتي من Modules:

```text
products.view
products.create

solar.review

orders.refund
```

والـAdmin UI يستطيع تجميعها تلقائيًا.

وبذلك أي Module تضيف Permissions → تظهر في إدارة Roles دون بناء صفحة جديدة.

---

# هذه الفكرة ستساعدنا أيضًا مع الوكلاء بشكل هائل

وهذه فائدة لا تقل عن توفير البرمجة.

إذا كان المشروع الجديد يبدأ وفيه:

```text
Users
Settings
Theme
Dashboard
Forms
Table
Search
Modal
Notifications
Auth
```

جاهزة أصلًا، فإن Agent **لن يحتاج إلى إنشائها**.

وبالتالي تقل فرص أن:

يخترع Button، يخترع Security pattern، يكتب Settings محلية، يكتب Login بطريقة مختلفة، ينسى mobile، يكرر Dashboard أو يخترع Theme جديدًا.

كلما زادت المساحة المشتركة الناضجة:

**تقل مساحة القرارات التي نتركها للوكيل.**

وهذا أحد أهداف المنصة الأساسية.

---

# بل يمكن للمشروع الجديد أن يتولد بهذا الشكل

مستقبلًا أمر مثل:

```text
platform create taymex
```

يسأل:

```text
Application type?
Corporate + Commerce

Languages?
AR / EN / TR

Auth?
Yes

Customer Portal?
Yes

Admin?
Yes

Commerce?
Yes

Advanced Search?
Yes

Payments?
Later

AI?
Yes

Multi tenant?
No
```

ثم يولد:

```text
TAYMEX/
├── web
├── admin
├── portal
├── api
│
├── modules/
│   └── solar
│
└── platform.config
```

مع بنية جاهزة تعمل.

وهذا أقرب بكثير إلى الهدف الذي تصفه.

---

## رأيي النهائي

أنا **مؤيد جدًا للفكرة**، لكن ليس بوصفها “Template ضخم”.

أريدها **Composable Platform**:

```text
Foundation
     +
Reusable Capabilities
     +
Reusable UX Patterns
     +
Project Configuration
     +
Project-specific Domain
```

وهذا سيعطينا ثلاث فوائد كبيرة معًا:

**اقتصاديًا:** تقليل تكلفة وزمن المشاريع التالية بشكل كبير.

**هندسيًا:** الجودة والتحسينات الأمنية والأداء والتصميم تنتقل إلى جميع المشاريع بدل أن يعاد تنفيذها.

**مع الوكلاء:** تقل حرية الاختراع والتكرار والانحراف لأن معظم البنية الصحيحة موجودة أصلًا، وليست مجرد تعليمات يطلب من الوكيل إعادة تنفيذها.

وأرى أن هذا يجب أن يغير خطة العمل قليلًا: قبل أن نحدد تفاصيل Backend الخاصة بـTAYMEX، يجب أن نرسم الآن **Platform Capability Map** شاملًا ونصنف كل ما تعلمناه من Harbuk وSARH وTAYMEX إلى `Universal / Reusable Capability / Project Domain`، ثم نحدد لكل Capability هل ستكون Core Package أم Module اختياري أم Pattern أم Template أم شيء خاص بالمشروع. هذه ستكون الخريطة الرئيسية التي سيبنى عليها كل ما يلي.
فكر مرة اخرى بجميع الجوانب التي قد نكون اغفلناها في تحليلانا  
لكي لانكرر خطا ان بعد ان نقرر او ننفذ نكتشف خلل ما او نقص ما او مشكلة ما او زاوية او قيد او شرط لم نكن اخذنه بعين الاعتبار او لو اننا فعلنا ذلك سابقا لكن افضل ........ الخ
لذلك دعنا نكون احترافيا - طبعا بدون تضخك مبالغ فيه يوقعنا في دوامة البينة الاساسية التي بدل ان تكون مفيدة تصبح معيقة لنا او تسبب مشاكل لنا 
نعم. بعد إعادة التفكير في كل ما ناقشناه، ومع ما تعلمناه من Harbuk وSARH، أرى أن هناك عدة زوايا مهمة جدًا كان يمكن أن نقع فيها لو انتقلنا مباشرة من فكرة «منصة مشتركة» إلى التنفيذ.

أهم تعديل في التصور هو هذا:

> **لا نبني Framework ضخمًا يحاول حل كل شيء، ولا Starter Template يُنسخ، ولا مجموعة Shared Packages عشوائية. نبني Platform صغيرة النواة، قابلة للتركيب، لها حدود واضحة، وتكبر فقط بناءً على الاستخدام الحقيقي.**

وهذا يتفق أيضًا مع خبرات Platform Engineering المنشورة: الـGolden Path يجب أن يكون طريقًا مفضلًا وليس قفصًا، والمنصات تفشل عندما تصبح شديدة التعقيد أو تحاول تغطية كل الحالات من البداية. ([CNCF][1])

## أول تصحيح: ليس كل شيء «مشتركًا» يجب مشاركته بالطريقة نفسها

هذه نقطة كنا سنقع فيها بسهولة.

لدينا ستة أنواع مختلفة من إعادة الاستخدام:

| الشيء                                   | أفضل طريقة لإعادة استخدامه |
| --------------------------------------- | -------------------------- |
| Button / Settings types / Audit helpers | Package                    |
| بنية Module صحيحة                       | Generator                  |
| قواعد Security / Naming                 | Policy + CI rule           |
| CRUD / Search / Dashboard layout        | Pattern                    |
| قاعدة بيانات أو خدمة تحتاج حالة مركزية  | Service عند الحاجة فقط     |
| نموذج لمشروع جديد                       | Blueprint/Profile          |

إذا عاملنا كل شيء كـPackage سننشئ Dependency Hell.

وإذا جعلنا كل شيء Shared Service، فإن عطل المنصة المركزية قد يعطل جميع المشاريع.

وإذا نسخنا كل شيء Template فلن تصل التحديثات إلى المشاريع القديمة.

هذه التفرقة يجب أن تكون قاعدة معمارية أساسية.

---

# ثانيًا: مشاركة الآلية وليست معنى الـDomain

مثال المستخدم الذي ذكرته مهم جدًا.

قد يبدو:

```text
User
```

شيئًا مشتركًا بالكامل.

لكن User في:

* TAYMEX
* Marketplace
* جامعة
* HR
* منصة عقارية

ليس نفس الكيان التجاري.

لذلك المنصة المشتركة تملك:

```text
Identity
Account
Authentication
Sessions
Security
Password lifecycle
MFA
Profile primitives
```

أما المشروع فيملك:

```text
TaymexCustomerProfile

أو

SellerProfile

أو

StudentProfile
```

ولا نبني `User` عملاقًا فيه 70 حقلًا لأن مشاريع مختلفة قد تحتاجها.

هذه قاعدة سأثبتها:

> **Share mechanisms, not domain semantics.**

---

# ثالثًا: لا أنصح بـGlobal User Database لجميع مشاريعنا

هذا خطر كنا قد نغفله.

قد يبدو جميلًا أن يكون لدينا حساب واحد لكل منتجاتنا.

لكن ذلك يدخلنا مباشرة في:

* privacy.
* data ownership.
* account linking.
* project isolation.
* security blast radius.
* data deletion.
* regulatory issues.

لذلك الوضع الافتراضي:

```text
Project A identity data
isolated from
Project B identity data
```

لكن كلاهما يستخدم:

```text
@platform/identity
```

وإذا احتجنا يومًا SSO حقيقيًا بين مشاريع معينة، نفعله كقرار منفصل.

---

# رابعًا: الـSettings تحتاج تقسيمًا أدق

Harbuk وSARH أعطيانا دليلًا قويًا أن Settings نفسها يمكن أن تصبح مصدر مشاكل.

ليس كل شيء يجب أن يسمى Setting.

نحتاج خمس فئات مختلفة:

```text
Configuration
Preferences
Feature Flags
Policies
Secrets
```

مثلاً:

`theme.fontSize` → Configuration.

`user.language` → Preference.

`newCheckout.enabled` → Feature flag.

`security.password.minLength` → Security policy.

`OPENAI_API_KEY` → Secret.

وإذا وضعنا الجميع في `SettingsService` واحد، بعد سنتين سنحصل على وحش جديد.

---

# والأهم: بعض الأشياء غير قابلة للتعطيل أصلًا

هذه زاوية مهمة جدًا.

لا أريد Admin Setting تقول:

```text
security.authorization_enabled = false
```

أو:

```text
audit.enabled = false
```

لبعض العمليات الحساسة.

بعض القواعد تكون:

## Platform Invariants

ولا يستطيع مستخدم أو مشروع تعطيلها.

مثلاً:

* authorization on protected resources.
* input validation.
* secrets protection.
* audit للأحداث الحرجة.
* CSRF حيث ينطبق.
* safe file upload pipeline.

وهكذا لا تتحول مرونة Settings إلى ثغرة أمنية.

---

# خامسًا: Settings Resolution نفسها تحتاج تصميمًا

إذا أصبح لدينا لاحقًا:

```text
Platform default
Project setting
Environment override
Tenant setting
User preference
```

فمن يفوز؟

يجب تحديد ذلك الآن.

مثلاً:

```text
Platform default
        ↓
Project
        ↓
Environment
        ↓
Tenant
        ↓
User
```

لكن ليس كل Setting يسمح بكل المستويات.

ويجب أن يوجد:

```text
Effective Settings Resolver
```

واختبار يثبت القيمة الفعلية.

هذا تحديدًا يمنع سيناريو Harbuk:

> Setting موجودة، لكنها ليست التي يستهلكها Runtime فعليًا.

---

# سادسًا: الـTheme المرن أيضًا يحمل خطرًا

فكرة Harbuk في جعل الألوان والخطوط والأحجام قابلة للتحكم ممتازة، لكن لو تركناها مفتوحة جدًا يمكن أن ندخل:

* تصميمات مكسورة.
* contrast سيئ.
* أحجام غير قابلة للاستخدام.
* font downloads غير آمنة.
* CSS injection.
* mobile breakage.

لذلك Theme Engine لا يسمح CSS عشوائي.

بل:

```text
Validated Design Tokens
```

مثلاً يستطيع المشروع اختيار:

```text
fontScale = compact / normal / comfortable
```

أو قيمة ضمن نطاق معتمد.

ولا يستطيع كتابة:

```css
font-size: 2.347rem;
```

عشوائيًا.

والخطوط أيضًا تأتي من Font Registry معتمد.

---

# سابعًا: Dashboard مشترك لا يعني Dashboard ديناميكي بلا حدود

هناك إغراء لأن نبني نظام Widgets يستطيع المستخدم إعادة ترتيب كل شيء وتكوين أي Dashboard.

لكن ذلك قد يتحول سريعًا إلى منتج مستقل.

الأفضل:

```text
Dashboard Shell
Widget Registry
Layout primitives
Permissions
Responsive rules
```

مشتركة.

أما:

```text
Sales KPI
Solar Assessments
Student Attendance
Auction Revenue
```

فتبقى Widgets خاصة بالمشروع.

وبعض Layouts يمكن تخصيصها، لكن لا نبني Page Builder كاملًا إلا إذا احتجناه فعلاً.

---

# ثامنًا: لا نحاول جعل جميع الصفحات Schema-Driven

هذه أيضًا نقطة يجب أن نحذر منها.

Schema ممتاز لـ:

* Settings.
* CRUD forms البسيطة.
* Filters.
* Tables.
* permissions.
* menus.

لكن إذا حاولنا بناء كل UX بهذه الطريقة:

```json
{
 "component": "...",
 "children": [...]
}
```

سنصنع Framework داخليًا أعقد من React نفسه.

لذلك:

> **Schema-driven where repetitive, handcrafted composition where experience matters.**

صفحة Checkout أو Solar Wizard المتقدمة تبنى من Components مشتركة، لكن ليست بالضرورة مولدة بالكامل من JSON.

---

# تاسعًا: نحتاج Extension Model من البداية

أي Capability مشتركة يجب أن تحدد هل المشروع يستطيع:

```text
USE
EXTEND
REPLACE
```

لكن EXTEND لا يعني inheritance عشوائي.

أفضّل:

```text
Contracts
Ports
Adapters
Slots
Composition
```

مثلاً:

```text
Profile
    +
ProjectProfileExtension
```

أو:

```text
PaymentProvider
    ↓
StripeAdapter
LocalBankAdapter
```

ولا نربط المنصة باسم Provider محدد.

---

# عاشرًا: لا نبني Plugin System عامًا الآن

قد يبدو Plugin architecture احترافيًا.

لكن في هذه المرحلة سيكون تضخيمًا خطيرًا.

نكتفي بـ:

```text
Capability contracts
Adapters
Nx generators
Module manifests
```

إذا أثبتت عدة مشاريع مستقبلًا أننا نحتاج Plugins ديناميكية فعلًا، نبنيها حينها.

---

# الحادي عشر: يجب فصل Runtime عن Platform قدر الإمكان

هذه نقطة مهمة جدًا.

إذا توقف GitHub الخاص بالـPlatform أو package registry، يجب ألا تتوقف التطبيقات الموجودة.

أي أن المنصة تستخدم أساسًا أثناء:

```text
Development
Build
Upgrade
CI
```

لكن المشروع المنشور يجب أن يكون قادرًا على العمل مستقلًا.

لا نريد:

```text
TAYMEX runtime
       ↓
central platform server
```

لكل شيء.

إلا لخدمة نقرر عمدًا أنها مركزية.

هذا يقلل Blast Radius.

---

# الثاني عشر: كل مشروع مستقل تشغيليًا

حتى لو كانت البنية مشتركة:

```text
Database
Cache
Files
Secrets
Logs
Deployments
```

تكون منفصلة افتراضيًا.

وبذلك مشكلة مشروع عقاري لا تؤثر على TAYMEX.

---

# الثالث عشر: نحتاج Deployment Profiles وليس بنية Enterprise للجميع

هذه زاوية مهمة جدًا لمنع المنصة من أن تصبح معيقة.

لن نجبر موقع شركة بسيط على:

* Kubernetes.
* Temporal.
* OpenSearch.
* Redis cluster.
* 5 services.

نبني Profiles:

| Profile             | الاستخدام               |
| ------------------- | ----------------------- |
| `small`             | موقع/Portal بسيط        |
| `standard`          | معظم التطبيقات التجارية |
| `high-availability` | أنظمة حرجة              |
| `data-heavy`        | بحث وبيانات كبيرة       |
| `AI-heavy`          | workloads ذكاء اصطناعي  |

ونضيف الخدمات عند الحاجة.

هذا هو معنى Golden Path وليس Golden Cage. CNCF نفسها تشدد على الموازنة بين الطريق الموصى به والمرونة. ([CNCF Contributors][2])

---

# الرابع عشر: Security Profiles كذلك

ليس منطقيًا أن نعامل Landing Page مثل منصة مالية.

OWASP ASVS نفسها تميز مستويات مختلفة من الضمان، وتوصي بالمستوى 2 لمعظم التطبيقات والمستوى 3 للتطبيقات عالية القيمة أو عالية الحساسية. ([devguide.owasp.org][3])

لذلك قد يكون عندنا:

```text
security-profile:
public
standard
sensitive
high-assurance
```

لكن يوجد Minimum Baseline لا يمكن النزول عنه.

---

# الخامس عشر: Threat Model خاص بكل مشروع لا يمكن مشاركته بالكامل

المنصة توفر Template وأدوات.

لكن:

TAYMEX لديه:

```text
payments
customer data
solar studies
```

Harbuk لديه:

```text
seller fraud
auctions
wallet
```

SARH لديه بيانات جامعية.

إذن Security Controls مشتركة، لكن Threat Model خاص بالـDomain.

---

# السادس عشر: الأداء كذلك يجب ألا يصبح رقمًا عامًا

لا نقول:

> كل API أقل من 200ms.

بعض العمليات طبيعتها مختلفة.

المنصة توفر:

```text
Pagination
Caching
Query instrumentation
Rate limiting
Async jobs
Performance testing
```

أما Budget الفعلي فيأتي من المشروع.

---

# السابع عشر: نحتاج Data Ownership واضحًا

كل Capability يجب أن تعلن:

```text
owns tables:
...

reads from:
...

publishes:
...

consumes:
...
```

ولا تسمح Module بقراءة Tables داخل Module أخرى مباشرة.

هذه نقطة ظهرت في Harbuk وSARH كثيرًا بشكل غير مباشر.

---

# الثامن عشر: Database migrations جزء من Platform Contract

إذا Package مشتركة لديها Schema أو migration، يجب أن نعرف:

* كيف تتحدث.
* كيف ترجع.
* هل هي backward compatible.
* ماذا يحدث عند version mismatch.

وإلا ستكون ترقية Shared Package أخطر من بناء Feature جديدة.

---

# التاسع عشر: Versioning لا يكفي وحده

نحتاج:

```text
Compatibility Matrix
```

مثلاً:

```text
Platform Foundation 3.x
requires
UI >= 2.5
Tooling >= 4
```

وكذلك:

```text
platform.lock
```

داخل كل مشروع يحدد:

* capabilities.
* versions.
* profile.
* migrations applied.

---

# العشرون: Deprecation يجب أن تُصمم من البداية

هذه نقطة عادة تُنسى.

أي Platform Capability سننشئها ستحتاج يومًا ما إلى:

```text
Deprecated
Replacement
Migration
Removal
```

Martin Fowler يشدد تحديدًا على أن الإهمال في التخطيط لإيقاف الخدمات القديمة يمكن أن يقوض فائدة المنصة كلها. ([martinfowler.com][4])

لذلك:

```text
experimental
beta
stable
deprecated
removed
```

لكل Capability.

---

# الحادي والعشرون: لا نحافظ على كل Major Version للأبد

وإلا بعد خمسة مشاريع نصبح شركة صيانة للإصدارات القديمة.

مثلاً سياسة مستقبلية:

```text
Latest major: fully supported
Previous major: security fixes
Older: upgrade required
```

نقرر التفاصيل لاحقًا، لكن المبدأ مهم.

---

# الثاني والعشرون: Reference Applications

هذه فكرة أرى أننا نحتاجها.

داخل Platform نفسها لا نعتمد فقط Unit Tests.

نملك تطبيقين:

```text
reference-minimal
```

يستخدم الحد الأدنى.

و:

```text
reference-showcase
```

يستخدم معظم Capabilities.

بعد أي تغيير في Platform:

نبني ونختبر الاثنين.

وبذلك نعرف أن التحديث لم يكسر Consumers.

---

# الثالث والعشرون: Conformance Suite

كل مشروع يحصل تلقائيًا على:

```text
@platform/conformance
```

تفحص:

Architecture
Settings
Security baseline
UI imports
Theme usage
i18n
Responsive basics
Audit integration
Package compatibility.

هذه ليست Audit جديدة كل مرة.

هي Safety Net دائم.

---

# الرابع والعشرون: نحتاج Contract Tests أكثر من كثرة Tests

إذا لدينا:

```text
NotificationProvider
```

ليس المهم أن كل مشروع يكتب نفس 40 Test.

المنصة تقدم Contract Test Suite:

```text
provider must:
send
fail safely
retry
respect timeout
...
```

أي Adapter جديد يجب أن يجتازها.

---

# الخامس والعشرون: يجب أن نفكر بالـOffline/Failure States من البداية

Design Motion أعطانا نقطة جيدة هنا.

ليس فقط:

```text
loading
success
```

بل أيضًا:

```text
empty
partial
error
offline
stale
permission denied
rate limited
```

هذه تتحول إلى UX patterns مشتركة وليس تعليمات نتذكرها كل مرة.

---

# السادس والعشرون: Accessibility جزء من Foundation

لا نريد اكتشاف بعد 200 صفحة أن:

* focus order خاطئ.
* labels ناقصة.
* keyboard navigation مكسور.
* contrast سيئ.

وهذا أحد الأسباب التي جعلت React Aria مرشحًا قويًا عندنا.

---

# السابع والعشرون: i18n أكبر من RTL/LTR

هذه من الزوايا التي يجب ألا نختزلها.

نحتاج أيضًا:

* pluralization.
* dates.
* time zones.
* number formatting.
* currency.
* units.
* Arabic digits preference.
* search normalization.
* sorting/collation.
* URL localization.
* SEO hreflang.
* translation fallback.
* content direction داخل النصوص المختلطة.

وتكون Foundation واحدة لكل المشاريع.

---

# الثامن والعشرون: Currency وUnits لا يجب أن تكون Strings

خصوصًا TAYMEX.

نبني أنواعًا واضحة:

```text
Money
Currency
Measurement
Energy
Power
Voltage
Capacity
```

وهذا يقلل أخطاء مثل:

`W` مقابل `kW`

أو:

`USD` مقابل `$`.

---

# التاسع والعشرون: الوقت Time handling

مشكلة صغيرة ظاهريًا لكنها تسبب Bugs كثيرة.

نضع قاعدة:

```text
UTC internally
explicit timezone at boundaries
```

مع Timezone service موحدة.

ولا يوجد:

```text
new Date()
```

عشوائي في Business Logic.

---

# الثلاثون: Notifications ليست Email فقط

Foundation يمكن أن تعرف:

```text
Notification
    ↓
Email
SMS
Push
WhatsApp
In-app
```

لكن Providers اختيارية.

ونفصل:

Template
Channel
Delivery
Preference
Retry
Audit.

---

# الحادي والثلاثون: Files كذلك Capability كاملة

بدل رفع ملف مباشر:

```text
Upload
Validation
Malware policy
Metadata
Storage
Access control
Versioning
Thumbnail
Retention
Deletion
```

ثم المشاريع تستخدمها.

---

# الثاني والثلاثون: Integrations تحتاج Adapter Framework

كل مشروع تقريبًا يتصل بشيء خارجي.

Payments
Maps
Email
AI
ERP
WhatsApp.

لذلك نعتمد:

```text
Port
Adapter
Contract test
Timeout
Retry
Circuit breaker
Observability
```

بدل كتابة integration من الصفر.

---

# الثالث والثلاثون: Webhooks تحتاج بنية جاهزة

Inbound:

signature verification
replay protection
idempotency.

Outbound:

retry
signing
delivery logs.

هذه من الأمور المشتركة جدًا ويمكن بناؤها مرة واحدة.

---

# الرابع والثلاثون: Events دون الدخول مباشرة في Event-Driven Architecture معقدة

يمكن أن نستخدم Domain Events داخل التطبيق وOutbox للعمليات المهمة.

لكن لا ننشر Kafka في كل مشروع لأننا نريد أن نبدو Enterprise.

---

# الخامس والثلاثون: AI Capability نفسها يجب أن تكون Optional

المنصة يمكن أن توفر:

```text
AI Gateway
Prompt registry
Provider abstraction
Usage/cost
Tracing
Guardrails
```

لكن المشروع الذي لا يحتاج AI لا يحمل هذه البنية.

---

# السادس والثلاثون: SEO/CMS/Public Web لا ينبغي تجاهلها

لأن كثيرًا من مشاريعنا ستكون مواقع عامة أيضًا.

يمكن أن توجد Capability اختيارية:

```text
Public Web Foundation
```

تعالج:

SEO
Metadata
Sitemap
robots
structured data
social preview
content pages.

لكن ليست جزءًا من كل Backend.

---

# السابع والثلاثون: إدارة التكاليف

منصة قوية يمكن أن توفر علينا البرمجة لكنها ترفع Cloud bill إذا كانت Default ثقيلة.

لذلك Infrastructure profiles يجب أن تحتوي:

```text
cost envelope
```

ونرصد:

Cloud
AI
Email/SMS
Storage
Search.

---

# الثامن والثلاثون: Vendor Lock-In

لن نمنع كل Vendor lock-in؛ هذا غير واقعي.

لكن نضع Abstraction فقط عندما:

1. احتمال التبديل حقيقي.
2. الخدمة critical.
3. تكلفة abstraction أقل من فائدتها.

لا نبني Wrapper لكل مكتبة في npm.

---

# التاسع والثلاثون: تراخيص OSS وSupply Chain

كل Package مشتركة تدخل عشرات المشاريع.

أي ترخيص أو vulnerability فيها ينتشر للجميع.

لذلك Shared Platform تحتاج:

SBOM
dependency scanning
license policy
signed releases تدريجيًا.

---

# الأربعون: الوثائق نفسها يجب ألا تتحول إلى Harbuk جديد

هذه نقطة شديدة الأهمية.

لا نريد:

```text
requirements 1
requirements 2
audit
audit2
resolved
final
final2
```

سيكون لدينا Source of Truth واحد لكل شيء:

```text
ADR → قرار معماري
Manifest → الحقيقة الآلية
Code → التنفيذ
Tests → الإثبات
Generated docs → العرض
```

إذا تغير القرار:

نحدث الـADR أو نستبدله بـADR جديد.

لا نضيف عشرة تقارير متضاربة.

---

# الحادي والأربعون: Agent Context يجب أن يكون Generated

وهذا حل مباشر لمشكلة السياق التي ناقشناها.

لا نعتمد عليّ أو على Codex لكي نتذكر:

> هل يوجد Setting لهذا؟

الأداة نفسها تجلب:

```text
Relevant models
Relevant methods
Relevant settings
Relevant components
Relevant permissions
Relevant policies
Actual signatures
```

من المشروع الحالي.

---

# الثاني والأربعون: Agents لا يملكون الحق في «تحسين Architecture» أثناء Feature

أي اختلاف معماري يصبح:

```text
RFC
```

لا Patch جانبي.

وهذه ستكون سياسة Platform عامة لكل المشاريع.

---

# الثالث والأربعون: نحتاج Escape Hatch، لكن رسمي

لأن Golden Paths لا ينبغي أن تصبح Cage. هذه نقطة يؤكدها CNCF أيضًا. ([CNCF][1])

إذا Project لديه حالة حقيقية لا يغطيها Platform:

```text
platform-exception.yaml
```

مثلاً:

```text
rule: UI-04
reason: ...
owner: ...
expiry: ...
```

ولا نعطل Rule عالميًا.

---

# الرابع والأربعون: Platform نفسها تحتاج Owner

حتى لو كنا فريقًا صغيرًا.

يجب أن يكون واضحًا أن Shared Code لا يعدله Feature Agent مباشرة.

هناك مفهوم منطقي:

```text
Platform ownership
Project ownership
```

وإلا ستتحول Platform نفسها إلى Harbuk كبير.

---

# الخامس والأربعون: يجب قياس نجاح Platform

ليس بعدد Features فيها.

بل مثلًا:

```text
Time to create new project
Time to first production feature
% reused capabilities
Upgrade duration
Regression rate
Security findings after implementation
Agent task failure reasons
Platform exceptions count
```

إذا بدأ عدد Exceptions يرتفع، فالPlatform لا تناسب مستخدميها.

Platform Engineering الحديثة تتعامل مع المنصة كمنتج ومطوري التطبيقات كعملائها، لا كمجرد مستودع أدوات. ([CNCF][5])

---

# بعد كل ذلك: كيف نمنع التضخم؟

هذه أهم نقطة.

أقترح ثلاث قواعد صارمة.

## 1. Rule of Evidence

لا نبني Capability مشتركة لأننا **نتخيل** أننا سنحتاجها.

نبنيها إذا:

* ظهرت بالفعل في Harbuk/SARH/TAYMEX؛ أو
* هي Infrastructure أساسية مثبتة عالميًا.

---

## 2. Rule of Three

للأشياء غير الواضحة عالميًا:

نترك أول implementation داخل المشروع.

عند تكرار Pattern في مشروع ثانٍ نراقبه.

وعند ثبوت أنه متطابق أو قريب جدًا نرفعه إلى Platform.

لدينا بالفعل Evidence سابق لبعض الأشياء من Harbuk وSARH، لذلك لا نحتاج انتظار ثلاثة مشاريع لكل شيء.

---

## 3. 80/20 Platform

نستهدف أن تجعل Platform **80% من الحالات المشتركة سهلة جدًا**.

ولا نحاول هندسة الـ20% النادرة قبل أن تظهر.

هذا يتماشى أيضًا مع توصية أن تكون الـIDP عملية وموجهة للـ80/20 بدل محاولة إرضاء كل حالة ممكنة. ([CNCF][6])

---

# لذلك أعدل هيكلنا السابق إلى خمسة مستويات

```text
LEVEL 0
Engineering Governance
```

CI, agents, security, testing, architecture enforcement.

```text
LEVEL 1
Platform Kernel
```

أصغر شيء نثق أنه عالمي.

```text
LEVEL 2
Application Foundation
```

Users, settings, theme, app shell, i18n, files, notifications...

```text
LEVEL 3
Optional Capabilities
```

Commerce, payments, search, chat, CMS, AI...

```text
LEVEL 4
Project Domain
```

Solar, properties, auctions, university...

هذا أكثر أمانًا من محاولة وضع كل شيء في Core.

---

# ما الذي أضعه فعليًا في Kernel v1؟

ليس Commerce ولا Chat ولا AI.

فقط:

| Kernel v1                      |
| ------------------------------ |
| Project tooling/generators     |
| Architecture boundaries        |
| Contracts                      |
| Error model                    |
| Validation                     |
| Typed configuration foundation |
| Security primitives            |
| Authorization infrastructure   |
| Audit                          |
| Observability                  |
| i18n foundation                |
| Design tokens                  |
| Testing/conformance            |
| CI policies                    |

ثم Application Foundation يمكن أن تحتوي أول Modules مشتركة:

Users/Auth
Settings
Theme
AppShell
Files
Notifications.

وبعدها ننمو.

---

# وكيف نعرف أننا جاهزون؟

قبل أن نبني TAYMEX كاملًا، لا يكفي أن Foundation Compile.

أريد **Vertical Slice واحدًا حقيقيًا** يمر عبر المنظومة كلها.

مثلاً:

### Product Management slice

يشمل:

Admin login
Permission
Product model
Settings
AR/TR/EN
Form
File upload
Table
Search
Audit
Responsive UI
Tests
Observability.

إذا اكتشفنا أن Architecture صعبة أو Agent يستطيع تجاوز Design System أو Settings، نصلح Platform هنا.

وليس بعد بناء 40 صفحة.

---

## الخلاصة

بعد إعادة التفكير، الخطر الأكبر عندنا لم يعد أن **ننسى Capability**.

الخطران الأكبر هما:

> **أن نبني Platform أوسع مما نحتاج فتصبح عبئًا.**

أو العكس:

> **أن نبني Shared Code بلا Contracts وLifecycle فتصبح المشاريع رهينة له.**

لذلك النموذج الذي أوصي بتثبيته هو:

**Small Kernel + Composable Foundations + Optional Capabilities + Strong Contracts + Explicit Escape Hatches + Project Isolation + Correct-by-Construction Governance.**

والأهم: لا نريد Platform تبدو احترافية على الورق. نريد Platform تجعل **إنشاء مشروع جيد أسرع من إنشاء مشروع سيئ**، وتترك للمشروع الحرية في الأماكن التي يجب أن يختلف فيها.

بهذا التوازن، أعتقد أننا نأخذ معظم فوائد إعادة الاستخدام والحوكمة التي نريدها، بدون أن نبني لأنفسنا وحشًا داخليًا يحتاج فريقًا مستقلًا فقط لصيانته.

[1]: https://www.cncf.io/blog/2022/06/15/the-top-10-fallacies-in-platform-engineering/?utm_source=chatgpt.com "The top 10 fallacies in platform engineering | CNCF"
[2]: https://contribute.cncf.io/community/tcgs/platform-engineering/?utm_source=chatgpt.com "Platform Engineering Technical Community Group | CNCF Contributors"
[3]: https://devguide.owasp.org/en/03-requirements/05-asvs/?utm_source=chatgpt.com "ASVS - OWASP Developer Guide"
[4]: https://martinfowler.com/articles/platform-prerequisites.html?utm_source=chatgpt.com "Mind the platform execution gap"
[5]: https://www.cncf.io/blog/2025/11/19/what-is-platform-engineering/?utm_source=chatgpt.com "What is platform engineering? | CNCF"
[6]: https://www.cncf.io/blog/2023/12/08/internal-developer-platform-vs-internal-developer-portal-vs-paas/?utm_source=chatgpt.com "Internal developer platform vs internal developer portal vs PaaS | CNCF"
انتقل للتالي 
ملاحظة من المشاكل التي واجهناها احيانا كان ينشا اعادادت متداخلة في اكثر من مكان وبالتالي يخلق تعارض في التنفيذ - قد يكون نفس الاعدادت في حالات معينة في اكثر من مكان ولكن يجب ان تكون هناك سياسة واضحة للاولوية ومن هو الاعلى 
تم الانتقال للمرحلة التالية، وأدخلت ملاحظتك عن **تداخل الإعدادات وتعارض الأولويات** كقرار معماري أساسي، وليس كملاحظة جانبية.

النقطة الأهم التي حسمناها هي أن الخطأ سيكون أن نقول ببساطة:

```text
User > Tenant > Project > Platform
```

ونستخدم هذه الأولوية لكل شيء.

هذا غير صحيح. إعداد الثيم مثلًا يمكن أن يسمح للمستخدم بالتغلب على قيمة المشروع، بينما إعداد أمني لا يجوز للمستخدم أو حتى مدير المشروع أن يضعف الحد الأمني المفروض من المنصة.

لذلك اعتمدنا نظامًا أدق.

## 1. تعريف واحد فقط لكل Setting

مثلًا:

```text
ui.table.defaultPageSize
```

يتم تعريفه **مرة واحدة فقط** في Registry المركزي.

يمكن أن تكون له قيم في:

```text
Platform Default
Project
Tenant
```

لكن هذه ليست ثلاثة Settings.

بل:

```text
Canonical Setting
        │
        ├── project value
        └── tenant value
```

وهذا يمنع ما واجهناه سابقًا:

```text
settings.table_page_size
admin.table_per_page
products.default_page_size
```

وكل واحد يؤثر في جزء مختلف.

---

# 2. لا توجد أولوية واحدة لكل الإعدادات

قسمت النظام إلى سبع فئات:

### Platform Invariants

لا يمكن تجاوزها أصلًا:

```text
Authorization
Critical Audit
Validation
Secret protection
```

### Deploy Configuration

مثل:

```text
database pool
service URLs
deployment region
```

تكون:

```text
Platform Default
      ↓
Project
      ↓
Environment
```

والـEnvironment أعلى.

وهذا مشابه لفكرة أنظمة Configuration الناضجة التي تملك ترتيبًا صريحًا لمصادر القيم بدل تركه ضمنيًا. Spring Boot مثلًا يحدد ترتيب Property Sources بشكل واضح ويجعل المصادر الأعلى أولوية تتغلب على الأقل. ([Home][1])

### Runtime Settings

مثل:

```text
quotation.expiryDays
catalog.pageSize
upload.maxCount
```

قد تكون:

```text
Platform
 ↓
Project
 ↓
Tenant
```

حسب تعريف الإعداد.

### User Preferences

مثل:

```text
language
display currency
light/dark
density
```

قد تصبح:

```text
Platform
 ↓
Project
 ↓
Tenant
 ↓
User
```

### Feature Flags

لن تمر عبر Settings Resolver العادي.

ستستخدم OpenFeature-style evaluation لأن الـFlags لديها سياق واستهداف مختلف. OpenFeature نفسه يحدد ترتيب دمج Evaluation Context صراحة بدل تركه عشوائيًا. ([openfeature.dev][2])

### Security Policies

وهنا لا نستخدم:

```text
last value wins
```

مثلًا:

```text
minimum password length
```

إذا Platform تقول:

```text
12
```

والمشروع يقول:

```text
14
```

تكون:

```text
14
```

لكن إذا المشروع يقول:

```text
8
```

لا يسمح له بإضعاف Platform.

والأمر نفسه مع:

```text
max login attempts
session lifetime
MFA requirement
```

سنستخدم:

```text
FLOOR
CEILING
STRONGEST
```

بحسب طبيعة السياسة.

### Secrets

لا تدخل Settings أصلًا:

```text
API keys
DB credentials
Encryption keys
```

مصدرها Secret Provider فقط.

وهذا يتفق أيضًا مع مبدأ فصل الـconfiguration المتغير حسب deployment عن الكود نفسه. ([12factor.net][3])

---

# 3. أضفت أنواع Resolution واضحة

أي Setting يجب أن يكون له واحد من:

```text
OVERRIDE
REPLACE
MERGE
FLOOR
CEILING
STRONGEST
FLAG_EVALUATION
NO_OVERRIDE
```

وهذا يحل مشكلة مهمة أخرى:

لو لدينا Array أو Object في مستويين مختلفين، لا يقرر الوكيل من رأسه هل:

```text
merge
```

أو:

```text
replace
```

كل Setting تحدد استراتيجيتها مسبقًا.

---

# 4. أضفت Effective Settings Resolver مركزيًا

لن يسمح للكود أن يفعل:

```text
DB setting
↓
if null read env
↓
if null read config
↓
if null use 20
```

كل Feature يستخدم Resolver واحدًا.

مثلًا داخليًا:

```text
SettingsResolver.resolve(...)
```

ويكون هو الوحيد المسؤول عن:

```text
scopes
precedence
validation
policy
fallback
```

---

# 5. والأهم: Explainability

أضفتها كمتطلب **إلزامي**.

نريد مستقبلًا أمرًا مثل:

```bash
platform settings explain ui.table.defaultPageSize \
  --context tenant:42,user:7
```

ويعطينا:

```text
Effective value: 50

Policy:
OVERRIDE

Winner:
Tenant 42

Platform default:
25

Project:
30

Tenant:
50

User:
not allowed
```

وبالتالي عندما تقول:

> لماذا النظام يستخدم 50 رغم أنني وضعت 30؟

لا نبدأ بالبحث في 10 ملفات.

النظام يخبرنا بالسبب مباشرة.

---

# 6. Emergency Override

أحيانًا Production يحتاج Override سريعًا.

سمحت به، لكن بشكل منضبط:

```text
reason
actor
createdAt
expiresAt
incident/ticket
audit
```

ولا يستطيع تجاوز:

```text
Platform Invariant
Security Floor
```

ولا يوجد:

> Override مؤقت بقي خمس سنوات.

---

# 7. Module Settings Manifest

أي Module مثل:

```text
Products
```

سيعلن:

```yaml
settings:
  consumes:
    - ui.table.defaultPageSize
    - catalog.search.maxResults
```

وبالتالي عند إعطاء Agent مهمة Products، النظام يعرف تلقائيًا:

> هذه هي Settings التي يجب عليك استهلاكها.

بدل أن نعتمد على أن يتذكرها الوكيل.

---

# 8. منع Strings العشوائية

لن نسمح:

```ts
settings.get("max_results")
```

بل Typed API.

مثل:

```text
Settings.Catalog.Search.MaxResults
```

أو generated accessor مشابه.

وبذلك الاسم لا يمكن أن يختلف بين:

Backend
Admin UI
Worker
Feature أخرى.

---

# 9. منع إنشاء Setting ثانية لنفس المفهوم

إذا أحدهم أنشأ:

```text
commerce.defaultCurrency
```

ثم Agent آخر حاول:

```text
orders.currency.default
```

والاثنان يعنيان نفس الشيء:

يجب أن يرفض Conformance Check ذلك أو يرفعه للمراجعة.

لكن إذا كان لدينا:

```text
commerce.currency.accountingDefault
```

و:

```text
preferences.currency.display
```

فهذه مفاهيم مختلفة فعلًا ومسموح بها.

هذه النقطة مهمة جدًا.

---

# 10. Saved but not Applied

أدخلت صراحةً مشكلة واجهناها سابقًا:

> الإعداد موجود في Admin، ويمكن تعديله، لكنه غير مستهلك من Runtime.

نريد Diagnostics تكشف:

```text
Setting defined but no consumers
```

أو:

```text
Module claims it consumes setting
but code doesn't
```

أو:

```text
Settings UI exposes deprecated setting
```

وهكذا لا نكتشف بعد أشهر أن Setting مجرد واجهة لا تؤثر.

---

# 11. إعدادات موزعة وتغيير Runtime

كل Setting ستعرف أيضًا:

```text
hot
reload
restart
deploy
```

مثلاً:

```text
theme.mode
```

Hot.

بينما:

```text
database.pool.size
```

قد يكون Restart/Deploy.

ولا نترك هذا لكل Module.

---

# 12. Settings History + Rollback

أي تعديل Runtime مهم:

```text
old value
new value
actor
scope
timestamp
version
```

مع optimistic concurrency حتى لا يعدل شخصان Setting في نفس الوقت ويضيع تعديل أحدهما.

والـRollback لا يحذف التاريخ، بل ينشئ Version جديدة.

---

# 13. Capability Map

أنشأت أيضًا أول **Platform Capability Map**.

البنية الآن:

```text
L0 — Engineering Governance
        ↓
L1 — Platform Kernel
        ↓
L2 — Application Foundation
        ↓
L3 — Optional Capabilities
        ↓
L4 — Project Domain
```

### L0

القواعد والأدوات التي تحكم:

```text
Agents
Architecture
CI
Naming
Security
Performance
Conformance
```

### L1

نواة صغيرة جدًا:

```text
typed configuration
errors
validation
authorization primitives
audit
observability
i18n
pagination
idempotency
contracts
```

### L2

ما تحدثت عنه أنت:

```text
Users
Auth
Profiles
Settings
Theme
App Shell
Sidebar
Header
Footer
Dashboard foundation
Files
Notifications
Common CRUD
```

### L3

اختياري:

```text
Commerce
Search
Payments
Marketplace
CMS
Chat
Workflow
AI
Maps
Subscriptions
Reporting
```

### L4

الـDomain الحقيقي:

```text
TAYMEX Solar
Real Estate
Auctions
University
...
```

---

# 14. وأدخلت USE / CONFIGURE / EXTEND / REPLACE

أي Capability مشتركة يجب أن تقول صراحة هل المشروع يستطيع:

```text
USE
CONFIGURE
EXTEND
REPLACE
OPT OUT
```

وهذا يعالج السيناريو الذي ذكرته سابقًا:

> الشيء مشترك كما هو في مشروع، وفي مشروع آخر نضيف فوقه، وفي مشروع ثالث نعيد تنفيذه.

لكن الاستبدال يكون عبر Contract وليس Fork عشوائيًا للمنصة.

---

## الملفات الجديدة

[Platform Capability Map](sandbox:/mnt/data/TAYMEX_PLATFORM/03_architecture/PLATFORM_CAPABILITY_MAP.md)

[ADR-004 — Configuration & Settings Governance](sandbox:/mnt/data/TAYMEX_PLATFORM/03_architecture/decisions/ADR-004_CONFIGURATION_SETTINGS_AND_OVERRIDE_GOVERNANCE.md)

[Settings Governance Gate](sandbox:/mnt/data/TAYMEX_PLATFORM/04_governance/settings/SETTINGS_GOVERNANCE_CHECKLIST.md)

وهذه نسخة الجذر بعد التحديث:

[تحميل المشروع بعد مرحلة Capability + Settings](sandbox:/mnt/data/TAYMEX_PLATFORM_CAPABILITY_SETTINGS_02.zip)

المرحلة التالية أصبحت منطقية جدًا الآن: **Agent Governance / Correct-by-Construction System**. أي كيف نجعل الوكيل قبل كتابة أي كود يكتشف الـModels والحقول والـSettings والـComponents والـPermissions الحقيقية، وكيف نمنعه من التخمين والـHardcode وإنشاء ملفات أو بنى أو حلول متوازية، وكيف نجعل إصلاح Bug محدود الأثر ولا يولد Regression جديدًا.

[1]: https://docs.spring.io/spring-boot/reference/features/external-config.html?utm_source=chatgpt.com "Externalized Configuration :: Spring Boot"
[2]: https://openfeature.dev/specification/sections/evaluation-context/?utm_source=chatgpt.com "Evaluation Context | OpenFeature"
[3]: https://www.12factor.net/config?utm_source=chatgpt.com "The Twelve-Factor App"

التالي 
هل يجب عليك تغيير اسم الجذر وهيكلته لاننا غيرنا عدة قرارات 
نعم، وكان الأفضل تغييره الآن قبل أن يتوسع أكثر. تم اعتماد جذر جديد محايد:

## `ENGINEERING_PLATFORM`

ولم يعد `TAYMEX_PLATFORM` هو الجذر، لأن **TAYMEX أصبح أول مشروع مستهلك للمنصة المشتركة، وليس المنصة نفسها**.

أعدت الهيكلة لتصبح جاهزة فعليًا كـPlatform Monorepo مستقبلية:

```text
ENGINEERING_PLATFORM/
├── docs/
│   ├── 00-overview/
│   ├── 01-research/
│   ├── 02-platform-spec/
│   ├── 03-architecture/
│   ├── 04-governance/
│   ├── 05-experience/
│   ├── 06-quality/
│   ├── 07-operations/
│   └── 90-references/
│
├── packages/          ← النواة والحزم المشتركة
├── capabilities/      ← القدرات الاختيارية المشتركة
├── tooling/           ← Generators / CLI / agent tooling / conformance
├── blueprints/        ← قوالب تكوين المشاريع
├── infra/             ← البنية التحتية المشتركة
└── examples/
    └── taymex/         ← مرجع لأول Consumer فقط
```

والأهم أنني **لم أنقل TAYMEX production code إلى هذا الجذر**؛ المشاريع الفعلية ستبقى Repositories مستقلة وتستهلك Platform versions، حتى لا نخلق Mega Monorepo لجميع العملاء.

كما أضفت قرارًا معماريًا رسميًا يثبت هذا التغيير:

[ADR-005 — Canonical Platform Repository Structure](sandbox:/mnt/data/ENGINEERING_PLATFORM/docs/03-architecture/decisions/ADR-005_CANONICAL_PLATFORM_REPOSITORY_STRUCTURE.md)

وهذه وثيقة الهيكل الحالي:

[Repository Structure](sandbox:/mnt/data/ENGINEERING_PLATFORM/docs/00-overview/REPOSITORY_STRUCTURE.md)

وسياق المنصة الجديد:

[Platform Context](sandbox:/mnt/data/ENGINEERING_PLATFORM/docs/00-overview/PLATFORM_CONTEXT.md)

والنسخة الكاملة بعد إعادة الهيكلة:

[تحميل ENGINEERING_PLATFORM_ROOT_V3.zip](sandbox:/mnt/data/ENGINEERING_PLATFORM_ROOT_V3.zip)

من الآن سأتعامل مع:

`/mnt/data/ENGINEERING_PLATFORM`

على أنه **الجذر الرسمي الوحيد**.

والآن نستطيع الانتقال بأمان إلى المرحلة الأكثر حساسية: **Agent Governance / Correct-by-Construction**، وفيها سنصمم النظام الذي يمنع الوكيل من التخمين، واختراع Models/Fields/Settings/Components، وتجاوز الأمن أو الأداء أو المكونات المركزية، ويضبط أيضًا آلية إصلاح الأخطاء بحيث لا ينتج الإصلاح Regression أو تغييرًا جانبيًا.

انتقل لهذه المرحلة وانت تعلم انها من اهم المراحل واكثرها حساسية وخاصة وفق اللدروس المستفادة لذلك لاتغفل اي شيء وهذه النقطة نريدها (الاكثر اكتمالا بمعنى جودة وشمولية لجميع الحلول التي وضعناها وان تكون فعلا حلول مجدية وليس فقط نظريا )

تم الانتقال إلى هذه المرحلة باعتبارها **أهم طبقة في المنصة بعد المعمارية نفسها**، وتعمدت ألا أحولها إلى ملف قواعد إضافي فقط. النتيجة أصبحت نظامًا هندسيًا متكاملًا اسمه عمليًا:

> **Correct-by-Construction Agent Governance**

أي أن الهدف ليس أن نراجع الكود عشر مرات بعد كتابته، بل أن **طريقة إنشاء المهمة والسياق والكود والـCI نفسها تدفع الوكيل نحو التنفيذ الصحيح من البداية**.

### أهم قرار اتخذته

لن نعتمد على `AGENTS.md` أو ملفات القواعد كخط دفاع رئيسي. Codex أصلًا يجمع تعليمات `AGENTS.md` بصورة هرمية حسب المسار، وله سياق تعليمات مشروع محدود؛ لذلك جعلت `AGENTS.md` قصيرًا جدًا، ووظيفته فقط إرشاد الوكيل إلى أدوات المنصة. الحقيقة الفعلية تُولد من Repository الحالي في كل مهمة. ([OpenAI][1])

وهذا مناسب جدًا للدروس التي خرجنا بها من Harbuk وSARH.

---

## دورة العمل الجديدة

لن يستطيع الوكيل القفز مباشرة إلى كتابة الكود:

```text
Requirement
    ↓
Task Contract
    ↓
Repository Preflight
    ↓
Repository Truth
    ↓
0 unverified assumptions
    ↓
Implementation
    ↓
Actual Git Diff
    ↓
Impact + Risk analysis
    ↓
Selected Quality Gates
    ↓
Evidence
    ↓
Merge
```

النقطة الحاسمة:

> **لا يوجد UNKNOWN → GUESS.**

بل:

```text
KNOWN
```

أو:

```text
UNKNOWN → BLOCK
```

---

# Repository Truth

سيصبح لدينا لاحقًا:

```bash
platform inspect module products
platform inspect symbol ProductService
platform inspect settings products
platform inspect permissions orders
platform inspect components card
platform inspect consumers @platform/ui
```

ويُبنى هذا من الواقع الحالي:

* Nx project graph.
* الـModels والـsymbols الحقيقية.
* API contracts.
* DB schema.
* Settings registry.
* Permissions.
* Events.
* Storybook.
* Design tokens.
* Dependencies.
* Versions.

وبالتالي لن يعتمد الوكيل على:

> أعتقد أن اسم الحقل هو `status`.

أو:

> أظن أن هذه Method ترجع Product.

---

# Task Contract أصبح Machine-readable

أنشأت Schema حقيقية له.

كل مهمة تحدد مثلًا:

```text
mode
risk
allowedPaths
forbiddenPaths

allowNewFiles
allowDependencies
allowMigrations
allowPublicContractChanges
allowPlatformChanges
allowArchitectureChanges
```

والقيم الافتراضية الحساسة كلها:

```text
DENY
```

أي أن الوكيل لا يستطيع أثناء إصلاح صفحة أن يقول:

> احتجت Component جديدًا فأنشأته.

أو:

> أضفت Library أسهل.

أو:

> غيرت Shared Settings Resolver بالمرة.

إلا إذا كانت المهمة تسمح بذلك أصلًا.

---

# والأهم: الوكيل لا يقرر ما الذي يحتاج إلى فحصه

الـDiff الفعلي هو الذي يقرر.

مثلًا تغيير:

```text
apps/taymex/catalog/page
```

قد يبقى R2.

أما تغيير:

```text
packages/design-system/Button
```

يرتفع تلقائيًا إلى R3.

وتغيير:

```text
Settings Resolver
Authorization Core
Authentication
Governance Policy
```

يصبح R4.

ولا يستطيع Agent تخفيض المستوى بنفسه.

---

# لم أرتكب الخطأ المعاكس: تشغيل كل شيء دائمًا

هذه نقطة مهمة جدًا لمنع المنصة من التحول إلى عبء.

قسمت التحقق إلى:

### Fast loop

ثوانٍ/دقائق قليلة:

```text
scope
lint
types
architecture
settings
naming
affected tests
```

### PR standard

يضاف حسب التغيير:

```text
integration
security
API contracts
Storybook
responsive
RTL
a11y
visual
selected DB checks
```

### High Risk

فقط R3/R4:

```text
expanded consumers
migration compatibility
security delta
performance regression
owner approval
```

### Nightly / Release

هنا فقط:

```text
full E2E
full visual matrix
load tests
deep security
full drift scan
SBOM / release checks
```

OPA مناسب جدًا لاختيار Checks المطلوبة بناءً على الملفات المتغيرة والبيانات المنظمة، ويمكن اختبار سياسات Rego نفسها قبل وضعها في CI. ([openpolicyagent.org][2])

---

# اختيار الأداة الصحيحة لكل قاعدة

هذه نقطة حساسة جدًا أيضًا.

لن نبني محرك قواعد خاص بنا لكل شيء.

| نوع المشكلة                         | Enforcement                       |
| ----------------------------------- | --------------------------------- |
| Module dependencies                 | Nx boundaries                     |
| إنشاء Modules صحيحة                 | Nx generators                     |
| Imports / UI / TypeScript           | ESLint                            |
| Organization/security code patterns | Semgrep                           |
| Task/Diff/Manifest/IaC policy       | OPA / Conftest                    |
| API shape                           | OpenAPI + generated types         |
| Breaking API                        | oasdiff                           |
| UI discovery                        | Storybook                         |
| UI/a11y                             | Storybook + Playwright            |
| Responsive/Visual                   | Playwright                        |
| Security                            | Semgrep + tests + optional CodeQL |
| Performance                         | instrumentation + budgets + k6    |
| Merge                               | GitHub Rulesets                   |

وهذا مهم لأن Nx نفسها تقول صراحة إن توثيق أفضل الممارسات ليس كافيًا لأن المطورين لا يقرأونه أو لا يطبقونه دائمًا، وتقترح تحويل العمليات المتكررة والخطرة إلى Generators. وهذا حرفيًا ما واجهناه. ([Nx][3])

---

# Nx Enterprise ليس Dependency إلزامية

بحثت هذه النقطة أيضًا.

Nx لديها الآن Conformance ممتازة لتطبيق القواعد على Project Graph وبصورة language-agnostic، لكنها تتطلب Nx Enterprise. لذلك **لن نبني أساس منصتنا بحيث يعتمد عليها**.

النسخة الأساسية ستستخدم:

```text
Nx OSS boundaries
+
custom Nx plugin/generators
+
ESLint
+
Semgrep
+
OPA
```

ويمكن إضافة Nx Conformance لاحقًا كـAccelerator إذا كان الترخيص مبررًا. ([Nx][4])

---

# حل مشكلة الـUI من جذورها

Storybook MCP مثير للاهتمام جدًا لأنه مبني تحديدًا على المشكلة التي واجهناها: Agent لا يعرف Components الموجودة فيخترع غيرها.

Storybook يتيح للوكيل الاستعلام عن:

```text
components
props
stories
documentation
tests
```

وتوصياتهم نفسها تقول للوكيل ألا يخمّن حتى Props شائعة، بل يتحقق من Storybook أولًا. ([Storybook][5])

لكن لأن MCP ما زال Preview، **لن نعتمد عليه كحاجز**.

لدينا كذلك:

```text
ESLint
import restrictions
token restrictions
visual tests
```

أي حتى لو لم يستخدم Agent الـMCP جيدًا، المخالفة لا تمر.

---

# مشكلة تسمية Models والحقول

عالجتها بطبقتين.

### Syntactic

مثلاً:

```text
camelCase
PascalCase
file naming
method naming
```

تفرضها أدوات اللغة.

### Semantic

سيكون عندنا:

```text
Terminology Registry
```

مثلاً المفهوم:

```text
Quotation
```

وAliases الممنوعة:

```text
QuoteOffer
ProposalRecord
...
```

حتى لا يصبح نفس المفهوم بعد سنتين بأربعة أسماء.

لكن لن أجعل AI semantic similarity حكمًا Blocking؛ لأنه احتمالي. Exact aliases والقواعد المؤكدة Blocking، والاقتراحات الذكية Advisory فقط.

---

# الـContracts أيضًا

Frontend لا يكتب من عنده:

```ts
interface Product { ... }
```

إذا كان هناك Contract معتمد.

للـAPIs العابرة للعمليات نعتمد:

```text
OpenAPI 3.1
→ generated types/client
```

والـBreaking Change يفشل CI.

أما Pact فلن أفرضه على Modular Monolith بلا داعٍ؛ سيكون مفيدًا فقط عندما يكون لدينا Consumers/Providers مستقلة فعليًا. Pact نفسه مخصص أساسًا لعقود Consumer/Provider المستقلة. ([docs.pact.io][6])

---

# Settings

ربطت نظام الوكلاء مباشرة بقرار Settings السابق.

الوكيل يجب أن يعرف آليًا أن Module ما يستهلك مثلًا:

```text
products.defaultPageSize
security.upload.maxFileSize
```

ولا يسمح له:

```text
settings.get("some-string")
```

عشوائيًا.

ولا:

```text
if (...) fallback 25
```

إذا كان هناك Setting مركزية.

وكذلك:

```text
module.manifest
```

يصرح بالإعدادات التي:

```text
defines
consumes
```

فتستطيع المنصة اكتشاف:

```text
defined but unused
claimed but not consumed
unknown
duplicate
deprecated but exposed
```

وهذا علاج مباشر لأكثر مشاكل Harbuk/SARH تكلفة.

---

# الأمن

لم أضع:

> Agent يجب أن يراجع OWASP.

بل جعلت التغيير نفسه يفعّل Security Delta.

مثلًا أي تغيير يحتوي:

```text
new endpoint
permission
sensitive field
upload
payment
webhook
secret
third-party integration
ownership lookup
destructive operation
```

يرفع المتطلبات الأمنية تلقائيًا.

والـSecurity Delta ليس Threat Model من 40 صفحة كل مرة؛ فقط **ما الذي تغير في سطح الهجوم بسبب هذه المهمة؟**

وسيكون لدينا:

```text
shared authorization
negative authorization tests
Semgrep
SCA
secret scan
```

وCodeQL يكون طبقة إضافية عند توفر GitHub Code Security؛ GitHub يسمح أيضًا بكتابة Custom CodeQL Queries خاصة بقواعد المؤسسة. ([GitHub Docs][7])

---

# الأداء

الأداء أيضًا لم يعد عبارة:

> فكر بالأداء.

سيكون لدينا:

```text
pagination rules
bounded queries
no I/O in loops
query instrumentation
cache typed settings
```

ومسارات مهمة فقط تحصل على Budget مثل:

```text
p95
query count
payload
bundle size
```

ولا نشغل Load Test لكل تعديل نص.

---

# الوظائفية

هذه النقطة حصلت على معالجة مستقلة.

أي Task وظيفية معقدة يمكن أن تتطلب:

```text
invariants
states
transitions
authorization
settings
edge cases
failure modes
concurrency
idempotency
side effects
audit
notifications
```

لكن لم أجعل كل الحقول Mandatory في كل CRUD بسيط.

يحدد:

```text
N/A
```

عندما لا تنطبق.

وبهذا نتجنب خطأين معًا:

**التنفيذ السطحي**

و:

**التوثيق البيروقراطي المبالغ فيه.**

---

# أهم جزء بالنسبة للإصلاحات

أنشأت بروتوكولًا مستقلًا.

لم يعد:

```text
Problem
→ Fix
```

بل:

```text
Reproduce
   ↓
Root Cause
   ↓
Correct Abstraction
   ↓
Blast Radius
   ↓
Regression Evidence
   ↓
Minimal Root-cause Fix
   ↓
Affected Consumer Tests
   ↓
Final Diff Verification
```

والقاعدة:

> **Fix at the lowest correct abstraction, not the quickest local place.**

إذا الخطأ في `Card` نفسها، نصلح Card ونختبر Consumers.

إذا الخطأ في استخدام الصفحة لـCard، **ممنوع تعديل Card**.

وهذا يعالج تحديدًا ظاهرة:

> أصلح هنا وكسر هناك.

---

# ومنعت أخطر شيء أثناء الإصلاح

Task من نوع `fix` يمنع:

```text
opportunistic refactor
cleanup
rename
move
dependency upgrade
architecture improvement
```

غير المرتبط مباشرة بالـRoot Cause.

إذا اكتشف Agent تحسينًا آخر:

**Task جديدة.**

---

# لا توجد تقارير Audit ضخمة بعد كل مهمة

وهذه نقطة تعلمناها من Harbuk وSARH.

بدل:

```text
audit
audit2
resolved
final
triple-check
```

الـCI ينتج تلقائيًا:

```text
task
base SHA
head SHA
risk
diff
gates selected
results
security findings
visual diff
performance
exceptions
```

Evidence artifact.

إذا اكتشفنا مشكلة متكررة، تتحول إلى:

```text
Test
Rule
Generator
Policy
```

وليس إلى ملف MD جديد يطلب من Agent قراءته في المرة القادمة.

---

# Exceptions أيضًا منظمة

قد تكون هناك حالة حقيقية تحتاج كسر Golden Path.

أنشأت Schema للـException.

يجب تحديد:

```text
rule
scope
reason
owner
approver
risk
expiry
compensating controls
```

وانتهاء صلاحية Exception يجعل CI يفشل.

لا يوجد:

> عطّل هذه القاعدة لهذا المشروع إلى الأبد.

---

# GitHub سيكون الحاجز الأخير

GitHub Rulesets تستطيع منع الدمج ما لم تنجح Status Checks، ويمكنها أيضًا طلب Code Scanning وCode Owner reviews وحماية paths وغيرها. ([GitHub Docs][8])

سنضع Status واحدًا نهائيًا:

```text
governance-summary
```

إذا لم ينجح:

**لا Merge.**

وبهذا:

> Agent يقول Done

ليس له أي قيمة هندسية.

---

## ما تم إنشاؤه فعليًا

القرار المعماري الرئيسي:

[ADR-006 — Correct-by-Construction Agent Governance](sandbox:/mnt/data/ENGINEERING_PLATFORM/docs/03-architecture/decisions/ADR-006_CORRECT_BY_CONSTRUCTION_AGENT_GOVERNANCE.md)

المواصفة الكاملة للنظام:

[Agent Execution System](sandbox:/mnt/data/ENGINEERING_PLATFORM/docs/04-governance/agent-system/AGENT_EXECUTION_SYSTEM.md)

بروتوكول الإصلاح ومنع الـRegression:

[Repair & Regression Protocol](sandbox:/mnt/data/ENGINEERING_PLATFORM/docs/04-governance/agent-system/REPAIR_AND_REGRESSION_PROTOCOL.md)

مصفوفة الـQuality Gates:

[Quality Gate Matrix](sandbox:/mnt/data/ENGINEERING_PLATFORM/docs/06-quality/QUALITY_GATE_MATRIX.md)

خطة التنفيذ العملية:

[Governance Implementation Roadmap](sandbox:/mnt/data/ENGINEERING_PLATFORM/docs/04-governance/agent-system/GOVERNANCE_IMPLEMENTATION_ROADMAP.md)

وأنشأت بالفعل أول Machine-readable contracts:

[Task Contract Schema](sandbox:/mnt/data/ENGINEERING_PLATFORM/tooling/schemas/task-contract.schema.json)

[Module Manifest Schema](sandbox:/mnt/data/ENGINEERING_PLATFORM/tooling/schemas/module-manifest.schema.json)

[Governance Exception Schema](sandbox:/mnt/data/ENGINEERING_PLATFORM/tooling/schemas/exception.schema.json)

ومثال Task حقيقية:

[Task Example](sandbox:/mnt/data/ENGINEERING_PLATFORM/tooling/examples/TASK_PRODUCT_FIX.example.yaml)

وحتى `AGENTS.md` المستقبلي جعلته صغيرًا عمدًا:

[AGENTS.md Template](sandbox:/mnt/data/ENGINEERING_PLATFORM/tooling/templates/AGENTS.md.template)

تحققت أيضًا من أن ملفات JSON Schemas الثلاثة صالحة نحويًا وأن مثال YAML قابل للقراءة.

### النسخة الكاملة الحالية

[تحميل ENGINEERING_PLATFORM_GOVERNANCE_V4.zip](sandbox:/mnt/data/ENGINEERING_PLATFORM_GOVERNANCE_V4.zip)

وهنا أعتقد أننا وصلنا إلى فرق جوهري عن Harbuk وSARH: **لم نكتب “قائمة أشمل من القواعد”، بل صممنا طريقًا لتحويل القواعد التي يمكن فرضها إلى Controls فعلية، مع Risk Routing حتى لا تتحول الحوكمة نفسها إلى عائق.**

والخطوة التالية المناسبة لم تعد المزيد من التنظير في هذه النقطة؛ يجب أن نبدأ **Wave 0 ثم Wave 1 من الـGovernance Roadmap كأدوات فعلية**: بناء أول نسخة من `platform task prepare`, `platform task verify`, Schema validation، scope gate وNx/generator foundation، ثم نحاول عمدًا جعل Agent يخالفها ونرى هل المنصة تمنعه فعلاً.

[1]: https://openai.com/index/unrolling-the-codex-agent-loop/?utm_source=chatgpt.com "Unrolling the Codex agent loop | OpenAI"
[2]: https://www.openpolicyagent.org/docs/policy-testing?utm_source=chatgpt.com "Policy Testing | Open Policy Agent"
[3]: https://nx.dev/docs/kb/organization-specific-plugin?utm_source=chatgpt.com "Enforce Organizational Best Practices with a Local Plugin | Nx"
[4]: https://nx.dev/docs/reference/conformance?utm_source=chatgpt.com "Conformance | Nx"
[5]: https://storybook.js.org/docs/ai/mcp/overview?utm_source=chatgpt.com "MCP server | Storybook docs"
[6]: https://docs.pact.io/?utm_source=chatgpt.com "Introduction | Pact Docs"
[7]: https://docs.github.com/en/enterprise-cloud%40latest/code-security/concepts/code-scanning/codeql/custom-queries?utm_source=chatgpt.com "Custom CodeQL queries - GitHub Enterprise Cloud Docs"
[8]: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets?utm_source=chatgpt.com "Available rules for rulesets - GitHub Docs"
تم تنفيذ **Wave 0 + Wave 1 فعليًا** داخل `ENGINEERING_PLATFORM`، وليس فقط كتابة خطة جديدة.

والأهم: اختبرنا النظام بمحاولات مخالفة متعمدة للتأكد أن الحوكمة **تمنع الخطأ** بدل أن توثقه بعد وقوعه.

## ما أصبح موجودًا فعليًا

لدينا الآن CLI حقيقي:

```bash
./tooling/bin/platform validate
./tooling/bin/platform task prepare TASK.yaml
./tooling/bin/platform task verify TASK.yaml --base <trusted-sha>

./tooling/bin/platform inspect projects
./tooling/bin/platform inspect module <name>
./tooling/bin/platform inspect settings [key]
./tooling/bin/platform inspect components

./tooling/bin/platform generate module ...
./tooling/bin/platform generate ui-primitive ...
```

### `task prepare`

لا يسمح للوكيل بالدخول مباشرة إلى التنفيذ.

يتحقق أولًا من:

* صحة Task Contract.
* وجود الـModules الحقيقية.
* Settings المطلوبة.
* عدم وجود Assumptions غير متحققة.
* مستوى Risk.
* الـGates المطلوبة.
* أن الـGate المطلوبة **منفذة فعلًا وليست مجرد Rule مكتوبة للمستقبل**.

ثم يولد:

```text
.agent-context/TASK-ID/
├── TASK.json
├── REPOSITORY_TRUTH.json
├── SUMMARY.md
└── ALLOWED_PATHS.txt
```

وهذا بداية الحل الفعلي لمشكلة فقدان السياق.

---

# `task verify`

التحقق يتم على **Git Diff الحقيقي**.

أي ليس بناءً على تقرير الوكيل عما يدعي أنه عدله.

يقرأ:

```text
trusted base
        ↓
actual Git diff
        ↓
governance
```

ويفحص حاليًا:

* Scope.
* Forbidden paths.
* New files.
* Dependencies.
* Migrations.
* Public contracts.
* Platform/shared code.
* Architecture changes.
* Rename/move أثناء Fix.
* Risk escalation.
* Assumptions.
* Gate validity.

ويصدر Evidence:

```text
.governance/evidence/TASK-ID/
├── governance-summary.json
└── governance-summary.md
```

---

# عالجنا ثغرة مهمة جدًا اكتشفناها أثناء التنفيذ

كان يمكن للوكيل نظريًا أن يقول:

> سأحدد `baseRevision` أحدث حتى لا تظهر بعض التغييرات في الـDiff.

لذلك أضفت:

## `BASE-001`

في CI يأتي الـBase SHA من مصدر موثوق مثل GitHub PR نفسه.

إذا كان:

```text
Task baseRevision != trusted PR base
```

تُرفض المهمة.

وبذلك لا يستطيع الوكيل تصغير نطاق الـDiff الذي تتم مراجعته.

---

# مشكلة أخرى اكتشفناها أثناء التنفيذ

لا يكفي أن نسجل Rule مثل:

```text
UI-001
```

ثم تسمح Task أن تقول:

> UI-001 PASS

بينما نحن لم نبن بعد فحص UI حقيقي.

هذا سيكون **False Assurance** أخطر من عدم وجود Rule.

لذلك أصبح لكل Rule:

```text
implemented
planned
```

وإذا Task طلبت:

```text
UI-001
```

بينما حالته:

```text
planned
```

فإن:

```text
platform task prepare
```

يفشل.

وهذا مهم جدًا.

**لن ندعي أبدًا أن لدينا حماية لم نبنها بالفعل.**

---

# Settings أصبحت جزءًا Machine-readable من الآن

أنشأت:

```text
tooling/registry/settings.registry.yaml
```

مع Schema حقيقية.

كل Setting تعرف:

```text
key
owner
kind
valueType
resolution
scopes
default
lifecycle
runtimeBehavior
```

مثلًا:

```text
preferences.ui.themeMode
```

وتعرف صراحة:

```text
resolution: OVERRIDE

scopes:
  platform
  project
  tenant
  user
```

بينما Platform invariant يمكن أن يكون:

```text
resolution: NO_OVERRIDE
```

وهذا بداية التطبيق الحقيقي لسياسة الأولويات التي ناقشناها.

---

# Module Manifest

أي Module ستعلن رسميًا:

```text
id
layer
owner

dependencies
data ownership

settings:
    defines
    consumes

permissions:
    defines
    consumes

events
contracts
security tags
performance tags
extension modes
```

وإذا كتب Module:

```yaml
settings:
  consumes:
    - does.notExist
```

يفشل التحقق.

أي أننا بدأنا فعليًا بمعالجة السيناريو الذي واجهناه سابقًا:

> Feature يستخدم Setting يعتقد أنها موجودة، أو يكتب Setting أخرى لنفس الغرض.

---

# Terminology Registry

أنشأنا أيضًا:

```text
tooling/registry/terminology.registry.yaml
```

حتى تكون لدينا لاحقًا معالجة لمشكلة:

```text
Quotation
Quote
Offer
Proposal
```

إذا كانت كلها تشير إلى نفس المفهوم.

قسمنا الأمر إلى:

**Syntactic naming**
يفرضه TypeScript/ESLint.

و:

**Semantic naming**
يفرضه Terminology Registry.

ولا سنجعل AI similarity Rule blocking لأنها احتمالية؛ Exact forbidden aliases فقط تكون Blocking.

---

# Default Deny أصبح حقيقيًا

Task افتراضيًا:

```yaml
allowNewFiles: false
allowDependencies: false
allowMigrations: false
allowPublicContractChanges: false
allowPlatformChanges: false
allowArchitectureChanges: false
```

أي Agent لا يحصل على صلاحية:

> كل شيء إلا ما منعناه.

بل:

> **فقط ما سمحنا به.**

وهذا فرق كبير جدًا.

---

# Repair/Fix أصبح له حماية أولية

في Task:

```text
mode: fix
```

إذا حاول الوكيل:

```text
rename
move
```

ملفًا أثناء الإصلاح:

```text
FIX-001 → FAIL
```

ونستكمل في الموجات القادمة:

* Regression evidence.
* impact graph.
* root-cause verification.
* affected consumers.

---

# Risk أصبح يُحسب من التغيير الحقيقي

مثلًا Task تقول:

```text
risk: R2
```

لكن Diff يمس:

```text
packages/design-system/**
```

فالحد الأدنى يصبح:

```text
R3
```

وإذا مس:

```text
packages/settings/**
packages/auth/**
packages/authorization/**
tooling/**
docs/03-architecture/**
infra/**
```

يصعد إلى:

```text
R4
```

ولا يستطيع Agent تخفيض هذا المستوى.

---

# Nx Foundation أصبحت موجودة

أضفت Root حقيقي:

```text
package.json
pnpm-workspace.yaml
nx.json
eslint.config.mjs
```

واعتمدت حاليًا:

**Nx 23.1.2**، وهو خط Nx الحالي، بينما v22 وv21 في LTS. ([Nx][1])

وأضفت Custom Nx Generator package:

```text
tooling/nx-plugins/platform-generators/
```

وبه Generator أولي لـ:

```text
module
ui-primitive
```

Nx نفسه يدعم حاليًا Node 24 رسميًا مع Nx 23، وهو Target Runtime الذي اعتمدناه للمنصة. ([Nx][2])

كما ثبتنا `pnpm` على خط 11 الحالي بدل Pre-release 12. ([npmjs.com][3])

---

# Module Boundary Foundation

أضفت أول قواعد Nx/ESLint:

```text
kernel
foundation
capability
domain
```

بحيث اتجاه Dependencies يصبح قابلًا للفرض بدل أن يبقى داخل Architecture MD.

وسنوسعها عندما تصبح Modules الفعلية موجودة.

---

# Semgrep Foundation

أضفت أول Organization Rules، منها مثلًا منع:

```ts
user.role === "admin"
```

كبديل عن Authorization Layer.

ومنع Raw Settings access.

ومنع Raw Hex colors خارج Design System.

لكن هذه نقطة مهمة:

**Semgrep نفسها غير مثبتة في Runtime الحالي، لذلك لم أضع هذه الـGates كـimplemented بعد.**

القواعد موجودة، لكن Enforcement سيصبح Active عندما نبني CI image/Dependencies الخاصة بالموجة المناسبة.

وهذا مقصود حتى لا ندعي حماية غير موجودة.

---

# GitHub Governance Skeleton

أنشأت:

```text
.github/workflows/governance.yml
```

مع Status نهائي:

```text
governance-summary
```

ليصبح لاحقًا Required Status Check.

وأضفت أيضًا:

```text
.github/CODEOWNERS.template
```

للمسارات الحساسة مثل:

```text
.governance/
tooling/
architecture/
design-system/
auth/
authorization/
settings/
```

لكن لم أضع أسماء Teams وهمية كإعداد فعلي؛ يجب إدخال أسماء المؤسسة الحقيقية عند إنشاء GitHub Organization.

---

# اختبارات فعلية

نفذت الآن:

## 12 Test

والنتيجة:

```text
Ran 12 tests
OK
```

اختبرنا عمدًا:

| المحاولة                          | النتيجة                |
| --------------------------------- | ---------------------- |
| تعديل صحيح داخل Scope             | ✅ PASS                 |
| `task prepare` وتوليد Context     | ✅ PASS                 |
| تعديل خارج Scope                  | 🚫 BLOCKED             |
| إنشاء ملف جديد دون سماح           | 🚫 BLOCKED             |
| تغيير Dependency دون سماح         | 🚫 BLOCKED             |
| تعديل Design System بـRisk منخفض  | 🚫 BLOCKED / escalated |
| تزوير/اختلاف Base SHA             | 🚫 BLOCKED             |
| Task تدعي Gate مستقبلية غير منفذة | 🚫 BLOCKED             |
| Task Contract غير صالح            | 🚫 BLOCKED             |
| Module Manifest غير صالح          | 🚫 BLOCKED             |
| Module يستهلك Setting غير موجودة  | 🚫 BLOCKED             |
| Generator يولد Module             | ✅ Valid Manifest       |

وهذا أول إثبات حقيقي أن الفكرة ليست Documentation فقط.

---

## تقرير الإثبات

[Wave 0–1 Verification Report](sandbox:/mnt/data/ENGINEERING_PLATFORM/docs/06-quality/WAVE_0_1_VERIFICATION_REPORT.md)

ووثقت التنفيذ الحالي هنا:

[Wave 0–1 Implementation](sandbox:/mnt/data/ENGINEERING_PLATFORM/docs/04-governance/agent-system/WAVE_0_1_IMPLEMENTATION.md)

وحدثت:

[Governance Roadmap](sandbox:/mnt/data/ENGINEERING_PLATFORM/docs/04-governance/agent-system/GOVERNANCE_IMPLEMENTATION_ROADMAP.md)

---

## النسخة الجديدة كاملة

[تحميل ENGINEERING_PLATFORM_GOVERNANCE_WAVE01_V5.zip](sandbox:/mnt/data/ENGINEERING_PLATFORM_GOVERNANCE_WAVE01_V5.zip)

### ما أعتبره مهمًا جدًا الآن

**Wave 0 مكتملة فعليًا.**

**Wave 1 لديها Bootstrap فعلي صالح ومختبر، لكنني لم أضع Nx/Semgrep checks على أنها مكتملة قبل أن تعمل داخل CI الحقيقي.**

وهذا الأسلوب نفسه سنستمر عليه:

> لا نضع علامة ✅ على أي حماية لأنها موجودة في ملف MD؛ نضع ✅ فقط بعد أن نحاول كسرها وتمنعنا بالفعل.

المرحلة التالية هي **Wave 2 — UI/Application Foundation Enforcement**، وهي حساسة جدًا لأنها ستعالج مباشرة أكثر ما كلفنا في Harbuk: الثيم والمكونات المركزية، منع الـRaw CSS/colors، React Aria wrappers، Design Tokens، Storybook كـsource of truth، Mobile First، RTL/LTR، accessibility، Visual Regression، App Shell والصفحات المرجعية.

[1]: https://nx.dev/changelog "https://nx.dev/changelog"
[2]: https://nx.dev/docs/technologies/node/introduction "https://nx.dev/docs/technologies/node/introduction"
[3]: https://www.npmjs.com/package/pnpm "https://www.npmjs.com/package/pnpm"
انتقلت فعليًا إلى **Wave 2 — UI/Application Foundation Enforcement** وبدأت تنفيذها، لا مجرد توثيقها. وحتى هذه المرحلة بدأت بالفعل تكشف لنا مشاكل تصميم مبكرًا، وهو بالضبط ما نريده قبل بناء TAYMEX.

ما تم إنجازه حتى الآن:

* أنشأت **DTCG Design Tokens** مركزية فعلية للألوان الدلالية، المسافات، الخطوط وأحجامها، الأوزان، Radius، أحجام الـtouch targets، sidebar/header والحركة.
* أنشأت Token Compiler يولّد CSS variables من المصدر المركزي، ويتحقق من aliases الدائرية/المفقودة، وأضفت فحص Contrast أساسي. الاختبار الحالي يمر: **48 Core Token + 18 Semantic Token** مع نجاح فحوص التباين.
* بدأت الحزم الفعلية: `@engineering-platform/ui` و`@engineering-platform/ui-patterns` و`@engineering-platform/app-shell`.
* أضفت أول المكونات المشتركة: `Button`, `TextField`, `Card`, `IconButton`.
* أضفت Patterns أولية مثل `CrudPage` و`PageState`، والأخير يعرف الحالات التي ناقشناها: `loading / empty / partial / error / success / offline / permission-denied / rate-limited`.
* أنشأت `AppShell` كبداية للبنية المشتركة للـSidebar/Header/Main/Mobile navigation.
* كل Shared UI Component أصبح له **Machine-readable Component Manifest** يحدد الـcanonical role، الـpackage، الـexport، الحالة وStorybook stories.
* المنصة تمنع الآن **تكرار canonical UI role**؛ أي لا يمكن وجود مكونين مشتركين يدعيان أنهما `action.button` مثلًا دون اكتشاف التعارض.
* أضفت Storybook Stories للمكونات الحالية، مع بقاء تشغيل Storybook الفعلي نفسه غير مكتمل بعد.

الأهم أنني فعّلت أول حارسين حقيقيين:

**UI-001** يمنع تجاوز المكونات المركزية، و**UI-002** يمنع الانحراف البصري. مثلًا جربت عمدًا كودًا يحتوي:

```tsx
import { Button } from 'react-aria-components';

<button
  style={{
    color: '#ff0000',
    marginLeft: 12
  }}
>
```

والمنصة رفضته بخمس مخالفات مستقلة: Native primitive، direct third-party UI import، raw color، inline style، وphysical `left/right` styling.

أضفت كذلك منعًا مباشرًا لاستيراد `React Aria`, `Base UI`, `Radix`, `Lucide`, `Panda/styled-system` من Feature code. هذه الأدوات لا يمكن استخدامها إلا داخل الطبقة المشتركة المعتمدة.

كما بدأنا منع مشكلة:

> Agent ينشئ `Card.tsx` أو `Button.tsx` محليًا رغم وجود المكون المركزي.

وأصبح إنشاء Shared primitive جديد يمر عبر Generator، ويولّد معه الـManifest والـStory بدل إنشاء ملفات عشوائية.

وأضفت Generator آخر لـ **Admin CRUD Page**. جربته فعليًا، وهو يولد الصفحة باستخدام:

```tsx
@engineering-platform/ui
@engineering-platform/ui-patterns
```

ثم مررتها على UI Governance ونجحت دون مخالفات. الفكرة أن الوكيل مستقبلًا لن يبدأ صفحة CRUD من صفحة بيضاء.

### وبدأت الاختبارات البصرية الفعلية أيضًا

أنشأت Reference Application Shell واستخدمت Chromium + Playwright فعليًا لاختبارها على:

`320 / 390 / 430 / 768 / 1024 / 1440`

وباللغات:

`English LTR / Arabic RTL / Turkish LTR`

وبـLight/Dark للحالات الممثلة.

الاختبار الأول كشف بالفعل مشكلة حقيقية عند **768px**: Horizontal overflow بحوالي 168px.

وهذه نقطة ممتازة؛ بدل أن نكتشفها نحن بعد إنشاء عشرات الصفحات، اكتشفها الـSafety Net فورًا. عدلت Responsive Shell ليصبح الـSidebar تلقائيًا Compact على Tablet، ثم أعدت الاختبارات.

النتيجة أصبحت:

**18/18 سيناريو Visual/Responsive/RTL/LTR ناجحًا.**

والتشغيل الثاني مقابل الـBaseline نجح أيضًا، أي أن لدينا بداية **Visual Regression حقيقية**.

كما يفحص الـHarness حاليًا تلقائيًا:

* horizontal overflow
* RTL/LTR
* mobile navigation
* desktop/sidebar behavior
* touch-target sizes
* duplicate IDs
* form labels
* button accessible names
* image alt
* main landmark
* H1
* theme switching
* desktop sidebar collapse
* mobile drawer behavior
* screenshot regression

وبدأت أيضًا بتحديث Agent Context بحيث يحتوي تلقائيًا على **المكونات المشتركة الموجودة فعلًا + canonical roles + semantic design tokens**. أي عند بدء UI Task لن يحتاج الوكيل إلى تخمين:

> هل لدينا Card؟ ما اسم Button؟ ما Token اللون؟

ستدخل هذه المعلومات تلقائيًا في `REPOSITORY_TRUTH`.

كذلك صححت مسألة مهمة للمشاريع المستقبلية: المشروع المستهلك لا يملك حق تعريف Component له نفس `canonicalRole` الموجود في المنصة. أي Project آخر لا يستطيع إنشاء Card جديدة تدعي أنها الـCard العامة بينما المنصة لديها واحدة.

### الاختبارات البرمجية

Wave 2 نفسها لديها الآن **8 اختبارات Governance جديدة ناجحة**، بالإضافة إلى أن **8 اختبارات Wave 1** ما زالت تنجح عند تشغيلها منفصلة.

كما أن الاختبارات البصرية الـ18 ناجحة.

هناك أشياء **لم أكملها بعد ولا أريد الادعاء بأنها مكتملة**:

* تشغيل Storybook 10.5 فعليًا مع React/Panda لم يتم بعد؛ الـStories والـManifests موجودة.
* لم أفعل `axe-core` بعد. بحثت عنه الآن، والإصدار الحالي **4.13.0** ويدعم WCAG 2.0/2.1/2.2؛ الـHarness الحالي يطبق Accessibility smoke checks خاصة بنا، لكن هذا ليس بديلًا كاملًا لـaxe. ([npmjs.com][1])
* Panda نفسه ثبتنا تصميمه ومصدره، ووجدت أن الخط المستقر الحالي **1.12.0** بينما v2 ما زال Beta، لذلك الصحيح حاليًا أن نستمر على 1.12 المستقر لا Beta. ([GitHub][2])
* React Aria Components الحالي **1.20.0**. ([npmjs.com][3])
* Playwright الحالي **1.62.1**، بينما Harness المحلي المتاح في بيئة العمل أقدم قليلًا؛ لهذا لن أعتبر إعداد CI النهائي منتهيًا حتى نثبته على النسخة المقفلة نفسها. ([npmjs.com][4])
* لم أربط بعد UI-003/004/005/006 كـGlobal Blocking Gates لكل Consumer project؛ الاختبارات تعمل حاليًا على الـGolden Reference. **لن أغير حالتها إلى implemented قبل أن يستطيع `task verify` تشغيلها على التطبيق المتأثر نفسه.**

وهذا بالضبط النهج الذي اتفقنا عليه: لن نضع ✅ على شيء لم يصبح قادرًا فعلًا على منع الخطأ.

الخطوة التالية داخل **نفس Wave 2** هي إكمال Storybook/Panda runtime wiring، دمج `axe-core 4.13`، تحويل الـResponsive/RTL/Visual harness إلى Gates مرتبطة بالـaffected pages، ثم إنهاء AppShell contract والـGolden CRUD/Settings/Form/Search patterns قبل أن نعتبر Wave 2 مغلقة وننتقل إلى Repository Truth/Backend contracts.

[1]: https://www.npmjs.com/package/axe-core?utm_source=chatgpt.com "axe-core - npm"
[2]: https://github.com/chakra-ui/panda/blob/main/packages/cli/CHANGELOG.md "https://github.com/chakra-ui/panda/blob/main/packages/cli/CHANGELOG.md"
[3]: https://www.npmjs.com/package/react-aria-components "https://www.npmjs.com/package/react-aria-components"
[4]: https://www.npmjs.com/package/%40playwright/test?activeTab=versions "https://www.npmjs.com/package/%40playwright/test?activeTab=versions"
-----------------------





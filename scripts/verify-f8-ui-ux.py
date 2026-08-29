#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, re, subprocess, sys, tarfile, tempfile
from pathlib import Path
import yaml

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def ok(name,condition,detail=''):
    if not condition:
        raise AssertionError(f'{name}: {detail or "failed"}')
    checks.append(name)
def read(path): return (ROOT/path).read_text(encoding='utf-8')
def y(path): return yaml.safe_load(read(path))

def capability(manifest, cid):
    for item in manifest.get('capabilities',[]):
        if item.get('id')==cid: return item
    raise AssertionError(f'missing capability {cid}')

manifest=y('blueprints/foundation/foundation.manifest.yaml')
ok('stage-f8',manifest['foundation']['currentStage']=='F8')
expected={
 'localization.i18n-bidi-formatting':'IMPLEMENTED',
 'ui.design-tokens-theme-typography':'IMPLEMENTED',
 'ui.shell-navigation':'IMPLEMENTED',
 'ui.components-patterns-states':'IMPLEMENTED',
 'ui.responsive-rtl-accessibility-visual':'IMPLEMENTED',
}
for cid,maturity in expected.items(): ok(f'maturity-{cid}',capability(manifest,cid)['currentMaturity']==maturity)

runtime=y('.platform/runtime.lock.yaml')
ui_versions={i['name']:i for i in runtime['artifacts'] if i['name'] in {
 '@engineering-platform/design-tokens','@engineering-platform/ui','@engineering-platform/app-shell','@engineering-platform/ui-patterns'}}
ok('four-ui-artifacts',len(ui_versions)==4)
for name,item in ui_versions.items():
    ok(f'{name}-version',item['version']=='0.2.0')
    p=ROOT/item['file']; ok(f'{name}-exists',p.is_file()); ok(f'{name}-sha',hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256']); ok(f'{name}-size',p.stat().st_size==item['size'])
    with tarfile.open(p,'r:gz') as tf:
        pkg=json.load(tf.extractfile('package/package.json'))
        ok(f'{name}-package-version',pkg['version']=='0.2.0')
        if name!='@engineering-platform/design-tokens': ok(f'{name}-catalog','package/component-catalog.json' in tf.getnames())
ok('no-copied-platform-catalog',not (ROOT/'.platform/catalog').exists())

gov=y('.platform/governance.lock.yaml')['artifact']; gp=ROOT/gov['file']
ok('governance-015',gov['version']=='0.1.5' and gp.is_file() and hashlib.sha256(gp.read_bytes()).hexdigest()==gov['sha256'])

pkg=json.loads(read('apps/web/package.json'))
for name in ('design-tokens','ui','app-shell','ui-patterns'):
    value=pkg['dependencies'][f'@engineering-platform/{name}']
    ok(f'web-{name}-artifact',f'engineering-platform-{name}-0.2.0.tgz' in value and 'workspace:' not in value and 'link:' not in value)

profile=y('blueprints/theme-profiles/taymex.yaml')
ok('theme-id',profile['id']=='taymex')
for mode in ('common','light','dark'): ok(f'theme-{mode}',bool(profile['overrides'].get(mode)))
css=read('apps/web/app/taymex-theme.generated.css')
ok('theme-css-generated','Generated governed theme: taymex' in css and '[data-project-theme="taymex"]' in css)

layout=read('apps/web/app/layout.tsx'); proxy=read('apps/web/proxy.ts')
ok('root-locale-from-request',"x-taymex-locale" in layout and 'headers()' in layout and 'isTaymexLocale' in layout)
ok('root-not-hardcoded-ar','lang="ar"' not in layout and 'dir="rtl"' not in layout)
ok('root-theme-contract','data-project-theme="taymex"' in layout and 'data-theme="light"' in layout)
ok('proxy-generated-locale-truth','TAYMEX_LOCALES' in proxy and 'DEFAULT_LOCALE' in proxy and "x-taymex-locale" in proxy)

local_css=read('apps/web/app/taymex.css')
ok('local-css-no-raw-color',not re.search(r'#[0-9A-Fa-f]{3,8}\b|\brgba?\(|\bhsla?\(',local_css))
ok('local-css-no-token-fallback',not re.search(r'var\([^)]*,',local_css))

surface=read('apps/web/src/components/f8-reference-surface.tsx')
for token in ('TextField','PasswordField','SelectField','RadioGroupField','CheckboxField','SwitchField','FileUploadField','DataTable','Pagination','Tabs','ModalDialog','Toast','Skeleton'):
    ok(f'reference-{token}',token in surface)
for tag in ('input','select','textarea','button','table'):
    ok(f'no-native-{tag}',not re.search(rf'<{tag}(?:\s|>)',surface))
ok('theme-toggle-document-contract','document.documentElement.dataset.theme' in surface)

nav=y('blueprints/experience/navigation.manifest.yaml')
ok('shell-ia',set(nav['shells'])=={'public','customer','admin'})
ok('admin-reference-route','/{locale}/foundation/ui' in nav['shells']['admin']['currentRoutes'])

ui=y('apps/web/ui.verification.yaml')
ok('ui-manifest-id',ui['id']=='taymex.f8-ui-foundation')
ok('ui-locales',{x['id'] for x in ui['scenarios']['locales']}=={'ar','tr','en'})
ok('ui-directions',{(x['id'],x['dir']) for x in ui['scenarios']['locales']}=={('ar','rtl'),('tr','ltr'),('en','ltr')})
ok('ui-themes',set(ui['scenarios']['themes'])=={'light','dark'})
widths={x['width'] for x in ui['scenarios']['viewports']}; ok('ui-responsive-widths',min(widths)<=390 and 768 in widths and max(widths)>=1440)
for key in ('responsive','direction','accessibilitySmoke','visual'): ok(f'ui-check-{key}',ui['checks'][key] is True)
ok('touch-target',ui['checks']['minTouchTarget']>=44)

messages=read('apps/web/src/i18n/ui-reference-messages.ts')
for locale in ('ar: {','tr: {','en: {'): ok(f'messages-{locale[:2]}',locale in messages)
formatting=read('apps/web/src/i18n/formatting.ts')
for feature in ("style:'currency'","style:'unit'",'DateTimeFormat','NumberFormat'): ok(f'format-{feature}',feature in formatting)
ok('mixed-script-proof','data-f8-mixed' in surface and 'dir="auto"' in surface)

# Compare generated theme output against a fresh build so hand edits fail closed.
with tempfile.TemporaryDirectory() as td:
    out=Path(td)/'theme.css'
    cp=subprocess.run([str(ROOT/'scripts/platform'),'theme','build',str(ROOT/'blueprints/theme-profiles/taymex.yaml'),'--out',str(out)],cwd=ROOT,text=True,capture_output=True)
    ok('theme-regeneration',cp.returncode==0,cp.stdout+cp.stderr)
    ok('theme-css-not-hand-edited',out.read_bytes()==(ROOT/'apps/web/app/taymex-theme.generated.css').read_bytes())

print(f'PASS: F8 UI/UX foundation verifier ({len(checks)}/{len(checks)})')

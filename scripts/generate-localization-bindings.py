#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys
import yaml

ROOT = Path(__file__).resolve().parents[1]
PROFILE = ROOT / 'blueprints/project-profiles/taymex.yaml'
OUTPUTS = [
    ROOT / 'apps/api/src/generated/locales.generated.ts',
    ROOT / 'apps/web/src/i18n/locales.generated.ts',
]


def source_sha256() -> str:
    return hashlib.sha256(PROFILE.read_bytes()).hexdigest()


def render() -> str:
    data = yaml.safe_load(PROFILE.read_text(encoding='utf-8')) or {}
    localization = data.get('localization') or {}
    enabled = localization.get('enabledLocales') or []
    default = localization.get('defaultLocale')
    rtl = localization.get('rtlLocales') or []
    if not enabled or default not in enabled or any(locale not in enabled for locale in rtl):
        raise ValueError('Project localization profile is inconsistent.')
    js_enabled = ', '.join(json.dumps(v, ensure_ascii=False) for v in enabled)
    js_rtl = ', '.join(json.dumps(v, ensure_ascii=False) for v in rtl)
    return (
        '// GENERATED FILE — DO NOT EDIT.\n'
        '// Source: blueprints/project-profiles/taymex.yaml\n'
        f'// Source-SHA256: {source_sha256()}\n'
        '// Regenerate: python3 scripts/generate-localization-bindings.py\n\n'
        f'export const TAYMEX_LOCALES = [{js_enabled}] as const;\n'
        'export type TaymexLocale = (typeof TAYMEX_LOCALES)[number];\n'
        f'export const DEFAULT_LOCALE: TaymexLocale = {json.dumps(default)};\n'
        f'export const RTL_LOCALES = [{js_rtl}] as const satisfies readonly TaymexLocale[];\n'
    )


def main() -> int:
    parser = argparse.ArgumentParser(description='Generate locale bindings from the canonical TAYMEX project profile.')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    expected = render()
    stale = []
    for output in OUTPUTS:
        if args.check:
            if not output.exists() or output.read_text(encoding='utf-8') != expected:
                stale.append(output.relative_to(ROOT).as_posix())
        else:
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(expected, encoding='utf-8')
            print(f'WROTE: {output.relative_to(ROOT)}')
    if stale:
        print('STALE: generated localization bindings differ from canonical project profile:', file=sys.stderr)
        for item in stale:
            print(f'- {item}', file=sys.stderr)
        print('Run: python3 scripts/generate-localization-bindings.py', file=sys.stderr)
        return 2
    if args.check:
        print('PASS: generated localization bindings match canonical project profile.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

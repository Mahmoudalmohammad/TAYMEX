#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys
import yaml

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / 'tooling/registry/settings.registry.yaml'
OUTPUT = ROOT / 'apps/api/src/generated/settings.generated.ts'


def ts_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def ts_value(value) -> str:
    if value is None:
        return 'null'
    if value is True:
        return 'true'
    if value is False:
        return 'false'
    if isinstance(value, (int, float)):
        return repr(value)
    if isinstance(value, str):
        return ts_string(value)
    if isinstance(value, list):
        return '[' + ', '.join(ts_value(v) for v in value) + ']'
    if isinstance(value, dict):
        items = ', '.join(f'{ts_string(str(k))}: {ts_value(v)}' for k, v in value.items())
        return '{ ' + items + ' }'
    raise TypeError(f'Unsupported setting value type: {type(value).__name__}')


def ts_type(setting: dict) -> str:
    value_type = setting['valueType']
    if value_type == 'integer' or value_type == 'number':
        return 'number'
    if value_type == 'boolean':
        return 'boolean'
    if value_type in {'string', 'duration'}:
        return 'string'
    if value_type == 'enum':
        values = setting.get('enumValues') or []
        if not values:
            return 'string'
        return ' | '.join(ts_value(v) for v in values)
    if value_type == 'array':
        return 'readonly unknown[]'
    if value_type in {'object', 'money'}:
        return 'Readonly<Record<string, unknown>>'
    raise ValueError(f'Unsupported valueType {value_type!r} for {setting["key"]}')


def const_name(key: str) -> str:
    parts = []
    token = ''
    for ch in key:
        if ch.isalnum():
            token += ch
        elif token:
            parts.append(token)
            token = ''
    if token:
        parts.append(token)
    if not parts:
        raise ValueError(f'Cannot derive identifier from setting key {key!r}')
    first, *rest = parts
    return first.lower() + ''.join(p[:1].upper() + p[1:] for p in rest) + 'Setting'


def render_setting(setting: dict) -> str:
    key = setting['key']
    fields = [
        f'  key: {ts_string(key)},',
        f'  valueType: {ts_string(setting["valueType"])},',
        f'  resolution: {ts_string(setting["resolution"])},',
        '  scopes: [' + ', '.join(ts_string(v) for v in setting['scopes']) + '] as const,',
    ]
    if setting.get('precedence') is not None:
        fields.append('  precedence: [' + ', '.join(ts_string(v) for v in setting['precedence']) + '] as const,')
    fields.append(f'  default: {ts_value(setting.get("default"))},')
    if setting.get('minimum') is not None:
        fields.append(f'  minimum: {ts_value(setting["minimum"])},')
    if setting.get('maximum') is not None:
        fields.append(f'  maximum: {ts_value(setting["maximum"])},')
    if setting.get('enumValues') is not None:
        fields.append('  enumValues: [' + ', '.join(ts_value(v) for v in setting['enumValues']) + '] as const,')
    fields.append(f'  sensitive: {str(bool(setting.get("sensitive", False))).lower()},')
    body = '\n'.join(fields)
    return (
        f'export const {const_name(key)} = {{\n{body}\n}} as const '
        f'satisfies SettingDefinition<{ts_type(setting)}>;\n'
    )


def source_sha256() -> str:
    return hashlib.sha256((ROOT / 'tooling/registry/settings.registry.yaml').read_bytes()).hexdigest()

def render() -> str:
    doc = yaml.safe_load(REGISTRY.read_text(encoding='utf-8'))
    if not isinstance(doc, dict) or not isinstance(doc.get('settings'), list):
        raise ValueError('Settings registry is malformed.')

    settings = sorted(doc['settings'], key=lambda item: item['key'])
    seen = set()
    chunks = []
    for item in settings:
        key = item['key']
        if key in seen:
            raise ValueError(f'Duplicate setting key in canonical registry: {key}')
        seen.add(key)
        chunks.append(render_setting(item))

    exports = ',\n'.join(f'  {ts_string(item["key"])}: {const_name(item["key"])}' for item in settings)
    return (
        '// GENERATED FILE — DO NOT EDIT.\n'
        '// Source: tooling/registry/settings.registry.yaml\n'
        + f'// Source-SHA256: {source_sha256()}\n'
        '// Regenerate: python3 scripts/generate-settings-bindings.py\n\n'
        "import type { SettingDefinition } from '@engineering-platform/settings';\n\n"
        + '\n'.join(chunks)
        + '\nexport const settingDefinitions = {\n'
        + exports
        + '\n} as const;\n\n'
        + 'export type GeneratedSettingKey = keyof typeof settingDefinitions;\n'
    )


def main() -> int:
    parser = argparse.ArgumentParser(description='Generate typed API setting bindings from the canonical registry.')
    parser.add_argument('--check', action='store_true', help='Fail when generated output is missing or stale.')
    args = parser.parse_args()

    expected = render()
    if args.check:
        if not OUTPUT.exists():
            print(f'STALE: missing generated settings binding: {OUTPUT.relative_to(ROOT)}', file=sys.stderr)
            return 2
        actual = OUTPUT.read_text(encoding='utf-8')
        if actual != expected:
            print('STALE: generated settings binding differs from canonical registry.', file=sys.stderr)
            print('Run: python3 scripts/generate-settings-bindings.py', file=sys.stderr)
            return 2
        print('PASS: generated settings binding matches canonical registry.')
        return 0

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(expected, encoding='utf-8')
    print(f'WROTE: {OUTPUT.relative_to(ROOT)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys
import yaml

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / 'tooling/registry/permissions.registry.yaml'
OUTPUT = ROOT / 'apps/api/src/generated/permissions.generated.ts'


def ts_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def const_name(key: str) -> str:
    parts = [p for p in re.split(r'[^A-Za-z0-9]+', key) if p]
    if not parts:
        raise ValueError(f'Cannot derive identifier from permission key {key!r}')
    first, *rest = parts
    return first.lower() + ''.join(p[:1].upper() + p[1:] for p in rest) + 'Permission'


def render() -> str:
    doc = yaml.safe_load(REGISTRY.read_text(encoding='utf-8'))
    permissions = doc.get('permissions') if isinstance(doc, dict) else None
    if not isinstance(permissions, list):
        raise ValueError('Permission registry is malformed.')
    items = sorted(permissions, key=lambda item: item['key'])
    seen = set()
    lines = [
        '// GENERATED FILE — DO NOT EDIT.',
        '// Source: tooling/registry/permissions.registry.yaml',
        '// Regenerate: python3 scripts/generate-permission-bindings.py',
        '',
    ]
    for item in items:
        key = item['key']
        if key in seen:
            raise ValueError(f'Duplicate permission key in canonical registry: {key}')
        seen.add(key)
        lines.append(f'export const {const_name(key)} = {ts_string(key)} as const;')
    lines.extend(['', 'export const permissionKeys = {'])
    for item in items:
        lines.append(f'  {ts_string(item["key"])}: {const_name(item["key"])},')
    lines.extend([
        '} as const;',
        '',
        'export type GeneratedPermissionKey = keyof typeof permissionKeys;',
        '',
    ])
    return '\n'.join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description='Generate typed permission bindings from the canonical registry.')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    expected = render()
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding='utf-8') != expected:
            print('STALE: generated permission binding differs from canonical registry.', file=sys.stderr)
            print('Run: python3 scripts/generate-permission-bindings.py', file=sys.stderr)
            return 2
        print('PASS: generated permission binding matches canonical registry.')
        return 0
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(expected, encoding='utf-8')
    print(f'WROTE: {OUTPUT.relative_to(ROOT)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

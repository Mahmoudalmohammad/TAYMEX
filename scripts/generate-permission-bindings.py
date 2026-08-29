#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import yaml

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / 'tooling/registry/permissions.registry.yaml'
OUTPUT = ROOT / 'apps/api/src/generated/permissions.generated.ts'
IDENTITY_OUTPUT = ROOT / 'packages/identity/src/generated/permissions.generated.ts'
SETTINGS_OUTPUT = ROOT / 'packages/settings-runtime/src/generated/permissions.generated.ts'
AUDIT_OUTPUT = ROOT / 'packages/audit/src/generated/permissions.generated.ts'


def ts_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def const_name(key: str) -> str:
    parts = [p for p in re.split(r'[^A-Za-z0-9]+', key) if p]
    if not parts:
        raise ValueError(f'Cannot derive identifier from permission key {key!r}')
    first, *rest = parts
    return first.lower() + ''.join(p[:1].upper() + p[1:] for p in rest) + 'Permission'


def source_sha256() -> str:
    return hashlib.sha256((ROOT / 'tooling/registry/permissions.registry.yaml').read_bytes()).hexdigest()

def render_items(items: list[dict], type_name: str, map_name: str) -> str:
    seen = set()
    lines = [
        '// GENERATED FILE — DO NOT EDIT.',
        '// Source: tooling/registry/permissions.registry.yaml',
        f'// Source-SHA256: {source_sha256()}',
        '// Regenerate: python3 scripts/generate-permission-bindings.py',
        '',
    ]
    for item in items:
        key = item['key']
        if key in seen:
            raise ValueError(f'Duplicate permission key in canonical registry: {key}')
        seen.add(key)
        lines.append(f'export const {const_name(key)} = {ts_string(key)} as const;')
    lines.extend(['', f'export const {map_name} = {{'])
    for item in items:
        lines.append(f'  {ts_string(item["key"])}: {const_name(item["key"])},')
    lines.extend([
        '} as const;',
        '',
        f'export type {type_name} = keyof typeof {map_name};',
        '',
    ])
    return '\n'.join(lines)


def render_outputs() -> dict[Path, str]:
    doc = yaml.safe_load(REGISTRY.read_text(encoding='utf-8'))
    permissions = doc.get('permissions') if isinstance(doc, dict) else None
    if not isinstance(permissions, list):
        raise ValueError('Permission registry is malformed.')
    items = sorted(permissions, key=lambda item: item['key'])
    identity_items = [item for item in items if item.get('owner') == 'identity']
    settings_items = [item for item in items if item.get('owner') == 'settings-runtime']
    audit_items = [item for item in items if item.get('owner') == 'audit']
    return {
        OUTPUT: render_items(items, 'GeneratedPermissionKey', 'permissionKeys'),
        IDENTITY_OUTPUT: render_items(identity_items, 'GeneratedIdentityPermissionKey', 'identityPermissionKeys'),
        SETTINGS_OUTPUT: render_items(settings_items, 'GeneratedSettingsPermissionKey', 'settingsPermissionKeys'),
        AUDIT_OUTPUT: render_items(audit_items, 'GeneratedAuditPermissionKey', 'auditPermissionKeys'),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description='Generate typed permission bindings from the canonical registry.')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    outputs = render_outputs()
    stale = []
    for output, expected in outputs.items():
        if args.check:
            if not output.exists() or output.read_text(encoding='utf-8') != expected:
                stale.append(output.relative_to(ROOT).as_posix())
        else:
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(expected, encoding='utf-8')
            print(f'WROTE: {output.relative_to(ROOT)}')
    if stale:
        print('STALE: generated permission bindings differ from canonical registry:', file=sys.stderr)
        for item in stale:
            print(f'- {item}', file=sys.stderr)
        print('Run: python3 scripts/generate-permission-bindings.py', file=sys.stderr)
        return 2
    if args.check:
        print('PASS: generated permission bindings match canonical registry.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

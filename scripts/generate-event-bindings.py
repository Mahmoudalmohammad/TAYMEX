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
REGISTRY = ROOT / 'tooling/registry/events.registry.yaml'
OUTPUT = ROOT / 'packages/identity/src/generated/events.generated.ts'
OWNER = 'identity'


def ts_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def const_name(event_id: str) -> str:
    parts = [p for p in re.split(r'[^A-Za-z0-9]+', event_id) if p]
    if not parts:
        raise ValueError(f'Cannot derive identifier from event id {event_id!r}')
    first, *rest = parts
    return first.lower() + ''.join(p[:1].upper() + p[1:] for p in rest) + 'Event'


def source_sha256() -> str:
    return hashlib.sha256(REGISTRY.read_bytes()).hexdigest()


def render() -> str:
    doc = yaml.safe_load(REGISTRY.read_text(encoding='utf-8'))
    events = doc.get('events') if isinstance(doc, dict) else None
    if not isinstance(events, list):
        raise ValueError('Event registry is malformed.')
    items = sorted((item for item in events if item.get('owner') == OWNER), key=lambda item: item['id'])
    if not items:
        raise ValueError(f'No events owned by {OWNER!r} exist in the canonical registry.')
    seen = set()
    lines = [
        '// GENERATED FILE — DO NOT EDIT.',
        '// Source: tooling/registry/events.registry.yaml',
        f'// Source-SHA256: {source_sha256()}',
        '// Regenerate: python3 scripts/generate-event-bindings.py',
        '',
    ]
    for item in items:
        event_id = item['id']
        if event_id in seen:
            raise ValueError(f'Duplicate event id in canonical registry: {event_id}')
        seen.add(event_id)
        lines.append(f'export const {const_name(event_id)} = {ts_string(event_id)} as const;')
    lines.extend(['', 'export const identityEventIds = {'])
    for item in items:
        lines.append(f'  {ts_string(item["id"])}: {const_name(item["id"])},')
    lines.extend([
        '} as const;',
        '',
        'export type GeneratedIdentityEventId = keyof typeof identityEventIds;',
        '',
    ])
    return '\n'.join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description='Generate typed identity event bindings from the canonical event registry.')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    expected = render()
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding='utf-8') != expected:
            print('STALE: generated identity event binding differs from canonical registry.', file=sys.stderr)
            print('Run: python3 scripts/generate-event-bindings.py', file=sys.stderr)
            return 2
        print('PASS: generated identity event binding matches canonical registry.')
        return 0
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(expected, encoding='utf-8')
    print(f'WROTE: {OUTPUT.relative_to(ROOT)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

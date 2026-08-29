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
OUTPUTS = {
    'identity': (ROOT / 'packages/identity/src/generated/events.generated.ts', 'identityEventIds', None, 'GeneratedIdentityEventId'),
    'notifications': (ROOT / 'packages/notifications/src/generated/events.generated.ts', 'notificationEventIds', 'notificationEventDescriptors', 'GeneratedNotificationEventId'),
}


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


def registry_events() -> list[dict]:
    doc = yaml.safe_load(REGISTRY.read_text(encoding='utf-8'))
    events = doc.get('events') if isinstance(doc, dict) else None
    if not isinstance(events, list):
        raise ValueError('Event registry is malformed.')
    seen: set[str] = set()
    for item in events:
        event_id = item.get('id')
        if not isinstance(event_id, str):
            raise ValueError('Event registry contains an event without an id.')
        if event_id in seen:
            raise ValueError(f'Duplicate event id in canonical registry: {event_id}')
        seen.add(event_id)
    return events


def render(owner: str, ids_name: str, descriptors_name: str, type_name: str, events: list[dict]) -> str:
    items = sorted((item for item in events if item.get('owner') == owner), key=lambda item: item['id'])
    if not items:
        raise ValueError(f'No events owned by {owner!r} exist in the canonical registry.')
    lines = [
        '// GENERATED FILE — DO NOT EDIT.',
        '// Source: tooling/registry/events.registry.yaml',
        f'// Source-SHA256: {source_sha256()}',
        '// Regenerate: python3 scripts/generate-event-bindings.py',
        '',
    ]
    for item in items:
        lines.append(f'export const {const_name(item["id"])} = {ts_string(item["id"])} as const;')
    lines.extend(['', f'export const {ids_name} = {{'])
    for item in items:
        lines.append(f'  {ts_string(item["id"])}: {const_name(item["id"])},')
    lines.extend(['} as const;', ''])
    if descriptors_name is not None:
        lines.append(f'export const {descriptors_name} = {{')
        for item in items:
            descriptor = {k: item[k] for k in ('id', 'owner', 'version', 'delivery', 'classification', 'lifecycle')}
            if 'idempotencyKey' in item:
                descriptor['idempotencyKey'] = item['idempotencyKey']
            if 'schemaRef' in item:
                descriptor['schemaRef'] = item['schemaRef']
            lines.append(f'  {ts_string(item["id"])}: Object.freeze({json.dumps(descriptor, ensure_ascii=False)}),')
        lines.extend(['} as const;', ''])
    lines.extend([f'export type {type_name} = keyof typeof {ids_name};', ''])
    return '\n'.join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description='Generate typed owner event bindings from the canonical event registry.')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    events = registry_events()
    stale: list[Path] = []
    rendered: list[tuple[Path, str]] = []
    for owner, (output, ids_name, descriptors_name, type_name) in OUTPUTS.items():
        expected = render(owner, ids_name, descriptors_name, type_name, events)
        rendered.append((output, expected))
        if not output.exists() or output.read_text(encoding='utf-8') != expected:
            stale.append(output)
    if args.check:
        if stale:
            for output in stale:
                print(f'STALE: {output.relative_to(ROOT)} differs from canonical event registry.', file=sys.stderr)
            print('Run: python3 scripts/generate-event-bindings.py', file=sys.stderr)
            return 2
        print('PASS: generated event bindings match canonical registry.')
        return 0
    for output, expected in rendered:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(expected, encoding='utf-8')
        print(f'WROTE: {output.relative_to(ROOT)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

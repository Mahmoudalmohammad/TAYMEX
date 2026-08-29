#!/usr/bin/env python3
from __future__ import annotations
import argparse, copy, hashlib, json, re
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'contracts/openapi/taymex-v1/source.openapi.yaml'
OPENAPI_OUTPUT = ROOT / 'contracts/openapi/taymex-v1/openapi.generated.yaml'
TS_OUTPUT = ROOT / 'apps/api/src/generated/api-contracts.generated.ts'
HTTP = {'get':'GET','post':'POST','put':'PUT','patch':'PATCH','delete':'DELETE','options':'OPTIONS','head':'HEAD'}
STAMP = 'x-engineering-platform-source-sha256'

def q(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)

def ref_name(ref: str) -> str:
    prefix = '#/components/schemas/'
    if not ref.startswith(prefix):
        raise ValueError(f'Unsupported schema ref: {ref}')
    return ref[len(prefix):]

def ts_type(schema: dict) -> str:
    if '$ref' in schema:
        return ref_name(schema['$ref'])
    unions = schema.get('oneOf') or schema.get('anyOf')
    if unions:
        return ' | '.join(dict.fromkeys(ts_type(item) for item in unions))
    enum = schema.get('enum')
    if enum:
        return ' | '.join(q(str(v)) for v in enum)
    kind = schema.get('type')
    if kind == 'string': return 'string'
    if kind in ('integer','number'): return 'number'
    if kind == 'boolean': return 'boolean'
    if kind == 'array': return f"readonly {ts_type(schema.get('items', {}))}[]"
    if kind == 'object':
        props = schema.get('properties', {})
        required = set(schema.get('required', []))
        if not props:
            return 'Readonly<Record<string, unknown>>'
        fields = []
        for name, prop in props.items():
            optional = '' if name in required else '?'
            fields.append(f"readonly {name}{optional}: {ts_type(prop)};")
        return 'Readonly<{ ' + ' '.join(fields) + ' }>'
    return 'unknown'

def render_operational(source_doc: dict, source_hash: str) -> str:
    doc = copy.deepcopy(source_doc)
    doc[STAMP] = source_hash
    # Stable, generated serialization. The authoring source is the only hand-edited OAS.
    return yaml.safe_dump(doc, sort_keys=False, allow_unicode=True, width=120)

def render_ts(doc: dict, source_hash: str) -> str:
    lines = [
        '// GENERATED FILE — DO NOT EDIT.',
        '// Source: contracts/openapi/taymex-v1/source.openapi.yaml',
        '// Operational: contracts/openapi/taymex-v1/openapi.generated.yaml',
        f'// Source-SHA256: {source_hash}',
        '// Regenerate: python3 scripts/generate-api-contract-bindings.py',
        '',
        "export type ApiAuthenticationMode = 'public' | 'session';",
        "export type ApiDataClassification = 'public' | 'internal' | 'confidential' | 'sensitive' | 'restricted';",
        "export type ApiAssurance = 'AAL1' | 'AAL2';",
        "export type ApiCachePolicy = 'no-store';",
        'export type GeneratedApiOperation = Readonly<{',
        '  operationId: string;', '  method: string;', '  path: string;', '  nestPath: string;',
        '  successStatus: number;', '  auth: ApiAuthenticationMode;', '  permission?: string;',
        '  assurance?: ApiAssurance;', '  classification: ApiDataClassification;', '  cache: ApiCachePolicy;',
        '  requiresJsonBody: boolean;', '}>;', '',
    ]
    schemas = doc.get('components', {}).get('schemas', {})
    for name in sorted(schemas):
        lines.append(f'export type {name} = {ts_type(schemas[name])};')
    lines += ['', 'export const apiOperations = {']
    for path, path_item in doc.get('paths', {}).items():
        for verb, op in path_item.items():
            if verb not in HTTP: continue
            operation_id = op.get('operationId')
            if not operation_id: raise ValueError(f'Missing operationId for {verb} {path}')
            statuses = [int(code) for code in op.get('responses', {}) if str(code).isdigit() and 200 <= int(code) < 300]
            if len(statuses) != 1: raise ValueError(f'Operation {operation_id} needs exactly one 2xx response')
            auth = op.get('x-taymex-auth')
            classification = op.get('x-taymex-data-classification')
            cache = op.get('x-taymex-cache')
            if auth not in ('public','session'): raise ValueError(f'Invalid auth metadata on {operation_id}')
            if classification not in ('public','internal','confidential','sensitive','restricted'):
                raise ValueError(f'Missing/invalid classification on {operation_id}')
            if cache != 'no-store': raise ValueError(f'F5 operation {operation_id} must declare no-store cache policy')
            assurance = op.get('x-taymex-assurance')
            if assurance is not None and assurance not in ('AAL1','AAL2'): raise ValueError(f'Invalid assurance on {operation_id}')
            permission = op.get('x-taymex-permission')
            nest_path = re.sub(r'\{([^}]+)\}', r':\g<1>', path.removeprefix('/api/').removeprefix('/api'))
            fields = [
                f'operationId: {q(operation_id)}', f'method: {q(HTTP[verb])}', f'path: {q(path)}',
                f'nestPath: {q(nest_path)}', f'successStatus: {statuses[0]}', f'auth: {q(auth)}',
                f'classification: {q(classification)}', f'cache: {q(cache)}',
                f'requiresJsonBody: {str(bool(op.get("requestBody"))).lower()}',
            ]
            if permission: fields.append(f'permission: {q(permission)}')
            if assurance: fields.append(f'assurance: {q(assurance)}')
            lines.append(f'  {operation_id}: Object.freeze({{{", ".join(fields)}}}) satisfies GeneratedApiOperation,')
    lines += ['} as const;', '', 'export type GeneratedApiOperationId = keyof typeof apiOperations;', '']
    return '\n'.join(lines)

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    raw = SOURCE.read_bytes()
    source_doc = yaml.safe_load(raw)
    if source_doc.get('openapi') != '3.1.0': raise SystemExit('OpenAPI authoring source must be 3.1.0')
    if STAMP in source_doc: raise SystemExit(f'Authoring source must not contain generated stamp {STAMP}')
    source_hash = hashlib.sha256(raw).hexdigest()
    operational = render_operational(source_doc, source_hash)
    operational_doc = yaml.safe_load(operational)
    ts = render_ts(operational_doc, source_hash)
    if args.check:
        failures=[]
        if not OPENAPI_OUTPUT.exists() or OPENAPI_OUTPUT.read_text()!=operational:
            failures.append('operational OpenAPI')
        if not TS_OUTPUT.exists() or TS_OUTPUT.read_text()!=ts:
            failures.append('TypeScript bindings')
        if failures:
            raise SystemExit('ERROR: stale generated API artifacts: '+', '.join(failures))
        print('PASS: operational OpenAPI and TypeScript bindings match canonical OpenAPI authoring source.')
        return 0
    OPENAPI_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    TS_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OPENAPI_OUTPUT.write_text(operational)
    TS_OUTPUT.write_text(ts)
    print(f'WROTE: {OPENAPI_OUTPUT.relative_to(ROOT)}')
    print(f'WROTE: {TS_OUTPUT.relative_to(ROOT)}')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())

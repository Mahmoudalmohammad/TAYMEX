#!/usr/bin/env python3
from __future__ import annotations
import re, subprocess, sys
from pathlib import Path
import yaml

ROOT=Path(__file__).resolve().parents[1]
PASS=[]
FAIL=[]

def check(name, condition, detail=''):
    (PASS if condition else FAIL).append((name, detail))

def text(path): return (ROOT/path).read_text()

try:
    subprocess.run([sys.executable, str(ROOT/'scripts/generate-api-contract-bindings.py'), '--check'], cwd=ROOT, check=True, capture_output=True, text=True)
    check('Generated OpenAPI bindings are current', True)
except subprocess.CalledProcessError as e:
    check('Generated OpenAPI bindings are current', False, (e.stdout+e.stderr).strip())

source_doc=yaml.safe_load(text('contracts/openapi/taymex-v1/source.openapi.yaml'))
doc=yaml.safe_load(text('contracts/openapi/taymex-v1/openapi.generated.yaml'))
contract_manifest=yaml.safe_load(text('contracts/openapi/taymex-v1/api.contract.yaml'))
check('OpenAPI authoring source is 3.1.0', source_doc.get('openapi')=='3.1.0')
check('Operational OpenAPI is 3.1.0', doc.get('openapi')=='3.1.0')
source_hash=__import__('hashlib').sha256((ROOT/'contracts/openapi/taymex-v1/source.openapi.yaml').read_bytes()).hexdigest()
check('Operational OpenAPI is stamped from authoring source', doc.get('x-engineering-platform-source-sha256')==source_hash)
check('API contract manifest resolves canonical source', contract_manifest.get('id')=='api.openapi.taymex.v1' and contract_manifest.get('owner')=='api-foundation' and contract_manifest.get('source')=='contracts/openapi/taymex-v1/source.openapi.yaml' and contract_manifest.get('openapi')=='contracts/openapi/taymex-v1/openapi.generated.yaml')
ops={}
for path,item in doc.get('paths',{}).items():
    for method,op in item.items():
        if method.lower() not in {'get','post','put','patch','delete','options','head'}: continue
        oid=op.get('operationId'); ops[oid]=(method.upper(),path,op)
        check(f'{oid}: canonical /api path', path.startswith('/api/'))
        check(f'{oid}: auth metadata', op.get('x-taymex-auth') in {'public','session'})
        check(f'{oid}: classification metadata', op.get('x-taymex-data-classification') in {'public','internal','confidential','sensitive','restricted'})
        check(f'{oid}: no-store cache policy', op.get('x-taymex-cache')=='no-store')

expected={'healthLiveness','healthReadiness','authSignIn','authSignOut','authCurrentSession','adminCreateRole','adminAssignRoles','adminQueryAudit','adminGetSetting','adminWriteSetting'}
check('F5 operation set is exact', set(ops)==expected, f'actual={sorted(ops)}')

permissions_source=text('apps/api/src/generated/permissions.generated.ts')
known=set(re.findall(r'^export const \w+Permission = "([^"]+)"', permissions_source, re.M))
for oid,(_,_,op) in ops.items():
    permission=op.get('x-taymex-permission')
    if permission:
        check(f'{oid}: permission is canonical generated permission', permission in known, permission)
        check(f'{oid}: privileged operation requires session auth', op.get('x-taymex-auth')=='session')
        check(f'{oid}: privileged operation requires AAL2', op.get('x-taymex-assurance')=='AAL2')

method_decorator={'GET':'Get','POST':'Post','PUT':'Put','PATCH':'Patch','DELETE':'Delete','OPTIONS':'Options','HEAD':'Head'}
route_sources='\n'.join(p.read_text() for p in sorted((ROOT/'apps/api/src/platform/routes').glob('*.ts'))) + '\n' + text('apps/api/src/modules/health/health.controller.ts')
for oid,(method,_,_) in ops.items():
    dec=method_decorator[method]
    check(f'{oid}: controller path consumes generated operation', f'@{dec}(apiOperations.{oid}.nestPath)' in route_sources)
    check(f'{oid}: controller policy consumes generated operation', f'@ApiPolicy(apiOperations.{oid})' in route_sources)
    check(f'{oid}: success status consumes generated operation', method=='GET' and oid.startswith('health') or f'@HttpCode(apiOperations.{oid}.successStatus)' in route_sources)

runtime=text('apps/api/src/platform/runtime.ts')
all_api='\n'.join(p.read_text(errors='ignore') for p in (ROOT/'apps/api/src').rglob('*.ts'))
check('One PostgreSQL pool composition point in API source', all_api.count('createNodePgPool(')==1, f'count={all_api.count("createNodePgPool(")}')
for forbidden in ['MemoryIdentityRepository','MemoryRoleAccessStore','MemorySettingsValueStore','MemoryAuditStore','MemoryAuthenticationThrottle']:
    check(f'No production fallback: {forbidden}', forbidden not in runtime)
check('Identity events compose durable audit and structured log sinks', 'IdentitySecurityAuditSink(audit)' in runtime and 'IdentitySecurityLogSink(logger)' in runtime)
check('Settings uses PostgresSettingsValueStore', 'new PostgresSettingsValueStore(database)' in runtime)
check('Identity uses PostgresIdentityRepository', 'new PostgresIdentityRepository(database)' in runtime)

app=text('apps/api/src/application.ts')
check('Fastify proxy trust is explicitly disabled', 'trustProxy: false' in app)
check('HTTP body size is bounded', 'bodyLimit:' in app and 'HTTP_BODY_LIMIT_BYTES' in app)
check('HTTP request receive timeout is bounded', 'requestTimeout:' in app and 'HTTP_REQUEST_TIMEOUT_MS' in app)
check('Fastify prototype poisoning policy is fail-closed', "onProtoPoisoning: 'error'" in app and "onConstructorPoisoning: 'error'" in app)
check('Route parameter length is explicitly bounded', 'maxParamLength: 240' in app)
check('CORS credentials are explicit', 'credentials: true' in app)
check('CORS has no wildcard origin', "origin: '*'" not in app and 'origin: "*"' not in app)
check('CORS origins are configuration-driven', 'CORS_ALLOWED_ORIGINS' in app)
check('No X-Forwarded-For trust path exists', 'x-forwarded-for' not in all_api.lower())

cookie=text('apps/api/src/platform/session-cookie.ts')
for token in ['__Host-taymex_session','HttpOnly','Secure','SameSite=Strict','Path=/']:
    check(f'Session cookie includes {token}', token in cookie)
check('Session cookie does not set Domain', 'Domain=' not in cookie)

guard=text('apps/api/src/platform/http-security.guard.ts')
response_security=text('apps/api/src/platform/response-security.ts')
for token in ['x-content-type-options','x-frame-options','content-security-policy','referrer-policy','permissions-policy','cross-origin-resource-policy','cache-control']:
    check(f'HTTP security header: {token}', token in response_security)
check('HTTP guard authenticates canonical session', 'authenticateSession(' in guard)
check('HTTP guard enforces canonical permission', 'requirePermission(' in guard)
check('HTTP guard enforces assurance', 'requireAssurance(' in guard)
check('HTTP guard applies bounded rate limiter', 'httpRateLimiter.consume(' in guard)
check('Correlation context is fixed before early HTTP failures', 'request.taymex = { correlationId: correlation.id, operation, actor: null, sessionSecret: null }' in guard)

filter_source=text('apps/api/src/platform/http-exception.filter.ts')
check('Transport does not expose raw exception messages', 'error.message' not in filter_source and 'error.stack' not in filter_source)
check('Transport uses canonical safe descriptor', 'toSafeErrorDescriptor' in filter_source)
check('Unknown errors map to stable internal code', 'HTTP_INTERNAL_ERROR' in filter_source)

test_source=text('apps/api/tests/f5-http.integration.test.mjs')
for phrase in ['AAL1','AAL2','access-control-allow-origin','HTTP_PAYLOAD_TOO_LARGE','Max-Age=0','settings.value.changed','x-correlation-id']:
    check(f'HTTP integration proof covers {phrase}', phrase in test_source)
check('HTTP integration is guarded by explicit database opt-in', "F5_DATABASE_TESTS === '1'" in test_source and 'TEST_DATABASE_URL' in test_source)
check('HTTP integration uses real application factory', 'createApiApplication' in test_source and 'server.inject' in test_source)
check('HTTP proof distinguishes permission denial from AAL1 assurance denial', 'permissionDenied' in test_source and 'aal1PrivilegedCookie' in test_source and 'aal1Denied' in test_source)
check('HTTP proof exercises privileged AAL2 success path', 'adminCookie' in test_source and "assurance=$2" in test_source and "'AAL2'" in test_source)
check('HTTP proof exercises rate limiting through the HTTP boundary', "remoteAddress: ratePeer" in test_source and "rateDenied.statusCode, 429" in test_source)
check('HTTP settings proof is rerunnable through a unique project scope', "scope: 'project'" in test_source and 'projectRef = `f5-http-${unique}`' in test_source)
check('HTTP proof exercises live readiness', "url: '/api/health/ready'" in test_source and ("readiness.json().status, 'READY'" in test_source or "readiness.json().status, 'UP'" in test_source))

manifest=yaml.safe_load(text('apps/api/src/platform/module.manifest.yaml'))
check('API foundation module is foundation-owned', manifest.get('id')=='api-foundation' and manifest.get('layer')=='foundation')
check('API contract ownership is declared', 'api.openapi.taymex.v1' in manifest.get('contracts',{}).get('owns',[]))
check('API foundation does not claim direct DB table ownership', not manifest.get('data',{}).get('owns'))
check('Sensitive API module classification is declared', manifest.get('data',{}).get('classification')=='sensitive')

foundation_manifest=yaml.safe_load(text('blueprints/foundation/foundation.manifest.yaml'))
foundation=foundation_manifest.get('foundation') or {}
capability_by_id={c.get('id'): c for c in foundation_manifest.get('capabilities') or []}
check('F5 closure advances foundation stage to F6', foundation.get('currentStage')=='F6', f"currentStage={foundation.get('currentStage')!r}")
check('Products validation slice remains frozen after F5', (foundation.get('validationSlice') or {}).get('status')=='FROZEN_FOR_FOUNDATION_PROOF')
proven_by_f5={
    'architecture.runtime-boundaries',
    'identity.authentication-sessions',
    'authorization.permissions-policies',
    'settings.effective-runtime',
    'audit.core',
    'observability.logging-tracing-health',
    'api.contracts',
    'security.application-baseline',
}
for cid in sorted(proven_by_f5):
    capability=capability_by_id.get(cid) or {}
    check(f'{cid}: F5 real-consumer maturity is PROVEN', capability.get('currentMaturity')=='PROVEN', str(capability.get('currentMaturity')))
    check(f'{cid}: no unresolved F5 work remains', not capability.get('remaining'), str(capability.get('remaining')))
    check(f'{cid}: F5 runtime proof is cited', 'docs/evidence/F5_HTTP_SECURITY_PROOF.md' in (capability.get('evidence') or []))
classification=capability_by_id.get('security.data-classification') or {}
check('Data classification stays at its declared satisfied INTEGRATED maturity', classification.get('currentMaturity')=='INTEGRATED' and classification.get('exitMaturity')=='INTEGRATED')
performance=capability_by_id.get('performance.query-runtime') or {}
check('F6 performance capability has not regressed below its F5 design baseline', performance.get('currentMaturity') in {'DESIGNED','IMPLEMENTED','INTEGRATED','PROVEN'}, str(performance.get('currentMaturity')))
proof=text('docs/evidence/F5_HTTP_SECURITY_PROOF.md')
for phrase in [
    '**PROVEN**',
    '36602be3b40314f2b7aee8265b5fce13663a3d90',
    'PostgreSQL:            18.6',
    'server_version_num:   180006',
    'No known vulnerabilities found',
    'pass 1',
    'fail 0',
    'skipped 0',
    'GET /api/health/ready -> 200, status=READY',
]:
    check(f'F5 closure proof records {phrase}', phrase in proof)

# High-confidence repository secret scan for production/config surfaces. Historical context/docs and tests are excluded.
secret_patterns = {
    'private-key': re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    'aws-access-key': re.compile(r'AKIA[0-9A-Z]{16}'),
    'github-token': re.compile(r'gh[pousr]_[A-Za-z0-9]{20,}'),
    'credentialed-postgres-uri': re.compile(r'postgres(?:ql)?://[^\s:/]+:[^\s@]+@', re.I),
}
secret_hits=[]
secret_roots=[ROOT/'apps/api/src', ROOT/'packages', ROOT/'contracts/openapi', ROOT/'blueprints/project-profiles']
for base in secret_roots:
    if not base.exists(): continue
    for path in base.rglob('*'):
        if not path.is_file() or path.suffix not in {'.ts','.tsx','.js','.mjs','.json','.yaml','.yml'}: continue
        if '/tests/' in path.as_posix() or '/dist/' in path.as_posix(): continue
        content=path.read_text(errors='ignore')
        for label,pattern in secret_patterns.items():
            if pattern.search(content): secret_hits.append(f'{path.relative_to(ROOT)}:{label}')
check('No high-confidence hard-coded secrets in F5 production/config surfaces', not secret_hits, ', '.join(secret_hits))

for name,detail in PASS: print(f'PASS: {name}' + (f' — {detail}' if detail else ''))
for name,detail in FAIL: print(f'FAIL: {name}' + (f' — {detail}' if detail else ''))
print(f'SUMMARY: {"PASS" if not FAIL else "FAIL"} ({len(PASS)} passed, {len(FAIL)} failed)')
raise SystemExit(1 if FAIL else 0)

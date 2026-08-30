#!/usr/bin/env python3
from __future__ import annotations
import copy
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'operations/f9/production-delivery.authority.yaml'
MANIFEST = ROOT / 'blueprints/foundation/foundation.manifest.yaml'
WORKFLOW = ROOT / '.github/workflows/governance.yml'
RUNTIME_PROOF = ROOT / 'scripts/verify-f9-observability-runtime.mjs'

checks: list[str] = []
def check(name: str, condition: bool, detail: str = '') -> None:
    if not condition:
        raise AssertionError(f'{name}: {detail or "failed"}')
    checks.append(name)

def load_yaml(path: Path):
    return yaml.safe_load(path.read_text(encoding='utf-8'))

def capability(manifest, cid: str):
    for item in manifest.get('capabilities', []):
        if item.get('id') == cid:
            return item
    raise AssertionError(f'missing capability {cid}')

def run_observability_authority_checks(a: dict, m: dict):
    check('authority-schema', a.get('schemaVersion') == 1)
    check('authority-stage', a.get('stage') == 'F9')
    check('authority-status', a.get('status') == 'IMPLEMENTED_LOCAL_BASELINE')

    # Part A: Production Logging Contract
    log_sec = a['productionLogging']
    check('log-format', log_sec['format'] == 'line-delimited-json')
    check('log-timestamp-policy', log_sec['timestampPolicy'] == 'iso8601-utc')
    check('log-severity-levels', set(log_sec['severityLevels']) == {'debug', 'info', 'warn', 'error', 'fatal'})
    check('log-service-identity-api', log_sec['serviceIdentity']['api'] == 'taymex-api')
    check('log-service-identity-web', log_sec['serviceIdentity']['web'] == 'taymex-web')
    
    rel_id = log_sec['releaseIdentityRequired']
    check('log-rel-git-sha', rel_id['gitCommitSha'] is True)
    check('log-rel-app-version', rel_id['appVersion'] is True)
    check('log-rel-build-rev', rel_id['buildRevision'] is True)
    check('log-rel-environment', rel_id['environment'] is True)

    corr_pol = log_sec['correlationIdPolicy']
    check('log-corr-header', corr_pol['header'] == 'x-correlation-id')
    check('log-corr-propagation', corr_pol['propagationRequiredAcrossContext'] is True)

    err_rep = log_sec['safeErrorRepresentation']
    check('err-client-stack-forbidden', err_rep['clientFacingStackExposure'] == 'forbidden')
    check('err-preserve-structured-code', err_rep['preserveStructuredErrorCode'] is True)

    redact = log_sec['redactionRules']
    check('redact-sensitive-fields', redact['sensitiveFieldRedaction'] == 'recursive-sanitization')
    check('redact-secret-exclusion', redact['secretExclusion'] == 'mandatory')
    check('redact-auth-header', redact['authorizationHeaderExclusion'] == 'mandatory')
    check('redact-cookie-session', redact['cookieSessionSecretExclusion'] == 'mandatory')
    check('redact-db-creds', redact['databaseCredentialsExclusion'] == 'mandatory')
    check('redact-password-hash', redact['passwordHashExclusion'] == 'mandatory')
    check('redact-request-body-pwd', redact['requestBodyPasswordExclusion'] == 'mandatory')

    egress = log_sec['egress']
    check('egress-app-level', egress['applicationLevel'] == 'stdout-stderr-unbuffered')
    check('egress-collector-resp', egress['collectorDeliveryResponsibility'] == 'deployment-collector-or-sidecar')

    telem = log_sec['telemetryExport']
    check('telem-metrics-pending', telem['metricsExportStatus'] == 'PENDING_PROVIDER_PROFILE')
    check('telem-traces-pending', telem['traceExportStatus'] == 'PENDING_PROVIDER_PROFILE')
    check('telem-log-delivery-pending', telem['logDeliveryProofStatus'] == 'PENDING_PROVIDER_PROFILE')

    # Part C: Production Diagnostics Contract
    diag = a['productionDiagnostics']
    live = diag['liveness']
    check('live-endpoint', live['endpoint'] == '/api/health')
    check('live-scope', live['scope'] == 'process-liveness')
    check('live-isolated', live['isolatedFromExternalDependencies'] is True)
    check('live-db-forbidden', live['databaseDependencyForbidden'] is True)

    ready = diag['readiness']
    check('ready-endpoint', ready['endpoint'] == '/api/health/ready')
    check('ready-scope', ready['scope'] == 'dependency-readiness')
    check('ready-checks-database', 'database' in ready['checks'])
    check('ready-fail-closed', ready['failClosedOnDependencyDown'] is True)

    diag_meta = diag['diagnosticsMetadata']
    check('diag-sensitive-config-exclusion', diag_meta['sensitiveConfigurationExclusion'] == 'mandatory')
    check('diag-dsn-exclusion', diag_meta['databaseConnectionStringExclusion'] == 'mandatory')

    # Part D: Deployment Abuse Protection Contract
    abuse = a['deploymentAbuseProtection']
    check('abuse-multi-instance-req', abuse['multiInstanceEnforcement'] == 'deployment-edge-or-gateway-required')

    local_def = abuse['localDefenseInDepth']
    check('abuse-per-process-status', local_def['perProcessRateLimiting'] == 'IMPLEMENTED_LOCAL_BASELINE')
    check('abuse-body-size-limit', local_def['bodySizeLimitBytes'] == 1048576)
    check('abuse-request-timeout', local_def['requestTimeoutMs'] == 15000)
    check('abuse-max-param-len', local_def['maxParamLength'] == 240)
    check('abuse-proto-poison', local_def['onProtoPoisoning'] == 'error')
    check('abuse-constructor-poison', local_def['onConstructorPoisoning'] == 'error')
    check('abuse-cors-allowlist', local_def['corsStrictOriginAllowlist'] is True)
    check('abuse-pagination-max', local_def['paginationMaxLimit'] == 100)

    edge = abuse['edgeProtection']
    check('edge-status-pending', edge['status'] == 'PENDING_PROVIDER_PROFILE')
    check('edge-distributed-rate-pending', edge['distributedRateLimitingStatus'] == 'PENDING_PROVIDER_PROFILE')
    for req_pol in (
        'ipRateLimiting',
        'authenticatedUserLimiting',
        'sensitiveFlowStricterLimits',
        'signinBruteForceProtection',
        'requestBodySizeBounds',
        'requestTimeoutBounds',
        'connectionConcurrencyBounds',
        'paginationMaxBounds',
        'upstreamDownstreamTimeout',
    ):
        check(f'edge-policy-{req_pol}', req_pol in edge['requiredEdgePolicies'])

    # Capability checks
    ops_cap = capability(m, 'operations.environment-secrets-delivery')
    check('ops-cap-implemented', ops_cap['currentMaturity'] == 'IMPLEMENTED')
    check('ops-cap-not-proven', ops_cap['currentMaturity'] != 'PROVEN')

def run_negative_verifier_tests(base_auth: dict, base_manifest: dict):
    # Test 1: Telemetry delivery claiming PROVEN without provider evidence must fail
    bad_auth = copy.deepcopy(base_auth)
    bad_auth['productionLogging']['telemetryExport']['logDeliveryProofStatus'] = 'PROVEN'
    try:
        run_observability_authority_checks(bad_auth, base_manifest)
        raise AssertionError('Negative test failed: premature PROVEN log delivery claim was accepted')
    except AssertionError as e:
        check('negative-gate-unproven-telemetry', 'telem-log-delivery-pending' in str(e))

    # Test 2: Edge protection claiming PROVEN when only per-process limiter exists must fail
    bad_auth = copy.deepcopy(base_auth)
    bad_auth['deploymentAbuseProtection']['edgeProtection']['status'] = 'PROVEN'
    try:
        run_observability_authority_checks(bad_auth, base_manifest)
        raise AssertionError('Negative test failed: premature PROVEN edge protection claim was accepted')
    except AssertionError as e:
        check('negative-gate-unproven-edge-protection', 'edge-status-pending' in str(e))

    # Test 3: Missing authorization header redaction requirement must fail
    bad_auth = copy.deepcopy(base_auth)
    bad_auth['productionLogging']['redactionRules']['authorizationHeaderExclusion'] = 'optional'
    try:
        run_observability_authority_checks(bad_auth, base_manifest)
        raise AssertionError('Negative test failed: optional auth header redaction was accepted')
    except AssertionError as e:
        check('negative-gate-auth-header-redaction', 'redact-auth-header' in str(e))

    # Test 4: Conflating liveness with database dependency must fail
    bad_auth = copy.deepcopy(base_auth)
    bad_auth['productionDiagnostics']['liveness']['databaseDependencyForbidden'] = False
    try:
        run_observability_authority_checks(bad_auth, base_manifest)
        raise AssertionError('Negative test failed: database-dependent liveness probe was accepted')
    except AssertionError as e:
        check('negative-gate-liveness-db-conflation', 'live-db-forbidden' in str(e))

    # Test 5: Missing correlation ID propagation must fail
    bad_auth = copy.deepcopy(base_auth)
    bad_auth['productionLogging']['correlationIdPolicy']['propagationRequiredAcrossContext'] = False
    try:
        run_observability_authority_checks(bad_auth, base_manifest)
        raise AssertionError('Negative test failed: disabled correlation propagation was accepted')
    except AssertionError as e:
        check('negative-gate-correlation-propagation', 'log-corr-propagation' in str(e))

def main():
    if not AUTH.exists():
        raise AssertionError(f'Missing production delivery authority at {AUTH}')
    
    auth_data = load_yaml(AUTH)
    manifest_data = load_yaml(MANIFEST)

    run_observability_authority_checks(auth_data, manifest_data)
    run_negative_verifier_tests(auth_data, manifest_data)

    # Runtime proof script checks
    check('runtime-proof-script-exists', RUNTIME_PROOF.exists())
    proof_text = RUNTIME_PROOF.read_text(encoding='utf-8')
    check('proof-liveness', 'Liveness endpoint provides safe process metadata' in proof_text)
    check('proof-readiness', 'Readiness endpoint proves database dependency status' in proof_text)
    check('proof-correlation', 'Correlation ID is preserved from request -> response -> structured log' in proof_text)
    check('proof-redaction', 'Deep log scan verified zero secrets, tokens, passwords' in proof_text)
    check('proof-body-limit', 'Fastify body limit strictly rejects oversized requests with 413' in proof_text)

    # CI workflow step check
    workflow_text = WORKFLOW.read_text(encoding='utf-8')
    check('workflow-f9-observability-step', 'scripts/verify-f9-observability-abuse.py' in workflow_text)

    print(f'PASS: F9 production observability, diagnostics and abuse protection baseline ({len(checks)}/{len(checks)})')

if __name__ == '__main__':
    main()

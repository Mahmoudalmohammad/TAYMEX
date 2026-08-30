#!/usr/bin/env python3
from __future__ import annotations
import re
import copy
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'operations/f9/recovery.authority.yaml'
MANIFEST = ROOT / 'blueprints/foundation/foundation.manifest.yaml'
WORKFLOW = ROOT / '.github/workflows/governance.yml'

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

def run_authority_checks(a: dict, m: dict):
    check('recovery-authority-schema', a.get('schemaVersion') == 1)
    check('recovery-authority-stage', a.get('stage') == 'F9')
    check('recovery-authority-status', a.get('status') == 'IMPLEMENTED_LOCAL_BASELINE')

    db_backup = a['databaseBackup']
    check('backup-strategy', db_backup['strategy'] == 'logical-portable-archive')
    check('backup-tool', db_backup['tool'] == 'pg_dump')
    check('backup-format', db_backup['format'] == 'custom')
    check('backup-fail-on-error', db_backup['failOnError'] is True)
    check('backup-flags', all(f in db_backup['flags'] for f in ('--format=custom', '--no-owner', '--no-privileges')))
    check('backup-encoding', db_backup['characterEncoding'] == 'UTF-8')
    check('backup-data-checksums', db_backup['dataPageChecksums'] == 'required-server-invariant')

    db_restore = a['databaseRestore']
    check('restore-strategy', db_restore['strategy'] == 'isolated-destination-restore')
    check('restore-tool', db_restore['tool'] == 'pg_restore')
    check('restore-fail-on-error', db_restore['failOnError'] is True)
    check('restore-flags', all(f in db_restore['flags'] for f in ('--clean', '--if-exists', '--single-transaction', '--exit-on-error')))
    
    target_val = db_restore['targetValidation']
    check('restore-require-isolated', target_val['requireIsolatedCleanDatabase'] is True)
    check('restore-forbid-same-source', target_val['sameSourceDatabaseRestoreForbidden'] is True)
    check('restore-schema-verification', target_val['postRestoreSchemaVerification'] is True)
    check('restore-trigger-verification', target_val['postRestoreTriggerVerification'] is True)
    check('restore-invariant-verification', target_val['postRestoreInvariantVerification'] is True)
    check('restore-readiness-probe', target_val['postRestoreReadinessProbe'] is True)

    integrity = a['integrity']
    check('integrity-algorithm', integrity['algorithm'] == 'SHA-256')
    check('integrity-pre-restore-check', integrity['verificationRequiredBeforeRestore'] is True)
    check('integrity-fail-mismatch', integrity['failOnChecksumMismatch'] is True)
    check('integrity-negative-proof', integrity['negativeProofRequirement'] == 'tamper-mutation-detection-tested')

    sec = a['security']
    check('sec-encryption-at-rest', sec['encryptionAtRestRequired'] is True)
    check('sec-encryption-in-transit', sec['encryptionInTransitRequired'] is True)
    check('sec-least-privilege', sec['leastPrivilegeBackupRoleRequired'] is True)
    check('sec-no-sensitive-logs', sec['sensitiveDataInLogsOrManifestForbidden'] is True)
    check('sec-failure-domain-sep', sec['failureDomainSeparationRequired'] is True)
    check('sec-immutability', sec['immutabilityOrRansomwareResistanceRequired'] is True)
    check('sec-prod-pending', sec['productionStorageStatus'] == 'PENDING_PROVIDER_SELECTION')

    pitr = a['continuousBackupAndPITR']
    check('pitr-mandatory-prod', pitr['requirement'] == 'mandatory-for-production')
    check('pitr-local-pending', pitr['localProofStatus'] == 'PENDING_PROVIDER_SELECTION')

    targets = a['targets']
    check('rpo-pending-bia', targets['rpoStatus'] == 'PENDING_BIA')
    check('rto-pending-bia', targets['rtoStatus'] == 'PENDING_BIA')
    check('retention-authority', targets['retentionAuthority'] == 'regulatory-and-business-impact-policy')
    check('restore-drill-required', targets['restoreDrillRequirement'] == 'mandatory-automated-and-periodic')

    media = a['mediaRecovery']
    check('media-pending-provider', media['status'] == 'PENDING_PROVIDER')

    cap = capability(m, 'operations.backup-restore')
    check('cap-maturity-implemented', cap['currentMaturity'] == 'IMPLEMENTED')
    check('cap-not-premature-proven', cap['currentMaturity'] != 'PROVEN')
    for exp_ev in ('operations/f9/recovery.authority.yaml', 'scripts/verify-f9-recovery.py', 'scripts/drill-f9-recovery.py', 'docs/FOUNDATION_F9_BACKUP_RESTORE_RECOVERY_BASELINE.md'):
        check(f'cap-evidence-{Path(exp_ev).stem}', exp_ev in cap.get('evidence', []))
    check('cap-has-remaining', bool(cap.get('remaining')))

def run_negative_verifier_tests(base_auth: dict, base_manifest: dict):
    # Test 1: Missing checksum requirement must fail
    bad_auth = copy.deepcopy(base_auth)
    bad_auth['integrity']['verificationRequiredBeforeRestore'] = False
    try:
        run_authority_checks(bad_auth, base_manifest)
        raise AssertionError('Negative test failed: missing checksum requirement was accepted')
    except AssertionError as e:
        check('negative-gate-checksum-requirement', 'integrity-pre-restore-check' in str(e))

    # Test 2: Premature PROVEN claim without provider evidence must fail
    bad_manifest = copy.deepcopy(base_manifest)
    for c in bad_manifest['capabilities']:
        if c['id'] == 'operations.backup-restore':
            c['currentMaturity'] = 'PROVEN'
    try:
        run_authority_checks(base_auth, bad_manifest)
        raise AssertionError('Negative test failed: premature PROVEN claim was accepted')
    except AssertionError as e:
        check('negative-gate-premature-proven', 'cap-maturity-implemented' in str(e) or 'cap-not-premature-proven' in str(e))

    # Test 3: Unassigned RPO claiming ready status must fail
    bad_auth = copy.deepcopy(base_auth)
    bad_auth['targets']['rpoStatus'] = 'READY_15_MINUTES'
    try:
        run_authority_checks(bad_auth, base_manifest)
        raise AssertionError('Negative test failed: arbitrary unapproved RPO was accepted')
    except AssertionError as e:
        check('negative-gate-unapproved-rpo', 'rpo-pending-bia' in str(e))

    # Test 4: Missing encryption-at-rest requirement must fail
    bad_auth = copy.deepcopy(base_auth)
    bad_auth['security']['encryptionAtRestRequired'] = False
    try:
        run_authority_checks(bad_auth, base_manifest)
        raise AssertionError('Negative test failed: missing encryption requirement was accepted')
    except AssertionError as e:
        check('negative-gate-encryption-requirement', 'sec-encryption-at-rest' in str(e))

def main():
    if not AUTH.exists():
        raise AssertionError(f'Missing recovery authority at {AUTH}')
    
    auth_data = load_yaml(AUTH)
    manifest_data = load_yaml(MANIFEST)

    run_authority_checks(auth_data, manifest_data)
    run_negative_verifier_tests(auth_data, manifest_data)

    # Verify CI workflow includes recovery verifier
    workflow_text = WORKFLOW.read_text(encoding='utf-8')
    check('workflow-f9-recovery-step', 'scripts/verify-f9-recovery.py' in workflow_text)

    # Check for duplicate recovery authorities
    other_authorities = list(ROOT.glob('operations/**/recovery*.yaml'))
    check('single-recovery-authority', len(other_authorities) == 1 and other_authorities[0] == AUTH)

    print(f'PASS: F9 backup/restore recovery authority baseline ({len(checks)}/{len(checks)})')

if __name__ == '__main__':
    main()

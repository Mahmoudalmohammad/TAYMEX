#!/usr/bin/env python3
from __future__ import annotations
import re
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
AUTH = ROOT / 'operations/f9/production-delivery.authority.yaml'
MANIFEST = ROOT / 'blueprints/foundation/foundation.manifest.yaml'
WORKFLOW = ROOT / '.github/workflows/governance.yml'
CODEOWNERS = ROOT / '.github/CODEOWNERS'
RULESET_GUIDE = ROOT / '.github/rulesets/README.md'

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

a = load_yaml(AUTH)
m = load_yaml(MANIFEST)
check('authority-schema', a.get('schemaVersion') == 1)
check('authority-stage', a.get('stage') == 'F9')
check('authority-local-maturity', a.get('status') == 'IMPLEMENTED_LOCAL_BASELINE')
check('foundation-stage', m['foundation']['currentStage'] in {'F9', 'F10'})

rt = a['remoteTrust']
check('remote-provider', rt['provider'] == 'github')
if rt['activationStatus'] == 'ACTIVATED':
    check('remote-identity-complete', all(rt['repositoryIdentity'][k] for k in ('owner', 'repository', 'defaultBranch')))
    check('activated-codeowners-no-placeholder', '@taymex/platform-owners' not in CODEOWNERS.read_text(encoding='utf-8'))
else:
    check('remote-not-falsely-activated', rt['activationStatus'] == 'PENDING_REAL_REMOTE')
    check('remote-identity-unclaimed', all(rt['repositoryIdentity'][k] is None for k in ('owner','repository','defaultBranch')))

controls = rt['requiredMergeControls']
for key in ('pullRequestRequired','codeOwnerReviewRequired','dismissStaleApprovals','conversationResolutionRequired','blockForcePushes','blockBranchDeletion','ordinaryAgentBypassForbidden'):
    check(f'merge-control-{key}', controls[key] is True)
check('required-checks', set(controls['requiredChecks']) == {'trust-root','governance-summary','f9-production-delivery'})
check('activation-red-team', any('red-team' in x for x in rt['activationEvidenceRequired']))

profiles = a['environments']['profiles']
check('profiles-exact', set(profiles) == {'local-validation','staging','production'})
check('local-not-deployable', profiles['local-validation']['deployable'] is False)
for name in ('staging','production'):
    p = profiles[name]
    check(f'{name}-deployable', p['deployable'] is True)
    check(f'{name}-pending-provider', p['activationStatus'] == 'PENDING_PROVIDER_SELECTION')
    check(f'{name}-protected', p['protectedEnvironmentRequired'] is True)
    check(f'{name}-oidc', p['cloudAuthentication'] == 'oidc-short-lived-required-when-supported')

secrets = a['configurationAuthority']['secrets']
for key in ('valuesInRepository','valuesInGeneratedAgentContext','valuesInLogsOrConfigExports','longLivedCloudCredentials'):
    check(f'secrets-{key}', secrets[key] == 'forbidden')
check('secrets-oidc', secrets['cloudAccess'] == 'oidc-short-lived-required-when-supported')
check('runtime-secret-refs', set(secrets['runtimeSecretRefs']) == {'DATABASE_URL','NOTIFICATION_OUTBOX_ENCRYPTION_KEY'})

artifact = a['artifactPolicy']
check('build-once', artifact['buildOncePromoteSameArtifact'] is True)
check('artifact-identity', set(artifact['identity']) == {'git-commit-sha','artifact-sha256'})
check('no-env-rebuild', artifact['environmentSpecificRebuildForbidden'] is True)
check('no-source-tree-deploy', artifact['sourceTreeDeploymentForbidden'] is True)
check('provenance-required', artifact['provenance']['requiredBeforeProductionActivation'] is True)

migration = a['migrationPolicy']
check('migration-command', migration['command'] == 'pnpm db:migrate')
check('destructive-default-deny', migration['destructiveMigrationsDefault'] == 'forbidden')
check('risky-backup', migration['preDeployDatabaseBackupRequiredForRiskyMigration'] is True)
check('rollback-schema-compatible', migration['schemaCompatibilityRequiredForApplicationRollback'] is True)

life = a['releaseLifecycle']
order = life['order']
check('release-exact-sha-first', order[0] == 'verify-exact-sha')
check('migration-before-deploy', order.index('apply-migrations') < order.index('deploy-same-artifact'))
check('same-artifact', 'deploy-same-artifact' in order)
check('readiness', life['health']['readinessEndpoint'] == '/api/health/ready')
check('liveness', life['health']['livenessEndpoint'] == '/api/health')

ops = capability(m, 'operations.environment-secrets-delivery')
check('ops-implemented-not-proven', ops['currentMaturity'] == 'IMPLEMENTED')
check('ops-authority-evidence', 'operations/f9/production-delivery.authority.yaml' in ops.get('evidence', []))
check('ops-verifier-evidence', 'scripts/verify-f9-production-delivery.py' in ops.get('evidence', []))
check('ops-still-remaining', bool(ops.get('remaining')))

trust = capability(m, 'governance.trust-root')
if rt['activationStatus'] == 'ACTIVATED':
    check('trust-proven-on-activation', trust['currentMaturity'] == 'PROVEN')
else:
    check('trust-not-overclaimed', trust['currentMaturity'] == 'INTEGRATED' and bool(trust.get('remaining')))

workflow = WORKFLOW.read_text(encoding='utf-8')
check('workflow-f9-job-name', 'f9-production-delivery:' in workflow)
check('workflow-runs-verifier', 'python3 scripts/verify-f9-production-delivery.py' in workflow)
check('workflow-read-only', re.search(r'permissions:\s*\{contents:\s*read\}', workflow) is not None)
for required in controls['requiredChecks']:
    check(f'ruleset-guide-{required}', f'`{required}` status' in RULESET_GUIDE.read_text(encoding='utf-8'))

codeowners = CODEOWNERS.read_text(encoding='utf-8')
if rt['activationStatus'] != 'PENDING_REAL_REMOTE':
    check('activated-codeowners-no-placeholder', '@taymex/platform-owners' not in codeowners)
    check('activated-remote-identity-complete', all(rt['repositoryIdentity'][k] for k in ('owner','repository','defaultBranch')))
else:
    check('pending-codeowners-placeholder-detected', '@taymex/platform-owners' in codeowners)

# Fail if common secret-bearing files are tracked. Values belong to runtime secret authorities, not Git.
for tracked in (ROOT / '.env', ROOT / '.env.production', ROOT / '.env.staging'):
    check(f'no-tracked-{tracked.name}', not tracked.exists())

print(f'PASS: F9 production/delivery authority baseline ({len(checks)}/{len(checks)})')

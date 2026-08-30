# F9 — Production & Delivery Authority Baseline

## Status

`IMPLEMENTED_LOCAL_BASELINE` — this is not remote or production proof.

F8 is closed. F9 starts by defining one executable authority for remote merge protection, environment profiles, secrets, artifact identity, migrations, deployment and rollback. The machine-readable authority is:

`operations/f9/production-delivery.authority.yaml`

The executable verifier is:

`scripts/verify-f9-production-delivery.py`

## Decisions

1. **Remote merge authority is not claimed yet.** The current archive has no real TAYMEX GitHub remote identity and therefore `remoteTrust.activationStatus` remains `PENDING_REAL_REMOTE`. The verifier fails closed if activation is later claimed while repository coordinates or CODEOWNERS identities are still placeholders.
2. **Deployment environments are explicit.** `local-validation` is non-deployable; `staging` and `production` are protected remote environments and remain pending until an actual provider/profile is selected.
3. **Secrets are not Settings.** Secret values are forbidden in repository, generated agent context, normal logs and config exports. Runtime secret references currently include `DATABASE_URL` and `NOTIFICATION_OUTBOX_ENCRYPTION_KEY`.
4. **Cloud access uses short-lived identity.** When the selected provider supports GitHub OIDC, long-lived cloud credentials are forbidden and OIDC short-lived authentication is required.
5. **Build once, promote the same artifact.** Release identity is the exact Git SHA plus artifact SHA-256. Rebuilding per environment and deploying a source tree are forbidden.
6. **Migration is explicit and fail-closed.** The canonical migration command is `pnpm db:migrate`; destructive migration is default-deny. Risky migrations require a pre-deploy backup. Application rollback is permitted only when schema compatibility is known.
7. **Rollback never rewrites history.** Application rollback uses a previous known-good artifact. Database recovery uses forward repair where safe or a separately verified backup/restore path.
8. **No false maturity.** `operations.environment-secrets-delivery` advances only from `DESIGNED` to `IMPLEMENTED`; `governance.trust-root` stays `INTEGRATED`. Both require real remote/deployment evidence before `PROVEN`.

## Why remote activation remains pending

A ruleset file or local CLI PASS is not external merge authority. F9 must later collect evidence from the actual remote repository showing required PRs, code-owner review, required checks, force-push/deletion protection, no ordinary agent bypass, and a red-team PR that cannot merge.

## External implementation notes

GitHub environments can restrict deployment branches, gate deployments and delay access to environment secrets until protection rules pass. GitHub OIDC can exchange a workflow identity for short-lived cloud credentials instead of storing long-lived cloud access keys. Artifact attestations can establish provenance for build artifacts, but must be verified to provide policy value.

These mechanisms are activation options, not claims that they are already active for TAYMEX.

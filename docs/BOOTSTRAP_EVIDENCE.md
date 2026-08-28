# TAYMEX Independent Consumer Bootstrap Evidence

## Status

**Bootstrap boundary: PROVEN LOCALLY**  
**Real dependency install / Next.js + NestJS build: PENDING ENVIRONMENT PROOF**  
**GitHub ruleset merge authority: PENDING REAL REMOTE ACTIVATION**

This report records evidence for the independent-consumer bootstrap only. It is not a production-readiness claim and it is not the Products vertical-slice completion report.

## What was created

- independent Git repository at `TAYMEX`;
- Next.js web/BFF application skeleton under `apps/web`;
- NestJS + Fastify modular-monolith API skeleton under `apps/api`;
- intentionally empty `catalog` domain behavior boundary: Product semantics are not invented during bootstrap;
- AR/TR/EN project profile with Arabic RTL and tenancy disabled;
- pinned platform runtime artifacts under `.platform/artifacts/runtime`;
- separately pinned governance verifier artifact under `.platform/artifacts/governance`;
- SHA-256 runtime/governance lock metadata;
- base-owned trust-root GitHub workflow skeleton;
- consumer-local governance registries/schemas/policies generated from the pinned platform bootstrap contract;
- generated UI component catalog metadata without copying runtime implementation source.

## Artifact-boundary evidence

`./scripts/platform consumer verify-boundary`

Result:

```text
PASS: independent consumer boundary verified; 4 locked platform artifacts; 4 declared platform dependency uses
```

The gate validates:

- runtime artifact hashes;
- package identities and versions;
- absence of `workspace:` / `link:` coupling for platform packages;
- no direct platform-source package path;
- no escaping symlink;
- every `@engineering-platform/*` bootstrap dependency resolves to its locked `.tgz` artifact.

A deliberate bypass was tested by replacing the UI package with:

```text
link:../../../ENGINEERING_PLATFORM/packages/ui
```

Result: **BLOCKED by ART-003**.

## Governance artifact evidence

The first independent validation exposed a real hidden coupling: Repository Truth originally looked for `tooling/repository-truth/index_ts.cjs` inside the consumer. This was corrected by packaging the TypeScript indexer with the governance artifact itself and resolving TypeScript from the consumer runtime.

After the correction:

```text
PASS: registries valid; 1 settings; 0 permissions; 0 events; 0 API contracts;
1 module manifests; 14 TS symbols; 0 data models; 28 UI component manifests;
0 UI verification manifests; 0 theme profiles; 1 project profiles
```

The bootstrap also found that committing `.governance/repository-truth.json` creates permanent timestamp/path diff noise. It is now generated locally and ignored by Git.

## Real governed change drill

The trusted base for the drill was the then-current `main` bootstrap commit. The exact SHA is intentionally not embedded in the same commit because that would create a self-referential amend loop.

A temporary independent clone created a real task contract and modified only `README.md`.

Results:

```text
PASS: trust-root control-plane verification
PASS: context prepared at .agent-context/BOOTSTRAP-101
PASS: governance summary at .governance/evidence/BOOTSTRAP-101
```

This proves the pinned verifier artifact can run the intended:

```text
task contract → prepare → real Git diff → verify
```

loop in the independent consumer repository.

## Trust-root adversarial drill

A feature/R1 candidate deliberately modified:

```text
.github/workflows/trust-root.yml
```

without control-plane/trust-root authority.

Result: **BLOCKED**, including `TRUST-001` and `TRUST-002` findings for missing authority, wrong task mode, and insufficient risk.

The actual GitHub merge block still requires repository ruleset activation on the future remote repository.

## Deterministic bootstrap artifact proof

The offline packaging step was executed twice with no source change. All runtime and governance artifact SHA-256 values matched between runs.

This bootstrap packer exists only to prove the independent artifact boundary in the offline environment. The intended normal release transport remains `pnpm pack` / private npm-compatible registry.

## Explicitly not yet claimed

The following remain pending and must not be reported as complete:

1. Node 24 runtime proof in this execution environment (current environment is Node 22).
2. `pnpm install` and lockfile generation against the real npm registry.
3. actual `next build`.
4. actual NestJS API build/start.
5. PostgreSQL connection/migration path.
6. real remote GitHub CODEOWNERS team replacement.
7. real GitHub ruleset activation and merge-block proof.
8. Products model/API/database/settings/authz/audit implementation — these belong to the next governed vertical slice.

## Bootstrap conclusion

The independent repository boundary and local governance loop are now strong enough to begin the bounded Products vertical slice. Runtime/build proof will be completed in an environment with Node 24 and package-registry access rather than faked locally.

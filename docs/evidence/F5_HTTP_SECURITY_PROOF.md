# F5 HTTP Security Proof

## Evidence state

**PENDING REAL LOCAL RUNTIME EXECUTION**

This file is an evidence slot, not a claim of success. It must be updated only from raw output produced by the committed F5 revision on the approved Node 24.x / pnpm 11.24.0 runtime and PostgreSQL 18.

## Required evidence

- Git commit SHA tested;
- Node and pnpm versions;
- PostgreSQL `server_version` and `server_version_num`;
- clean `pnpm install`, recursive build and tests;
- generated API check and F5 structural verifier;
- dependency advisory scan;
- `F5_DATABASE_TESTS=1` real HTTP integration output with zero skips;
- platform/project/settings/permissions checks;
- consumer boundary;
- task governance with trusted base and tested HEAD;
- trust-root local verification.

No PASS statement belongs here until those outputs are captured.

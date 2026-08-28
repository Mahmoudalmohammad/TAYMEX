# Engineering Handoff Protocol

The repository is the source of execution continuity. Conversation summaries and `.handoff/current.json` are convenience views only.

## Authority order

1. Git history and current diff.
2. Approved Task Contract.
3. Machine-readable manifests and registries.
4. Verification evidence and test results.
5. Generated handoff snapshot.

A lower source never overrides a conflicting higher source.

## Before handing work to another agent

1. Finish the current Task Contract or record a real blocker.
2. Run the task's required tests and `platform task verify`.
3. Commit the verified task so the working tree is clean.
4. Run `platform handoff create`.
5. Run `platform handoff verify`.
6. Hand over the repository at the exact verified commit.

## When receiving work

1. Run `platform handoff status`.
2. Run `platform handoff verify`.
3. Inspect recent Git commits and any diff since the last known checkpoint.
4. Inspect the current task evidence and Foundation readiness manifest.
5. Continue only after the handoff is verified or explicit blockers are resolved.

## Rules

- `.handoff/current.json` is generated and ignored by Git.
- It must never contain credentials, tokens, connection strings, cookies, or private reasoning traces.
- A `verified` snapshot requires exact HEAD/branch identity, a clean working tree, PASS task evidence, valid project/foundation metadata, valid locked artifacts, and fresh digest-tracked generated bindings.
- Manually editing a stored PASS value cannot make a failing repository valid; verification recomputes live truth.
- Local ENGINEERING_PLATFORM source is optional. TAYMEX remains independently verifiable from its locked artifacts.
- Unknown or missing critical truth blocks handoff; it is never guessed.

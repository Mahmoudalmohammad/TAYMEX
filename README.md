# TAYMEX

Independent consumer repository for the TAYMEX company platform.

## Architectural boundary

- `ENGINEERING_PLATFORM` is a separate repository/product platform.
- This repository consumes pinned, versioned platform artifacts under `.platform/artifacts/` during the offline bootstrap phase.
- Direct source imports, workspace links, symlinks to the platform repository, and copy/paste of platform runtime source are prohibited.
- The first real validation slice is **Products Management**. The bootstrap intentionally does not invent the Product model before its governed task contract is approved.

## Runtime topology

```text
Next.js Web / BFF
        ↓
NestJS + Fastify modular-monolith API
        ↓
PostgreSQL 18 (introduced with the Products persistence slice)
```

## Bootstrap status

This repository is structurally ready for the Products vertical slice. Dependency installation/build remains a separate environment proof because this execution environment cannot access the npm registry and is currently Node 22 rather than the required Node 24.

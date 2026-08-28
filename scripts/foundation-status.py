#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "blueprints" / "foundation" / "foundation.manifest.yaml"


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    raise SystemExit(2)


def main() -> int:
    if not MANIFEST.exists():
        fail(f"missing foundation manifest: {MANIFEST.relative_to(ROOT)}")

    data = yaml.safe_load(MANIFEST.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or data.get("schemaVersion") != 1:
        fail("foundation manifest must declare schemaVersion: 1")

    foundation = data.get("foundation")
    capabilities = data.get("capabilities")
    if not isinstance(foundation, dict) or not isinstance(capabilities, list):
        fail("manifest requires foundation object and capabilities list")

    order = foundation.get("maturityOrder")
    if not isinstance(order, list) or len(order) < 2 or len(set(order)) != len(order):
        fail("foundation.maturityOrder must be a unique ordered list")
    rank = {name: index for index, name in enumerate(order)}

    required_fields = {
        "id",
        "area",
        "requiredBeforeFeatureExpansion",
        "currentMaturity",
        "exitMaturity",
        "owner",
        "purpose",
        "evidence",
        "remaining",
    }
    seen: set[str] = set()
    blocked: list[dict] = []

    for index, capability in enumerate(capabilities):
        if not isinstance(capability, dict):
            fail(f"capabilities[{index}] must be an object")
        missing = sorted(required_fields - capability.keys())
        if missing:
            fail(f"capability {capability.get('id', index)!r} missing: {', '.join(missing)}")
        cid = capability["id"]
        if cid in seen:
            fail(f"duplicate capability id: {cid}")
        seen.add(cid)

        current = capability["currentMaturity"]
        target = capability["exitMaturity"]
        if current not in rank:
            fail(f"{cid}: unknown currentMaturity {current!r}")
        if target not in rank:
            fail(f"{cid}: unknown exitMaturity {target!r}")
        if not isinstance(capability["requiredBeforeFeatureExpansion"], bool):
            fail(f"{cid}: requiredBeforeFeatureExpansion must be boolean")
        if not isinstance(capability["evidence"], list) or not isinstance(capability["remaining"], list):
            fail(f"{cid}: evidence and remaining must be lists")

        if capability["requiredBeforeFeatureExpansion"] and rank[current] < rank[target]:
            blocked.append(capability)

    print(f"Foundation: {foundation.get('id', 'unknown')}")
    print(f"Mandatory capabilities: {sum(1 for c in capabilities if c['requiredBeforeFeatureExpansion'])}")
    print(f"Capabilities below exit maturity: {len(blocked)}")

    if blocked:
        print("STATUS: BLOCKED")
        for item in blocked:
            print(
                f"- {item['id']}: {item['currentMaturity']} -> {item['exitMaturity']} "
                f"({item['area']})"
            )
            for remaining in item["remaining"]:
                print(f"    • {remaining}")
        return 1

    print("STATUS: READY")
    print("Broad domain feature expansion is permitted by the foundation gate.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

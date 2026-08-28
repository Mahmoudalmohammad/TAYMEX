#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:?usage: verify-trust-local.sh BASE [HEAD]}"
HEAD="${2:-HEAD}"
exec "$ROOT/scripts/platform" trust verify-control-plane --base "$BASE" --head "$HEAD"

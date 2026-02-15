#!/usr/bin/env bash
# =============================================================================
# run-matrix.sh — Patcher version compatibility matrix test runner
#
# Usage:
#   ./run-matrix.sh                        # Run all matrix entries
#   ./run-matrix.sh --category cache       # Run only cache patcher tests
#   ./run-matrix.sh --patcher redis        # Run only redis patcher tests
#   ./run-matrix.sh --dry-run              # Print what would run without executing
#
# Requires: docker, docker-compose, jq
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTS_DIR="$(dirname "$SCRIPT_DIR")"
API_DIR="$(dirname "$TESTS_DIR")"
REPO_ROOT="$(cd "$API_DIR/../.." && pwd)"

MATRIX_FILE="$SCRIPT_DIR/matrix.json"
COMPOSE_BASE="$TESTS_DIR/docker-compose.test.yml"
COMPOSE_MATRIX="$TESTS_DIR/docker-compose.matrix.yml"
CONTAINER_NAME="observatory-matrix-runner"

# CLI flags
FILTER_CATEGORY=""
FILTER_PATCHER=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --category) FILTER_CATEGORY="$2"; shift 2 ;;
    --patcher)  FILTER_PATCHER="$2"; shift 2 ;;
    --dry-run)  DRY_RUN=true; shift ;;
    *)          echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# Check prerequisites
for cmd in docker jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: $cmd is required but not installed."
    exit 1
  fi
done

if ! [ -f "$MATRIX_FILE" ]; then
  echo "Error: matrix.json not found at $MATRIX_FILE"
  exit 1
fi

# ---------------------------------------------------------------------------
# Start services
# ---------------------------------------------------------------------------
echo "=== Starting Docker services ==="
if [ "$DRY_RUN" = false ]; then
  docker-compose -f "$COMPOSE_BASE" -f "$COMPOSE_MATRIX" up -d --build --wait 2>/dev/null \
    || docker compose -f "$COMPOSE_BASE" -f "$COMPOSE_MATRIX" up -d --build --wait
  echo "Services started."
fi

# ---------------------------------------------------------------------------
# Read matrix entries
# ---------------------------------------------------------------------------
TOTAL=0
PASSED=0
FAILED=0
SKIPPED=0
RESULTS=()

ENTRIES=$(jq -c '.entries[]' "$MATRIX_FILE")

while IFS= read -r entry; do
  patcher=$(echo "$entry" | jq -r '.patcher')
  package=$(echo "$entry" | jq -r '.package')
  versions=$(echo "$entry" | jq -r '.versions[]')
  smokeTest=$(echo "$entry" | jq -r '.smokeTest')
  category=$(echo "$entry" | jq -r '.category')

  # Apply filters
  if [ -n "$FILTER_CATEGORY" ] && [ "$category" != "$FILTER_CATEGORY" ]; then
    continue
  fi
  if [ -n "$FILTER_PATCHER" ] && [ "$patcher" != "$FILTER_PATCHER" ]; then
    continue
  fi

  for version in $versions; do
    TOTAL=$((TOTAL + 1))
    label="$patcher@$version ($smokeTest)"

    if [ "$DRY_RUN" = true ]; then
      echo "[DRY-RUN] Would test: $label"
      continue
    fi

    echo ""
    echo "--- [$TOTAL] Testing $label ---"

    # Install the specific version inside the container
    if ! docker exec "$CONTAINER_NAME" \
      sh -c "npm install ${package}@${version} --no-save --legacy-peer-deps 2>&1" > /dev/null 2>&1; then
      echo "  SKIP: Could not install ${package}@${version}"
      SKIPPED=$((SKIPPED + 1))
      RESULTS+=("SKIP  $label")
      continue
    fi

    # Run the smoke test
    if docker exec \
      -e MATRIX_PACKAGE="$package" \
      -e OBSERVATORY_REDIS_URL="redis://redis-test:6379" \
      -e MYSQL_HOST="mysql-test" \
      -e MYSQL_PORT="3306" \
      -e MYSQL_USER="test_user" \
      -e MYSQL_PASSWORD="test_password" \
      -e MYSQL_DATABASE="observatory_test" \
      "$CONTAINER_NAME" \
      npx ts-node "packages/api/tests/matrix/${smokeTest}" 2>&1; then
      echo "  PASS: $label"
      PASSED=$((PASSED + 1))
      RESULTS+=("PASS  $label")
    else
      echo "  FAIL: $label"
      FAILED=$((FAILED + 1))
      RESULTS+=("FAIL  $label")
    fi
  done

done <<< "$ENTRIES"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "==========================================="
echo "  Matrix Test Results"
echo "==========================================="
for r in "${RESULTS[@]:-}"; do
  echo "  $r"
done
echo ""
echo "  Total:   $TOTAL"
echo "  Passed:  $PASSED"
echo "  Failed:  $FAILED"
echo "  Skipped: $SKIPPED"
echo "==========================================="

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi

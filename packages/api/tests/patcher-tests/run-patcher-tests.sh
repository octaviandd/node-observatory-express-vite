#!/usr/bin/env bash
# =============================================================================
# run-patcher-tests.sh — End-to-end patcher verification via Docker
#
# Starts Docker services (MySQL + Redis + app), then for each package version
# in the matrix, installs that version, starts the with-express server, hits
# /stress routes, and verifies entries land in MySQL with correct data shapes.
#
# Usage:
#   # From the packages/api directory:
#   npm run test:patcher:cache               # Test cache patchers
#   npm run test:patcher:logger              # Test logger patchers
#   npm run test:patcher:all                 # Test everything
#
#   # Or directly:
#   bash tests/patcher-tests/run-patcher-tests.sh --category cache
#   bash tests/patcher-tests/run-patcher-tests.sh --category cache --patcher redis
#   bash tests/patcher-tests/run-patcher-tests.sh --all
#   bash tests/patcher-tests/run-patcher-tests.sh --dry-run
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.patcher-test.yml"
MATRIX_FILE="$SCRIPT_DIR/matrix.json"
CONTAINER="observatory-patcher-runner"

# CLI flags
FILTER_CATEGORY=""
FILTER_PATCHER=""
DRY_RUN=false
RUN_ALL=false
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --category)   FILTER_CATEGORY="$2"; shift 2 ;;
    --patcher)    FILTER_PATCHER="$2"; shift 2 ;;
    --all)        RUN_ALL=true; shift ;;
    --dry-run)    DRY_RUN=true; shift ;;
    --skip-build) SKIP_BUILD=true; shift ;;
    *)            echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [ -z "$FILTER_CATEGORY" ] && [ "$RUN_ALL" = false ] && [ "$DRY_RUN" = false ]; then
  echo "Usage:"
  echo "  $0 --category <cache|log|query|model|job|schedule|mail|notification|http>"
  echo "  $0 --all"
  echo "  $0 --dry-run"
  echo ""
  echo "Options:"
  echo "  --patcher <name>   Filter to a single patcher (e.g., redis, winston)"
  echo "  --skip-build       Skip Docker image rebuild"
  exit 1
fi

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

# All categories to test
ALL_CATEGORIES="cache log query job schedule http"
# These categories have packages that mostly need external services:
# mail, notification, model — include but expect some skips

if [ "$RUN_ALL" = true ]; then
  CATEGORIES="$ALL_CATEGORIES mail notification model"
elif [ -n "$FILTER_CATEGORY" ]; then
  CATEGORIES="$FILTER_CATEGORY"
else
  CATEGORIES="$ALL_CATEGORIES"
fi

# ---------------------------------------------------------------------------
# Mapping between category names
# matrix.json uses "logger", stress routes use "/stress/log"
# ---------------------------------------------------------------------------
category_to_route() {
  case "$1" in
    cache)        echo "cache" ;;
    log|logger)   echo "log" ;;
    query)        echo "query" ;;
    model)        echo "model" ;;
    job)          echo "job" ;;
    schedule)     echo "schedule" ;;
    mail)         echo "mail" ;;
    notification) echo "notification" ;;
    http)         echo "http" ;;
    *)            echo "$1" ;;
  esac
}

# matrix.json category name (for jq filter)
category_to_matrix() {
  case "$1" in
    log)    echo "logger" ;;
    logger) echo "logger" ;;
    *)      echo "$1" ;;
  esac
}

# ---------------------------------------------------------------------------
# Start Docker
# ---------------------------------------------------------------------------
echo "=== Patcher Verification Tests ==="
echo ""

if [ "$DRY_RUN" = false ]; then
  echo "Starting Docker services..."

  BUILD_FLAG=""
  if [ "$SKIP_BUILD" = false ]; then
    BUILD_FLAG="--build"
  fi

  docker compose -f "$COMPOSE_FILE" up -d $BUILD_FLAG --wait 2>&1 || \
    docker-compose -f "$COMPOSE_FILE" up -d $BUILD_FLAG --wait 2>&1

  echo "Docker services ready."
  echo ""
fi

# ---------------------------------------------------------------------------
# Run tests
# ---------------------------------------------------------------------------
TOTAL=0
PASSED=0
FAILED=0
SKIPPED=0
RESULTS=()

for category in $CATEGORIES; do
  route=$(category_to_route "$category")
  matrix_cat=$(category_to_matrix "$category")

  # Read entries from matrix.json for this category
  ENTRIES=$(jq -c --arg cat "$matrix_cat" '.entries[] | select(.category == $cat)' "$MATRIX_FILE")

  if [ -z "$ENTRIES" ]; then
    echo "  No matrix entries for category: $category"
    continue
  fi

  while IFS= read -r entry; do
    patcher=$(echo "$entry" | jq -r '.patcher')
    package=$(echo "$entry" | jq -r '.package')
    versions=$(echo "$entry" | jq -r '.versions[]')
    setup=$(echo "$entry" | jq -r '.setup')

    # Apply patcher filter
    if [ -n "$FILTER_PATCHER" ] && [ "$patcher" != "$FILTER_PATCHER" ]; then
      continue
    fi

    for version in $versions; do
      TOTAL=$((TOTAL + 1))
      label="$patcher@$version ($route)"

      if [ "$DRY_RUN" = true ]; then
        echo "  [DRY-RUN] $label"
        continue
      fi

      echo ""
      echo "--- [$TOTAL] $label ---"

      # Install the specific version
      echo "  Installing $package@$version..."
      if ! docker exec "$CONTAINER" \
        sh -c "cd /app && npm install ${package}@${version} --no-save --legacy-peer-deps 2>&1" > /dev/null 2>&1; then
        echo "  SKIP: Could not install $package@$version"
        SKIPPED=$((SKIPPED + 1))
        RESULTS+=("SKIP  $label (install failed)")
        continue
      fi

      # Run the verification script
      echo "  Running verification..."
      VERIFY_ARGS="--category $route"
      if [ -n "$FILTER_PATCHER" ]; then
        VERIFY_ARGS="$VERIFY_ARGS --package $package"
      fi

      if docker exec \
        -e MATRIX_PACKAGE="$package" \
        "$CONTAINER" \
        npx ts-node --transpile-only packages/api/tests/patcher-tests/verify-patchers.ts $VERIFY_ARGS 2>&1; then
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
done

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "==========================================="
echo "  Patcher Verification Results"
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

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
if [ "$DRY_RUN" = false ]; then
  echo ""
  echo "Stopping Docker services..."
  docker compose -f "$COMPOSE_FILE" down 2>&1 || \
    docker-compose -f "$COMPOSE_FILE" down 2>&1
  echo "Done."
fi

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi

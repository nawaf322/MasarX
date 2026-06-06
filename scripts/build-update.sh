#!/usr/bin/env bash
# =============================================================================
# DEPRIXA PLUS (Envato) — Build Update Package
# =============================================================================
# Usage:
#   ./scripts/build-update.sh 1.1.0
#
# What it does:
#   1. Reads current version from config/version.php
#   2. Creates a ZIP of the entire app excluding sensitive/runtime files
#   3. Outputs: ./releases/deprixa-plus-envato-v{VERSION}.zip
#
# After running:
#   Upload the ZIP to your update server (https://updates.deprixa.com)
#   and bump the version in the server API response to trigger the update
#   notification for all licensed customers.
# =============================================================================

set -euo pipefail

# ── Args ──────────────────────────────────────────────────────────────────────
NEW_VERSION="${1:-}"

if [[ -z "$NEW_VERSION" ]]; then
    echo "Usage: ./scripts/build-update.sh <version>"
    echo "Example: ./scripts/build-update.sh 1.1.0"
    exit 1
fi

# ── Paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RELEASES_DIR="$ROOT_DIR/releases"
ZIP_NAME="deprixa-plus-envato-v${NEW_VERSION}.zip"
ZIP_PATH="$RELEASES_DIR/$ZIP_NAME"

# ── Files/dirs to EXCLUDE from the ZIP ────────────────────────────────────────
EXCLUDES=(
    ".env"
    ".env.*"
    "storage/*"
    "public/uploads/*"
    "public/storage"
    "bootstrap/cache/*"
    "node_modules/*"
    "vendor/*"
    "releases/*"
    "scripts/build-update.sh"
    ".git/*"
    ".gitignore"
    "*.log"
    "phpunit.xml"
    "vite.config.ts.timestamp*"
)

# ── Bump version in config/version.php ────────────────────────────────────────
VERSION_FILE="$ROOT_DIR/config/version.php"
CURRENT_VERSION=$(grep -oP "'current'\s*=>\s*'\K[^']+" "$VERSION_FILE")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  DEPRIXA PLUS (Envato) — Building Update Package"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Current version : v${CURRENT_VERSION}"
echo "  New version     : v${NEW_VERSION}"
echo "  Output          : $ZIP_PATH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Confirm
read -rp "Proceed? [y/N] " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

# Update version.php
sed -i.bak "s/'current'\s*=>\s*'[^']*'/'current' => '${NEW_VERSION}'/" "$VERSION_FILE"
rm -f "${VERSION_FILE}.bak"
echo "✅  Version bumped to v${NEW_VERSION} in config/version.php"

# ── Build exclude args for zip ─────────────────────────────────────────────────
EXCLUDE_ARGS=()
for pattern in "${EXCLUDES[@]}"; do
    EXCLUDE_ARGS+=("--exclude=${pattern}")
done

# ── Create ZIP ────────────────────────────────────────────────────────────────
mkdir -p "$RELEASES_DIR"
cd "$ROOT_DIR"

echo "📦  Creating ZIP..."
zip -r "$ZIP_PATH" . "${EXCLUDE_ARGS[@]}" -q

SIZE=$(du -sh "$ZIP_PATH" | cut -f1)
echo "✅  Package created: $ZIP_NAME ($SIZE)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NEXT STEPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1. Upload $ZIP_NAME to your update server"
echo "     → https://updates.deprixa.com (admin panel)"
echo ""
echo "  2. In your update server, create a new release:"
echo "     - Version : ${NEW_VERSION}"
echo "     - ZIP file: $ZIP_NAME"
echo "     - Changelog: describe what changed"
echo ""
echo "  3. Customers will see the update in:"
echo "     Settings > Maintenance > Updates"
echo "     and can apply it with one click."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

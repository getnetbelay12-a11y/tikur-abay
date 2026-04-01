#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/deploy/support"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BUNDLE_DIR="$OUTPUT_DIR/$TIMESTAMP"

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_command docker
require_command node
require_command mkdir
require_command cp

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not reachable."
  exit 1
fi

mkdir -p "$BUNDLE_DIR"

cd "$ROOT_DIR"

if [[ -f ".env.local-prod" ]]; then
  node -e '
    const fs = require("node:fs");
    const input = fs.readFileSync(".env.local-prod", "utf8");
    const redacted = input
      .split("\n")
      .map((line) => {
        if (!line || line.trim().startsWith("#") || !line.includes("=")) return line;
        const idx = line.indexOf("=");
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1);
        if (/SECRET|KEY|TOKEN|PASSWORD|ACCESS|REFRESH/i.test(key)) {
          return `${key}=<redacted>`;
        }
        return `${key}=${value}`;
      })
      .join("\n");
    fs.writeFileSync(process.argv[1], redacted, "utf8");
  ' "$BUNDLE_DIR/env.local-prod.redacted"
fi

docker compose -f docker-compose.local-prod.yml ps > "$BUNDLE_DIR/compose-ps.txt" 2>&1 || true
docker compose -f docker-compose.local-prod.yml logs --tail=300 > "$BUNDLE_DIR/compose-logs.txt" 2>&1 || true

node scripts/local-doctor.js > "$BUNDLE_DIR/doctor.txt" 2>&1 || true
node scripts/local-stack-status.js > "$BUNDLE_DIR/status.txt" 2>&1 || true
node scripts/prod-verify.js > "$BUNDLE_DIR/prod-verify.txt" 2>&1 || true

cat > "$BUNDLE_DIR/README.txt" <<EOF
Tikur Abay local support bundle

Created: $TIMESTAMP

Files:
- compose-ps.txt
- compose-logs.txt
- doctor.txt
- status.txt
- prod-verify.txt
- env.local-prod.redacted (if .env.local-prod was present)
EOF

echo "Support bundle created: $BUNDLE_DIR"

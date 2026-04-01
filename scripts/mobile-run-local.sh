#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")/.."

for command in node flutter; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command"
    exit 1
  fi
done

if [[ ! -f apps/driver/config/local.json ]]; then
  echo "Missing mobile config: apps/driver/config/local.json"
  exit 1
fi

node scripts/validate-mobile-config.js config/local.json
cd apps/driver
flutter run \
  -d "${1:-iPhone 17 Pro}" \
  --dart-define-from-file=config/local.json

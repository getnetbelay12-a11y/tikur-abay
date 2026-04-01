#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")/.."

for command in node flutter; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command"
    exit 1
  fi
done

if [[ ! -f apps/driver/config/stage.json ]]; then
  echo "Missing mobile config: apps/driver/config/stage.json"
  exit 1
fi

node scripts/validate-mobile-config.js config/stage.json
cd apps/driver
flutter build appbundle --release \
  --dart-define-from-file=config/stage.json

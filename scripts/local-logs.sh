#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.local-prod.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "Missing required command: docker"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not reachable."
  exit 1
fi

cd "$ROOT_DIR"

if [[ $# -gt 0 ]]; then
  docker compose -f "$COMPOSE_FILE" logs --tail=200 -f "$@"
else
  docker compose -f "$COMPOSE_FILE" logs --tail=200 -f backend admin customer-portal nginx mongo redis minio
fi

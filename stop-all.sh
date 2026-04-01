#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")"

for command in docker; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Missing required command: $command"
    exit 1
  fi
done

if ! docker info >/dev/null 2>&1; then
  echo "Docker is installed but the Docker daemon is not reachable."
  echo "Start Docker Desktop or the local Docker service, then try again."
  exit 1
fi

docker compose -f docker-compose.local-prod.yml down

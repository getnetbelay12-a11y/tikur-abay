#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")/.."

for command in docker node; do
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

if [[ ! -f .env.local-prod ]]; then
  echo "Missing .env.local-prod. Copy .env.local-prod.example first."
  exit 1
fi

echo "Validating local production environment..."
node scripts/validate-env.js .env.local-prod

docker compose -f docker-compose.local-prod.yml --env-file .env.local-prod build

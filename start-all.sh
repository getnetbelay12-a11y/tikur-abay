#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")"

compose_started=0
startup_complete=0

cleanup_on_failure() {
  local exit_code=$?
  if [[ $exit_code -ne 0 && $compose_started -eq 1 && $startup_complete -eq 0 ]]; then
    echo "Startup failed. Stopping local production stack..."
    docker compose -f docker-compose.local-prod.yml down >/dev/null 2>&1 || true
  fi
  exit $exit_code
}

trap cleanup_on_failure EXIT

for command in docker pnpm curl node lsof; do
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

required_ports=(6010 6011 6012 6080 6379 9000 9001 27017)
for port in "${required_ports[@]}"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use."
    lsof -nP -iTCP:"$port" -sTCP:LISTEN
    exit 1
  fi
done

docker compose -f docker-compose.local-prod.yml --env-file .env.local-prod up -d --build
compose_started=1

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts="${3:-60}"

  echo "Waiting for ${label}..."
  for ((i = 1; i <= attempts; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  echo "${label} did not become ready in time."
  docker compose -f docker-compose.local-prod.yml logs --tail=200
  exit 1
}

wait_for_health_status() {
  local service="$1"
  local attempts="${2:-60}"

  echo "Waiting for ${service} health status..."
  for ((i = 1; i <= attempts; i++)); do
    local container_id
    container_id="$(docker compose -f docker-compose.local-prod.yml --env-file .env.local-prod ps -q "$service" 2>/dev/null || true)"
    if [[ -z "$container_id" ]]; then
      sleep 2
      continue
    fi

    local status
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container_id" 2>/dev/null || true)"
    if [[ "$status" == "healthy" || "$status" == "running" ]]; then
      return 0
    fi
    sleep 2
  done

  echo "${service} did not become ready in time."
  docker compose -f docker-compose.local-prod.yml logs --tail=200
  exit 1
}

wait_for_health_status mongo
wait_for_http http://localhost:6012/api/v1/health "backend health"
wait_for_http http://localhost:6010 "admin console"
wait_for_http http://localhost:6011 "customer portal"
wait_for_http http://localhost:6080 "nginx proxy"

echo "Seeding local data..."
set -a
source ./.env.local-prod
set +a
pnpm seed:local

echo "Running local production verification..."
if ! pnpm prod:verify; then
  echo "Local production stack started, but verification failed."
  echo "Check service logs with: docker compose -f docker-compose.local-prod.yml logs --tail=200"
  exit 1
fi

echo "System is up:"
echo "Admin:    http://localhost:6010"
echo "Customer: http://localhost:6011"
echo "API:      http://localhost:6012/docs"
echo "Proxy:    http://localhost:6080"
startup_complete=1

#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")/.."

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

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/local-restore.sh <backup-directory>"
  exit 1
fi

backup_dir="$1"

if [[ ! -d "${backup_dir}" ]]; then
  echo "Backup directory not found: ${backup_dir}"
  exit 1
fi

if [[ ! -f "${backup_dir}/mongo.archive" ]]; then
  echo "Missing Mongo archive in ${backup_dir}"
  exit 1
fi

for service in mongo minio backend admin customer-portal nginx; do
  if [[ -z "$(docker compose -f docker-compose.local-prod.yml ps -q "$service" 2>/dev/null || true)" ]]; then
    echo "Required service is not available in the local production stack: $service"
    echo "Start the stack with pnpm prod:up first."
    exit 1
  fi
done

echo "Stopping web and API services before restore..."
docker compose -f docker-compose.local-prod.yml stop nginx admin customer-portal backend >/dev/null

echo "Restoring MongoDB..."
docker compose -f docker-compose.local-prod.yml exec -T mongo \
  mongosh tikur_abay_local --quiet --eval 'db.dropDatabase()' >/dev/null
docker compose -f docker-compose.local-prod.yml exec -T mongo \
  mongorestore --archive --nsInclude='tikur_abay_local.*' --drop < "${backup_dir}/mongo.archive"

if [[ -f "${backup_dir}/uploads.tar.gz" ]]; then
  echo "Restoring local uploads..."
  docker compose -f docker-compose.local-prod.yml run --rm backend \
    sh -lc 'mkdir -p /app/var/uploads && rm -rf /app/var/uploads/*'
  docker compose -f docker-compose.local-prod.yml run --rm backend \
    sh -lc 'cd /app && tar -xzf -' < "${backup_dir}/uploads.tar.gz"
fi

if [[ -f "${backup_dir}/minio.tar.gz" ]]; then
  echo "Restoring MinIO data..."
  docker compose -f docker-compose.local-prod.yml exec -T minio \
    sh -lc 'rm -rf /data/*'
  docker compose -f docker-compose.local-prod.yml exec -T minio \
    sh -lc 'cd /data && tar -xzf -' < "${backup_dir}/minio.tar.gz"
fi

echo "Starting services again..."
docker compose -f docker-compose.local-prod.yml start backend admin customer-portal nginx >/dev/null

echo "Restore completed from ${backup_dir}"

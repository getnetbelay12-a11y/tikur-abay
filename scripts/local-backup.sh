#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")/.."

for command in docker date mkdir; do
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

for service in mongo backend minio; do
  if [[ -z "$(docker compose -f docker-compose.local-prod.yml ps -q "$service" 2>/dev/null || true)" ]]; then
    echo "Required service is not running: $service"
    echo "Start the local production stack with pnpm prod:up first."
    exit 1
  fi
done

backup_root="${BACKUP_DIR:-backups}"
timestamp="$(date +%Y%m%d-%H%M%S)"
target_dir="${backup_root}/${timestamp}"

mkdir -p "${target_dir}"

echo "Creating local production backup in ${target_dir}"

docker compose -f docker-compose.local-prod.yml exec -T mongo \
  mongodump --db tikur_abay_local --archive > "${target_dir}/mongo.archive"

docker compose -f docker-compose.local-prod.yml exec -T backend \
  sh -lc 'cd /app && if [ -d var/uploads ]; then tar -czf - var/uploads; else printf ""; fi' \
  > "${target_dir}/uploads.tar.gz"

docker compose -f docker-compose.local-prod.yml exec -T minio \
  sh -lc 'cd /data && tar -czf - .' > "${target_dir}/minio.tar.gz"

cat > "${target_dir}/metadata.txt" <<EOF
timestamp=${timestamp}
database=tikur_abay_local
mongo_archive=mongo.archive
uploads_archive=uploads.tar.gz
minio_archive=minio.tar.gz
EOF

echo "Backup completed:"
echo "${target_dir}"

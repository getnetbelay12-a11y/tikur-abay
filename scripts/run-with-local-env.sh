#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing .env. Copy .env.example first."
  exit 1
fi

if [[ ! -f apps/backend/.env ]]; then
  echo "Missing apps/backend/.env. Copy apps/backend/.env.example first."
  exit 1
fi

set -a
source ./.env
source ./apps/backend/.env
export LOCAL_MONGODB_URI="${LOCAL_MONGODB_URI:-mongodb://127.0.0.1:27017/tikur_abay_local}"
export MONGODB_URI="$LOCAL_MONGODB_URI"
export MONGO_URI="$LOCAL_MONGODB_URI"
set +a

exec "$@"

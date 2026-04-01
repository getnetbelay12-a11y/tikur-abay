#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")"

RUN_DIR=".local/run"

stop_pid_file() {
  local pid_file="$1"

  if [[ ! -f "$pid_file" ]]; then
    return 0
  fi

  local pid
  pid="$(cat "$pid_file")"

  if kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" >/dev/null 2>&1 || true
    for _ in {1..20}; do
      if ! kill -0 "$pid" >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill -9 "$pid" >/dev/null 2>&1 || true
    fi
  fi

  rm -f "$pid_file"
}

stop_port_listener() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"

  if [[ -z "$pids" ]]; then
    return 0
  fi

  for pid in ${(f)pids}; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done

  sleep 1

  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    for pid in ${(f)pids}; do
      if kill -0 "$pid" >/dev/null 2>&1; then
        kill -9 "$pid" >/dev/null 2>&1 || true
      fi
    done
  fi
}

if [[ -d "$RUN_DIR" ]]; then
  stop_pid_file "$RUN_DIR/mongo.pid"
  stop_pid_file "$RUN_DIR/customer-portal.pid"
  stop_pid_file "$RUN_DIR/admin.pid"
  stop_pid_file "$RUN_DIR/backend.pid"
fi

for port in 27017 6010 6011 6012; do
  stop_port_listener "$port"
done

echo "Local services stopped."

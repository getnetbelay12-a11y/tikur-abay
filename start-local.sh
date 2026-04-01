#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")"
node scripts/local-start.js

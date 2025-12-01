#!/usr/bin/env bash
set -euo pipefail
# Simple runner for Pulse Arena without npm scripts.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
PORT="${PORT:-3000}"
NODE_BIN="${NODE_BIN:-node}"

if ! command -v "$NODE_BIN" >/dev/null 2>&1; then
  echo "Node binary '$NODE_BIN' not found. Install Node.js 18+ or set NODE_BIN to your Node path." >&2
  exit 1
fi

echo "Using Node binary: $NODE_BIN"
"$NODE_BIN" -v

echo "Starting Pulse Arena on port $PORT (override with PORT=####)"
exec "$NODE_BIN" server.js

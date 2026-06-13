#!/usr/bin/env bash
# Balance OS - Deploy Script
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"

echo "=== Balance OS - Deploy ==="

build_frontend() {
    echo "[1/2] Building frontend..."
    cd "$FRONTEND_DIR"
    npm install --silent 2>/dev/null
    npx vite build
    echo "OK - frontend/dist/"
}

serve() {
    echo "[2/2] Starting server at $HOST:$PORT (PAC: ${PAC_PROVIDER:-mock})"
    cd "$BACKEND_DIR"
    SECRET_KEY=$SECRET_KEY \
    PAC_PROVIDER="${PAC_PROVIDER:-mock}" \
    uvicorn app.main:app --host "$HOST" --port "$PORT" --workers 2
}

case "${1:-}" in
    --build-only) build_frontend ;;
    --serve-only) serve ;;
    *) build_frontend && serve ;;
esac

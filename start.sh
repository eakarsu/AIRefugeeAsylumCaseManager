#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; API_DIR="$PROJECT_DIR/backend"; UI_DIR="$PROJECT_DIR/frontend"; MIGRATION="$API_DIR/migrations/001_governed_workflows.sql"
cd "$PROJECT_DIR"
set -a
# shellcheck disable=SC1091
source ./.env
set +a
BACKEND_PORT="${BACKEND_PORT:-3085}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
value(){ local key="$1" current="${!1:-}"; if [[ -n "$current" ]]; then printf '%s' "$current"; else awk -F= -v key="$key" '$1==key{sub(/^[^=]*=/,"");gsub(/^[\047\"]|[\047\"]$/,"");print;exit}' "$PROJECT_DIR/.env"; fi; }
pii_key(){ local current="${PII_ENCRYPTION_KEY:-${MEMORY_ENCRYPTION_KEY_BASE64:-}}"; if [[ -n "$current" ]]; then printf '%s' "$current"; else value PII_ENCRYPTION_KEY; fi; }
check(){ command -v node >/dev/null && command -v npm >/dev/null || { echo 'node and npm are required' >&2; return 1; }; [[ -f "$PROJECT_DIR/.env" ]] || { echo 'Copy .env.example to .env and configure it' >&2; return 1; }; [[ "$(value JWT_SECRET)" =~ ^.{32,}$ ]] || { echo 'JWT_SECRET must contain at least 32 characters' >&2; return 1; }; [[ "$(value GOVERNANCE_TENANT_ID)" =~ ^[A-Za-z0-9._:-]{3,128}$ ]] || { echo 'GOVERNANCE_TENANT_ID is required' >&2; return 1; }; [[ -n "$(value DATABASE_URL)" ]] || { echo 'DATABASE_URL is required' >&2; return 1; }; [[ "$(pii_key)" =~ ^([0-9a-fA-F]{64}|[A-Za-z0-9+/]{43}=)$ ]] || { echo 'PII_ENCRYPTION_KEY must decode to 32 bytes' >&2; return 1; }; rg -qi 'changeme|postgres:postgres|secret-key' "$PROJECT_DIR/.env" && { echo 'Replace placeholder credentials in .env' >&2; return 1; }; echo 'Configuration checks passed'; }
migrate(){ check; [[ "${ALLOW_SCHEMA_MIGRATION:-$(value ALLOW_SCHEMA_MIGRATION)}" == 1 ]] || { echo 'Set ALLOW_SCHEMA_MIGRATION=1 for the explicit migrate command' >&2; return 1; }; command -v psql >/dev/null || { echo 'psql is required for migrations' >&2; return 1; }; psql "$(value DATABASE_URL)" -v ON_ERROR_STOP=1 -f "$MIGRATION"; }
start_services(){ check; [[ -d "$API_DIR/node_modules" && -d "$UI_DIR/node_modules" ]] || { echo 'Install dependencies explicitly in backend and frontend first' >&2; return 1; }; for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && { echo "Port $port is occupied; refusing to terminate another process" >&2; return 1; }; done; (cd "$API_DIR" && exec env PII_ENCRYPTION_KEY="$(pii_key)" CLIENT_URL="http://127.0.0.1:$FRONTEND_PORT" ALLOWED_ORIGINS="http://127.0.0.1:$FRONTEND_PORT,http://localhost:$FRONTEND_PORT" node server.js)& api_pid=$!; (cd "$UI_DIR" && exec env PORT="$FRONTEND_PORT" BROWSER=none REACT_APP_API_BASE="http://127.0.0.1:$BACKEND_PORT/api" ./node_modules/.bin/react-scripts start)& ui_pid=$!; trap 'kill "$api_pid" "$ui_pid" 2>/dev/null || true' EXIT INT TERM; wait "$api_pid" "$ui_pid"; }
case "${1:-start}" in check) check;; migrate) migrate;; start) start_services;; *) echo 'Usage: ./start.sh {check|migrate|start}' >&2; exit 2;; esac

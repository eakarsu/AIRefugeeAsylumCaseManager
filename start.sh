#!/usr/bin/env bash
set -euo pipefail
# Local demo credential bridge (managed by tools/fix_demo_autofill.mjs)
demo_credentials_project_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if [ -f "$demo_credentials_project_dir/.env" ]; then
  while IFS= read -r demo_credentials_line || [ -n "$demo_credentials_line" ]; do
    case "$demo_credentials_line" in ''|'#'*) continue ;; esac
    demo_credentials_line="${demo_credentials_line#export }"
    demo_credentials_key="${demo_credentials_line%%=*}"
    demo_credentials_value="${demo_credentials_line#*=}"
    case "$demo_credentials_key" in
      NODE_ENV|ENABLE_DEMO_CREDENTIAL_AUTOFILL|DEMO_EMAIL|DEMO_PASSWORD|SEED_ADMIN_EMAIL|SEED_ADMIN_PASSWORD|SEED_USER_EMAIL|SEED_USER_PASSWORD|PROVISION_ADMIN_EMAIL|PROVISION_ADMIN_PASSWORD|BOOTSTRAP_ADMIN_EMAIL|BOOTSTRAP_ADMIN_PASSWORD|ADMIN_EMAIL|ADMIN_PASSWORD|DEFAULT_EMAIL|DEFAULT_PASSWORD|DEMO_TENANT|BOOTSTRAP_TENANT_SLUG|GOVERNANCE_TENANT_ID|TENANT_ID) ;;
      *) continue ;;
    esac
    [ -n "${!demo_credentials_key+x}" ] && continue
    demo_credentials_first="${demo_credentials_value:0:1}"
    demo_credentials_last="${demo_credentials_value: -1}"
    if { [ "$demo_credentials_first" = '"' ] && [ "$demo_credentials_last" = '"' ]; } || { [ "$demo_credentials_first" = "'" ] && [ "$demo_credentials_last" = "'" ]; }; then
      demo_credentials_value="${demo_credentials_value:1:${#demo_credentials_value}-2}"
    fi
    export "$demo_credentials_key=$demo_credentials_value"
  done < "$demo_credentials_project_dir/.env"
fi
demo_credentials_email=""
demo_credentials_password=""
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
demo_credentials_tenant="${DEMO_TENANT:-${BOOTSTRAP_TENANT_SLUG:-${GOVERNANCE_TENANT_ID:-${TENANT_ID:-}}}}"
if [ -n "${PROVISION_ADMIN_EMAIL:-}" ] && [ -n "${PROVISION_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$PROVISION_ADMIN_EMAIL"
  demo_credentials_password="$PROVISION_ADMIN_PASSWORD"
elif [ -n "${BOOTSTRAP_ADMIN_EMAIL:-}" ] && [ -n "${BOOTSTRAP_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$BOOTSTRAP_ADMIN_EMAIL"
  demo_credentials_password="$BOOTSTRAP_ADMIN_PASSWORD"
elif [ -n "${SEED_ADMIN_EMAIL:-}" ] && [ -n "${SEED_ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_ADMIN_EMAIL"
  demo_credentials_password="$SEED_ADMIN_PASSWORD"
elif [ -n "${SEED_USER_EMAIL:-}" ] && [ -n "${SEED_USER_PASSWORD:-}" ]; then
  demo_credentials_email="$SEED_USER_EMAIL"
  demo_credentials_password="$SEED_USER_PASSWORD"
elif [ -n "${DEMO_EMAIL:-}" ] && [ -n "${DEMO_PASSWORD:-}" ]; then
  demo_credentials_email="$DEMO_EMAIL"
  demo_credentials_password="$DEMO_PASSWORD"
elif [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  demo_credentials_email="$ADMIN_EMAIL"
  demo_credentials_password="$ADMIN_PASSWORD"
elif [ -n "${DEFAULT_EMAIL:-}" ] && [ -n "${DEFAULT_PASSWORD:-}" ]; then
  demo_credentials_email="$DEFAULT_EMAIL"
  demo_credentials_password="$DEFAULT_PASSWORD"
fi
if [ "${NODE_ENV:-development}" != production ] && [ "${ENABLE_DEMO_CREDENTIAL_AUTOFILL:-true}" = true ] && [ -n "$demo_credentials_email" ] && [ -n "$demo_credentials_password" ]; then
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export NEXT_PUBLIC_DEMO_EMAIL="$demo_credentials_email"
  export NEXT_PUBLIC_DEMO_PASSWORD="$demo_credentials_password"
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export VITE_DEMO_EMAIL="$demo_credentials_email"
  export VITE_DEMO_PASSWORD="$demo_credentials_password"
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=true
  export REACT_APP_DEMO_EMAIL="$demo_credentials_email"
  export REACT_APP_DEMO_PASSWORD="$demo_credentials_password"
  if [ -n "$demo_credentials_tenant" ]; then
    export NEXT_PUBLIC_DEMO_TENANT="$demo_credentials_tenant"
    export VITE_DEMO_TENANT="$demo_credentials_tenant"
    export REACT_APP_DEMO_TENANT="$demo_credentials_tenant"
  else
    unset NEXT_PUBLIC_DEMO_TENANT VITE_DEMO_TENANT REACT_APP_DEMO_TENANT
  fi
else
  export NEXT_PUBLIC_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export VITE_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  export REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL=false
  unset NEXT_PUBLIC_DEMO_EMAIL NEXT_PUBLIC_DEMO_PASSWORD NEXT_PUBLIC_DEMO_TENANT
  unset VITE_DEMO_EMAIL VITE_DEMO_PASSWORD VITE_DEMO_TENANT
  unset REACT_APP_DEMO_EMAIL REACT_APP_DEMO_PASSWORD REACT_APP_DEMO_TENANT
fi
unset demo_credentials_email demo_credentials_password demo_credentials_tenant demo_credentials_project_dir demo_credentials_line demo_credentials_key demo_credentials_value demo_credentials_first demo_credentials_last

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

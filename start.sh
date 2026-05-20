#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  AI Refugee/Asylum Case Manager - Legal Aid Console ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Load env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

BACKEND_PORT=${BACKEND_PORT:-3085}
FRONTEND_PORT=${FRONTEND_PORT:-3084}

# Kill processes on used ports
echo -e "${YELLOW}Cleaning up ports $BACKEND_PORT and $FRONTEND_PORT...${NC}"
lsof -ti:$BACKEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:$FRONTEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1
echo -e "${GREEN}✓ Ports cleaned${NC}"

# Check PostgreSQL
echo -e "${YELLOW}Checking PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
  echo -e "${RED}PostgreSQL is not installed. Please install it first.${NC}"
  exit 1
fi

if ! pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} > /dev/null 2>&1; then
  echo -e "${YELLOW}Starting PostgreSQL...${NC}"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
  else
    sudo systemctl start postgresql 2>/dev/null || true
  fi
  sleep 2
fi
echo -e "${GREEN}✓ PostgreSQL is running${NC}"

# Create database if not exists
echo -e "${YELLOW}Setting up database...${NC}"
psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} -tc "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME:-refugee_asylum}'" 2>/dev/null | grep -q 1 || \
  psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} -c "CREATE DATABASE ${DB_NAME:-refugee_asylum}" 2>/dev/null || \
  createdb -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} ${DB_NAME:-refugee_asylum} 2>/dev/null || true
echo -e "${GREEN}✓ Database ready${NC}"

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
cd backend && npm install --silent 2>/dev/null && cd ..
cd frontend && npm install --silent 2>/dev/null && cd ..
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Seed database
echo -e "${YELLOW}Seeding database...${NC}"
cd backend && node seed/seed.js && cd ..
echo -e "${GREEN}✓ Database seeded${NC}"

# Start backend with nodemon (auto-reload)
echo -e "${BLUE}Starting backend on port $BACKEND_PORT...${NC}"
(cd backend && npx nodemon server.js) &
BACKEND_PID=$!

sleep 2

# Start frontend (React dev server auto-reloads)
echo -e "${BLUE}Starting frontend on port $FRONTEND_PORT...${NC}"
(cd frontend && BROWSER=none PORT=$FRONTEND_PORT npm start) &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Application is starting...                      ║${NC}"
echo -e "${GREEN}║  Frontend: http://localhost:$FRONTEND_PORT              ║${NC}"
echo -e "${GREEN}║  Backend:  http://localhost:$BACKEND_PORT              ║${NC}"
echo -e "${GREEN}║                                                  ║${NC}"
echo -e "${GREEN}║  Both servers auto-reload on file changes        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Trap to cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  lsof -ti:$BACKEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  lsof -ti:$FRONTEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null || true
  echo -e "${GREEN}✓ Shutdown complete${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

wait

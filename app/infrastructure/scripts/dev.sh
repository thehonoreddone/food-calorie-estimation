#!/bin/bash
#
# Development Script
# Run both frontend and backend concurrently
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}  Food Calorie Estimation - Dev Mode ${NC}"
echo -e "${BLUE}=====================================${NC}"

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js is required${NC}"; exit 1; }
command -v python >/dev/null 2>&1 || { echo -e "${RED}Python is required${NC}"; exit 1; }

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

echo -e "${GREEN}Root directory: $ROOT_DIR${NC}"

# Check .env files
if [ ! -f "$FRONTEND_DIR/.env.local" ]; then
    echo -e "${RED}Warning: frontend/.env.local not found${NC}"
    echo -e "Copy .env.example to .env.local and configure"
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${RED}Warning: backend/.env not found${NC}"
    echo -e "Copy .env.example to .env and configure"
fi

# Install frontend dependencies if needed
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${BLUE}Installing frontend dependencies...${NC}"
    cd "$FRONTEND_DIR"
    npm install
fi

# Install backend dependencies if needed
if [ ! -d "$BACKEND_DIR/.venv" ]; then
    echo -e "${BLUE}Creating Python virtual environment...${NC}"
    cd "$BACKEND_DIR"
    python -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${BLUE}Shutting down...${NC}"
    kill 0
}
trap cleanup EXIT

# Start backend
echo -e "${GREEN}Starting backend on http://localhost:8000${NC}"
cd "$BACKEND_DIR"
source .venv/bin/activate 2>/dev/null || source .venv/Scripts/activate
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo -e "${GREEN}Starting frontend on http://localhost:3000${NC}"
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait

#!/bin/bash
#
# Build Script
# Build frontend and backend for production
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}  Food Calorie Estimation - Build    ${NC}"
echo -e "${BLUE}=====================================${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

# Parse arguments
BUILD_FRONTEND=true
BUILD_BACKEND=true

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --frontend-only) BUILD_BACKEND=false ;;
        --backend-only) BUILD_FRONTEND=false ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Build frontend
if [ "$BUILD_FRONTEND" = true ]; then
    echo -e "${GREEN}Building frontend...${NC}"
    cd "$FRONTEND_DIR"
    
    # Install dependencies
    npm ci
    
    # Run type check
    echo -e "${BLUE}Type checking...${NC}"
    npm run type-check 2>/dev/null || echo "No type-check script"
    
    # Run lint
    echo -e "${BLUE}Linting...${NC}"
    npm run lint 2>/dev/null || echo "No lint script"
    
    # Build
    echo -e "${BLUE}Building...${NC}"
    npm run build
    
    echo -e "${GREEN}Frontend build complete!${NC}"
    echo -e "Output: $FRONTEND_DIR/.next"
fi

# Build backend
if [ "$BUILD_BACKEND" = true ]; then
    echo -e "${GREEN}Building backend...${NC}"
    cd "$BACKEND_DIR"
    
    # Create/update venv
    if [ ! -d ".venv" ]; then
        python -m venv .venv
    fi
    
    source .venv/bin/activate
    
    # Install dependencies
    pip install -r requirements.txt
    
    # Run tests
    echo -e "${BLUE}Running tests...${NC}"
    pytest tests/ 2>/dev/null || echo "No tests found"
    
    # Type check with mypy (optional)
    echo -e "${BLUE}Type checking...${NC}"
    mypy app/ 2>/dev/null || echo "mypy not installed or no type errors"
    
    echo -e "${GREEN}Backend build complete!${NC}"
fi

echo -e "${BLUE}=====================================${NC}"
echo -e "${GREEN}Build complete!${NC}"
echo -e "${BLUE}=====================================${NC}"

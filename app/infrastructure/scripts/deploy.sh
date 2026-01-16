#!/bin/bash
#
# Deploy Script
# Deploy frontend to Vercel, backend to Render/Railway
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}  Food Calorie Estimation - Deploy   ${NC}"
echo -e "${BLUE}=====================================${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

# Parse arguments
DEPLOY_FRONTEND=true
DEPLOY_BACKEND=true
PRODUCTION=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --frontend-only) DEPLOY_BACKEND=false ;;
        --backend-only) DEPLOY_FRONTEND=false ;;
        --production) PRODUCTION=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Deploy frontend to Vercel
if [ "$DEPLOY_FRONTEND" = true ]; then
    echo -e "${GREEN}Deploying frontend to Vercel...${NC}"
    cd "$FRONTEND_DIR"
    
    # Check Vercel CLI
    if ! command -v vercel &> /dev/null; then
        echo -e "${YELLOW}Installing Vercel CLI...${NC}"
        npm i -g vercel
    fi
    
    if [ "$PRODUCTION" = true ]; then
        echo -e "${BLUE}Deploying to production...${NC}"
        vercel --prod
    else
        echo -e "${BLUE}Deploying preview...${NC}"
        vercel
    fi
    
    echo -e "${GREEN}Frontend deployed!${NC}"
fi

# Deploy backend
if [ "$DEPLOY_BACKEND" = true ]; then
    echo -e "${GREEN}Deploying backend...${NC}"
    cd "$BACKEND_DIR"
    
    echo -e "${YELLOW}Backend deployment options:${NC}"
    echo -e "1. Render: Push to GitHub and connect to Render dashboard"
    echo -e "2. Railway: railway up"
    echo -e "3. Fly.io: fly deploy"
    echo -e "4. Docker: docker build -t food-api . && docker push"
    
    # Check for render.yaml
    if [ -f "render.yaml" ]; then
        echo -e "${GREEN}render.yaml found - ready for Render deployment${NC}"
    fi
    
    # Check for railway.toml
    if command -v railway &> /dev/null; then
        echo -e "${BLUE}Railway CLI found. Deploy with: railway up${NC}"
    fi
    
    # Check for fly.toml
    if command -v fly &> /dev/null; then
        echo -e "${BLUE}Fly.io CLI found. Deploy with: fly deploy${NC}"
    fi
fi

echo -e "${BLUE}=====================================${NC}"
echo -e "${GREEN}Deployment script complete!${NC}"
echo -e "${BLUE}=====================================${NC}"

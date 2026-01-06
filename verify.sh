#!/bin/bash

# Sistema Sorveteria - Verification Script
# This script verifies all Docker configurations and CSS stylization

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Sistema Sorveteria - Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Check Docker
echo -e "${BLUE}1. Checking Docker installation...${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker found$(docker --version)${NC}"
else
    echo -e "${RED}✗ Docker not found${NC}"
    exit 1
fi
echo ""

# 2. Check Docker Compose
echo -e "${BLUE}2. Checking Docker Compose...${NC}"
if command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose found$(docker-compose --version)${NC}"
else
    echo -e "${RED}✗ Docker Compose not found${NC}"
    exit 1
fi
echo ""

# 3. Verify file structure
echo -e "${BLUE}3. Verifying project structure...${NC}"
files=(
    "docker-compose.yml"
    "docker-compose.prod.yml"
    "backend/Dockerfile"
    "frontend/Dockerfile"
    "frontend/Dockerfile.prod"
    "backend/entrypoint.sh"
    "backend.env"
    ".env.example"
    "init-docker.sh"
    "DOCKER_SETUP.md"
    "STYLE_GUIDE.md"
    "STYLE_STANDARDIZATION_COMPLETE.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file${NC}"
    else
        echo -e "${RED}✗ $file missing${NC}"
    fi
done
echo ""

# 4. Check CSS files
echo -e "${BLUE}4. Checking CSS files...${NC}"
css_files=(
    "frontend/src/index.css"
    "frontend/src/App.css"
    "frontend/src/pages/LoginPage.css"
    "frontend/src/pages/DashboardPage.css"
    "frontend/src/pages/CustomersPage.css"
    "frontend/src/pages/CashPage.css"
    "frontend/src/pages/LoyaltyPage.css"
    "frontend/src/pages/ComandasPage.css"
    "frontend/src/pages/CouponsPage.css"
    "frontend/src/pages/ReportsPage.css"
    "frontend/src/pages/SettingsPage.css"
    "frontend/src/pages/SalesPage.css"
    "frontend/src/pages/ProductsPage.css"
)

for file in "${css_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file${NC}"
    else
        echo -e "${RED}✗ $file missing${NC}"
    fi
done
echo ""

# 5. Verify CSS variables
echo -e "${BLUE}5. Verifying CSS variables in App.css...${NC}"
if grep -q "color-primary" frontend/src/App.css; then
    echo -e "${GREEN}✓ Primary color variable found${NC}"
else
    echo -e "${RED}✗ Primary color variable missing${NC}"
fi

if grep -q "border-radius" frontend/src/App.css; then
    echo -e "${GREEN}✓ Border radius variables found${NC}"
else
    echo -e "${RED}✗ Border radius variables missing${NC}"
fi

if grep -q "shadow" frontend/src/App.css; then
    echo -e "${GREEN}✓ Shadow variables found${NC}"
else
    echo -e "${RED}✗ Shadow variables missing${NC}"
fi
echo ""

# 6. Check environment variables
echo -e "${BLUE}6. Verifying environment configuration...${NC}"
if [ -f "backend.env" ]; then
    echo -e "${GREEN}✓ backend.env found${NC}"
    if grep -q "DATABASE_URL" backend.env; then
        echo -e "${GREEN}✓ DATABASE_URL configured${NC}"
    fi
    if grep -q "REDIS_HOST" backend.env; then
        echo -e "${GREEN}✓ REDIS_HOST configured${NC}"
    fi
else
    echo -e "${YELLOW}⚠ backend.env not found${NC}"
fi
echo ""

# 7. Check Docker Compose configuration
echo -e "${BLUE}7. Validating docker-compose.yml...${NC}"
if docker-compose config > /dev/null 2>&1; then
    echo -e "${GREEN}✓ docker-compose.yml is valid${NC}"
else
    echo -e "${RED}✗ docker-compose.yml has syntax errors${NC}"
fi
echo ""

# 8. Check volumes configuration
echo -e "${BLUE}8. Verifying volume configurations...${NC}"
if grep -q "volumes:" docker-compose.yml; then
    echo -e "${GREEN}✓ Volumes configured${NC}"
    if grep -q "./frontend:/app" docker-compose.yml; then
        echo -e "${GREEN}✓ Frontend volume mapping found${NC}"
    fi
    if grep -q "./backend:/app" docker-compose.yml; then
        echo -e "${GREEN}✓ Backend volume mapping found${NC}"
    fi
else
    echo -e "${RED}✗ No volumes configured${NC}"
fi
echo ""

# 9. Network configuration
echo -e "${BLUE}9. Checking network configuration...${NC}"
if grep -q "networks:" docker-compose.yml; then
    echo -e "${GREEN}✓ Network configured${NC}"
else
    echo -e "${YELLOW}⚠ No custom network defined${NC}"
fi
echo ""

# 10. Health checks
echo -e "${BLUE}10. Verifying healthcheck configurations...${NC}"
if grep -q "healthcheck:" docker-compose.yml; then
    echo -e "${GREEN}✓ Healthchecks configured${NC}"
else
    echo -e "${YELLOW}⚠ No healthchecks configured${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Verification Complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Run: ./init-docker.sh (Linux/Mac) or .\\init-docker.ps1 (Windows)"
echo "2. Wait for services to start"
echo "3. Access Frontend: http://localhost:5173"
echo "4. Access Backend: http://localhost:3000/api/v1"
echo ""
echo "Documentation:"
echo "  - DOCKER_SETUP.md - Complete Docker setup guide"
echo "  - STYLE_GUIDE.md - CSS design system documentation"
echo "  - STYLE_STANDARDIZATION_COMPLETE.md - Styling changes summary"
echo ""

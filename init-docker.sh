#!/bin/bash
set -e

echo "=================================================="
echo "Sistema Sorveteria - Docker Initialization"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Checking Docker installation...${NC}"
docker --version
docker-compose --version
echo -e "${GREEN}✓ Docker is installed${NC}"
echo ""

echo -e "${BLUE}2. Cleaning up old containers and volumes...${NC}"
docker-compose down -v || echo "No containers to remove"
echo -e "${GREEN}✓ Cleanup done${NC}"
echo ""

echo -e "${BLUE}3. Building images...${NC}"
docker-compose build --no-cache
echo -e "${GREEN}✓ Images built successfully${NC}"
echo ""

echo -e "${BLUE}4. Starting services...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

echo -e "${BLUE}5. Waiting for services to be healthy...${NC}"
sleep 10

# Check if backend is running
echo "Checking backend health..."
for i in {1..30}; do
  if docker exec gelatini-backend curl -s http://localhost:3000/api/v1/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
    break
  fi
  echo "Waiting for backend... ($i/30)"
  sleep 1
done

echo ""
echo -e "${BLUE}6. Displaying service status...${NC}"
docker-compose ps
echo ""

echo "=================================================="
echo -e "${GREEN}System is ready!${NC}"
echo "=================================================="
echo ""
echo "URLs:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3000/api/v1"
echo "  Database: localhost:5432"
echo "  Redis:    localhost:6379"
echo ""
echo "Useful commands:"
echo "  docker-compose logs -f              # Follow all logs"
echo "  docker-compose logs -f frontend     # Frontend logs"
echo "  docker-compose logs -f backend      # Backend logs"
echo "  docker-compose ps                   # Service status"
echo "  docker-compose down                 # Stop all services"
echo ""

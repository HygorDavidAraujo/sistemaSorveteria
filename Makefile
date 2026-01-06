.PHONY: help build up down logs clean restart health test

# Colors
GREEN := \033[0;32m
BLUE := \033[0;34m
RED := \033[0;31m
NC := \033[0m # No Color

help:
	@echo "$(BLUE)=======================================$(NC)"
	@echo "$(BLUE)Sistema Sorveteria - Docker Commands$(NC)"
	@echo "$(BLUE)=======================================$(NC)"
	@echo ""
	@echo "$(GREEN)Development Commands:$(NC)"
	@echo "  make build          Build Docker images"
	@echo "  make up             Start all services"
	@echo "  make down           Stop all services"
	@echo "  make restart        Restart all services"
	@echo "  make logs           Show all logs (live)"
	@echo "  make clean          Remove containers, volumes and images"
	@echo "  make health         Check health of all services"
	@echo ""
	@echo "$(GREEN)Service-specific Commands:$(NC)"
	@echo "  make backend-logs   Show backend logs"
	@echo "  make frontend-logs  Show frontend logs"
	@echo "  make db-logs        Show database logs"
	@echo "  make backend-shell  Access backend container shell"
	@echo "  make frontend-shell Access frontend container shell"
	@echo ""
	@echo "$(GREEN)Database Commands:$(NC)"
	@echo "  make db-seed        Run database seed"
	@echo "  make db-reset       Reset database (remove all data)"
	@echo "  make db-migrate     Run migrations"
	@echo ""
	@echo "$(GREEN)Production Commands:$(NC)"
	@echo "  make build-prod     Build production images"
	@echo "  make up-prod        Start services in production"
	@echo "  make down-prod      Stop production services"
	@echo ""

build:
	@echo "$(BLUE)Building Docker images...$(NC)"
	docker-compose build --no-cache
	@echo "$(GREEN)✓ Build complete$(NC)"

up:
	@echo "$(BLUE)Starting services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✓ Services started$(NC)"
	@echo "Frontend: http://localhost:5173"
	@echo "Backend:  http://localhost:3000/api/v1"

down:
	@echo "$(BLUE)Stopping services...$(NC)"
	docker-compose down
	@echo "$(GREEN)✓ Services stopped$(NC)"

restart:
	@echo "$(BLUE)Restarting services...$(NC)"
	docker-compose restart
	@echo "$(GREEN)✓ Services restarted$(NC)"

logs:
	docker-compose logs -f

backend-logs:
	docker-compose logs -f backend

frontend-logs:
	docker-compose logs -f frontend

db-logs:
	docker-compose logs -f postgres

health:
	@echo "$(BLUE)Checking service health...$(NC)"
	docker-compose ps
	@echo ""
	@echo "$(BLUE)Health checks:$(NC)"
	@echo -n "Backend: "
	@docker exec gelatini-backend curl -s http://localhost:3000/api/v1/health > /dev/null && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"
	@echo -n "Frontend: "
	@docker exec gelatini-frontend wget --quiet --tries=1 --spider http://localhost:5173 2>/dev/null && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"
	@echo -n "Database: "
	@docker exec gelatini-postgres pg_isready -U gelatini > /dev/null 2>&1 && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"
	@echo -n "Redis: "
	@docker exec gelatini-redis redis-cli ping > /dev/null 2>&1 && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"

clean:
	@echo "$(RED)Removing containers, volumes and images...$(NC)"
	docker-compose down -v
	docker image prune -af
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

backend-shell:
	docker-compose exec backend sh

frontend-shell:
	docker-compose exec frontend sh

db-seed:
	@echo "$(BLUE)Running database seed...$(NC)"
	docker-compose exec backend npm run db:seed
	@echo "$(GREEN)✓ Seed complete$(NC)"

db-reset:
	@echo "$(RED)Resetting database...$(NC)"
	docker-compose down -v
	docker-compose up -d postgres
	@sleep 10
	docker-compose exec backend npx prisma db push --accept-data-loss
	@echo "$(GREEN)✓ Database reset complete$(NC)"

db-migrate:
	@echo "$(BLUE)Running migrations...$(NC)"
	docker-compose exec backend npx prisma migrate dev
	@echo "$(GREEN)✓ Migration complete$(NC)"

build-prod:
	@echo "$(BLUE)Building production images...$(NC)"
	docker-compose -f docker-compose.prod.yml build --no-cache
	@echo "$(GREEN)✓ Production build complete$(NC)"

up-prod:
	@echo "$(BLUE)Starting production services...$(NC)"
	docker-compose -f docker-compose.prod.yml up -d
	@echo "$(GREEN)✓ Production services started$(NC)"

down-prod:
	@echo "$(BLUE)Stopping production services...$(NC)"
	docker-compose -f docker-compose.prod.yml down
	@echo "$(GREEN)✓ Production services stopped$(NC)"

test:
	@echo "$(BLUE)Running tests...$(NC)"
	docker-compose exec backend npm run test
	docker-compose exec frontend npm run test
	@echo "$(GREEN)✓ Tests complete$(NC)"

.DEFAULT_GOAL := help

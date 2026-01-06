#!/bin/bash

# GELATINI Docker Helper Script
# Facilita operações comuns com Docker Compose

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de output
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Menu principal
show_menu() {
    echo -e "\n${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     GELATINI - Docker Helper           ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}\n"
    
    echo "Comandos disponíveis:"
    echo "1) Iniciar projeto (docker-compose up -d)"
    echo "2) Parar projeto (docker-compose down)"
    echo "3) Ver logs em tempo real"
    echo "4) Executar migration"
    echo "5) Reset banco de dados"
    echo "6) Terminal do backend"
    echo "7) Terminal do frontend"
    echo "8) Status dos serviços"
    echo "9) Rebuild e iniciar"
    echo "0) Sair"
    echo ""
}

# Comando: Iniciar
start_project() {
    info "Iniciando projeto..."
    docker-compose up -d
    success "Projeto iniciado!"
    echo ""
    echo "Acessar em:"
    echo "  Frontend:  http://localhost:5173"
    echo "  Backend:   http://localhost:3000/api/v1"
    echo "  Database:  localhost:5432"
    echo ""
}

# Comando: Parar
stop_project() {
    info "Parando projeto..."
    docker-compose down
    success "Projeto parado!"
}

# Comando: Logs
view_logs() {
    echo "Qual serviço? (frontend/backend/postgres/redis/all):"
    read service
    
    case $service in
        frontend) docker-compose logs -f frontend ;;
        backend) docker-compose logs -f backend ;;
        postgres) docker-compose logs -f postgres ;;
        redis) docker-compose logs -f redis ;;
        all) docker-compose logs -f ;;
        *) error "Serviço não encontrado" ;;
    esac
}

# Comando: Migration
run_migration() {
    info "Executando migration..."
    docker-compose exec -T backend npx prisma migrate deploy
    success "Migration executada!"
}

# Comando: Reset banco
reset_database() {
    warning "Isso vai APAGAR TODOS OS DADOS do banco!"
    echo "Tem certeza? (s/n)"
    read confirm
    
    if [ "$confirm" = "s" ]; then
        info "Resetando banco..."
        docker-compose exec -T backend npx prisma migrate reset --force
        success "Banco resetado!"
    else
        info "Operação cancelada"
    fi
}

# Comando: Terminal backend
backend_shell() {
    info "Abrindo shell do backend..."
    docker-compose exec backend sh
}

# Comando: Terminal frontend
frontend_shell() {
    info "Abrindo shell do frontend..."
    docker-compose exec frontend sh
}

# Comando: Status
show_status() {
    echo ""
    echo "Status dos serviços:"
    docker-compose ps
    
    echo ""
    echo "Volumes:"
    docker volume ls | grep gelatini
    
    echo ""
    echo "Networks:"
    docker network ls | grep gelatini
}

# Comando: Rebuild
rebuild_and_start() {
    info "Rebuild e iniciar..."
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    success "Projeto reconstruído e iniciado!"
}

# Loop principal
while true; do
    show_menu
    read -p "Escolha uma opção (0-9): " choice
    
    case $choice in
        1) start_project ;;
        2) stop_project ;;
        3) view_logs ;;
        4) run_migration ;;
        5) reset_database ;;
        6) backend_shell ;;
        7) frontend_shell ;;
        8) show_status ;;
        9) rebuild_and_start ;;
        0) 
            info "Saindo..."
            exit 0
            ;;
        *)
            error "Opção inválida!"
            ;;
    esac
done

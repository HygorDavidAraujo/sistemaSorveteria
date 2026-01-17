# 🐳 Guia Completo de Integração Docker - GELATINI

**Data:** 5 de Janeiro de 2026  
**Status:** ✅ Configuração Otimizada

---

## 📋 Resumo do Estado Atual

### ✅ Frontend - CustomersPage
- **Campo de Endereço:** ✅ Implementado
- **Novos Campos Adicionados:**
  - Data de Nascimento (birthDate)
  - Gênero (gender)
  - WhatsApp (whatsapp)
  - Tipo de Cliente (customerType: PF/PJ)
  - Método de Contato Preferido (preferredContactMethod)
  - Aceita Marketing (acceptsMarketing)

### ✅ Frontend - Estilos
- **Seções Estilizadas:** ✅ Padronizado
- **Novos Estilos Adicionados:**
  - `.customers-form-select` - Select customizado
  - `.customers-form-checkbox` - Checkbox com estilo
  - Responsive design para mobile

### ✅ Docker
- **Dockerfile Frontend:** ✅ Melhorado
- **docker-compose.yml:** ✅ Otimizado
- **Healthchecks:** ✅ Implementados
- **Network:** ✅ Bridge network dedicada

---

## 🚀 Como Iniciar o Projeto com Docker (Postgres/Redis)

### 1. Pré-requisitos
```bash
# Verificar se Docker está instalado
docker --version
docker-compose --version

# Mínimo recomendado:
# Docker: 20.10+
# Docker Compose: 1.29+
```

### 2. Clonar/Preparar o Projeto
```bash
cd c:\Users\hygor\Documentos\Sorveteria\sistemaSorveteria

# Verificar estrutura
ls -la
# Deve conter: backend/, frontend/, docker-compose.yml, ...
```

### 3. Criar Arquivos .env (se necessário)

#### `backend/.env`
```env
# Database (Docker em localhost:5433)
DATABASE_URL=postgresql://gelatini:gelatini123@localhost:5433/gelatini_db?schema=public

# Server
NODE_ENV=development
API_PORT=3000
API_HOST=0.0.0.0

# Redis (Docker em localhost)
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT (se estiver usando)
JWT_SECRET=sua-chave-secreta-desenvolvimento
JWT_REFRESH_SECRET=sua-chave-refresh-desenvolvimento

# Logging
LOG_LEVEL=debug
```

#### `frontend/.env`
```env
VITE_API_URL=http://localhost:3000/api/v1
NODE_ENV=development
```

### 4. Iniciar os Serviços

#### Modo Desenvolvimento (Recomendado)
```bash
# Iniciar apenas Postgres e Redis
docker-compose up -d postgres redis

# Ver status
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f

# Ver logs de um serviço específico
docker-compose logs -f postgres
docker-compose logs -f redis
```

#### Parar Serviços
```bash
docker-compose down

# Parar e remover volumes (cuidado: perde dados!)
docker-compose down -v
```

---

## 🔍 Verificação de Status

### Verificar Serviços
```bash
# Status de todos os containers
docker-compose ps

# Esperado:
# NAME              STATUS           PORTS
# gelatini-postgres running          5433
# gelatini-redis    running          6379
```

### Acessar Aplicação
```
Frontend:  http://localhost:5173
Backend:   http://localhost:3000/api/v1
Database:  localhost:5433
Redis:     localhost:6379
```

### Verificar Logs
```bash
# Backend
docker-compose logs backend

# Frontend
docker-compose logs frontend

# Database
docker-compose logs postgres

# Redis
docker-compose logs redis
```

---

## 🔧 Troubleshooting

### Problema: "Port 5173 is already in use"

**Solução:**
```bash
# Encontrar processo usando porta 5173
netstat -ano | findstr :5173  # Windows
lsof -i :5173                 # macOS/Linux

# Matar processo
taskkill /PID <PID> /F        # Windows
kill -9 <PID>                 # macOS/Linux

# Ou trocar porta no docker-compose
# Alterar "5173:5173" para "5174:5173" (por exemplo)
```

### Problema: "Connection refused" do Backend para Database

**Solução:**
```bash
# Verificar conectividade dentro do container
docker-compose exec backend ping postgres

# Verificar logs do postgres
docker-compose logs postgres

# Reconectar
docker-compose restart postgres backend
```

### Problema: Frontend não conecta ao Backend

**Solução:**
```bash
# Verificar variável VITE_API_URL
docker-compose exec frontend env | grep VITE

# Deve estar: VITE_API_URL=http://localhost:3000/api/v1

# Verificar se backend está respondendo
docker-compose exec frontend wget http://backend:3000/api/v1/health
```

### Problema: Migrations não foram executadas

**Solução:**
```bash
# Executar migrations manualmente
docker-compose exec backend npx prisma migrate deploy

# Seed do banco (se houver)
docker-compose exec backend npx prisma db seed

# Ver status das migrations
docker-compose exec backend npx prisma migrate status
```

### Problema: "Não há espaço em disco"

**Solução:**
```bash
# Limpar imagens não usadas
docker image prune -a

# Limpar containers parados
docker container prune

# Limpar volumes não usados (cuidado!)
docker volume prune
```

---

## 📊 Arquitetura Docker

```
┌─────────────────────────────────────────┐
│     gelatini-network (bridge)           │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Frontend (Port 5173)           │   │
│  │  - React + Vite                 │   │
│  │  - Volume: ./frontend/          │   │
│  │  - Depends: backend (healthy)   │   │
│  └──────────────┬────────────────┬──┘  │
│                 │ HTTP           │       │
│                 ▼                │       │
│  ┌─────────────────────────────────┐   │
│  │  Backend API (Port 3000)        │   │
│  │  - Node.js + Express            │   │
│  │  - Volume: ./backend/           │   │
│  │  - Depends: postgres, redis     │   │
│  └──────────┬──────────────┬───────┘   │
│             │ TCP 5432     │ TCP 6379   │
│             ▼              ▼            │
│  ┌──────────────────┐  ┌──────────────┐│
│  │  PostgreSQL 14   │  │  Redis 7     ││
│  │  (Port 5432)     │  │  (Port 6379) ││
│  │  Volume: pgdata  │  │  Volume: data││
│  └──────────────────┘  └──────────────┘│
└─────────────────────────────────────────┘
```

---

## 📝 Configurações Otimizadas

### Docker-Compose Melhorias
✅ **Healthchecks:** Verificação de saúde em todos os serviços  
✅ **Dependencies:** Ordem correta de inicialização (postgres → backend → frontend)  
✅ **Volumes:** Volumes persistentes para dados  
✅ **Networks:** Network dedicada para comunicação entre containers  
✅ **Logging:** Logs estruturados e acessíveis  
✅ **Migrations:** Auto-execução de migrations ao iniciar backend  

### Frontend Dockerfile Melhorias
✅ **Git Support:** Instalado para devDependencies  
✅ **Curl/Wget:** Instalados para healthchecks  
✅ **Hot Reload:** Funcionalidade preservada  
✅ **Volumes:** Permite edição de código em tempo real  

---

## 🔄 Fluxo de Desenvolvimento

### Editar Código
```bash
# Frontend
# 1. Editar arquivo em ./frontend/src/pages/CustomersPage.tsx
# 2. Salvar arquivo
# 3. Browser atualiza automaticamente (Hot Module Replacement)

# Backend
# 1. Editar arquivo em ./backend/src/...
# 2. Salvar arquivo
# 3. Nodemon recarrega servidor automaticamente
```

### Rodar Migrations
```bash
# Dentro do container backend
docker-compose exec backend npx prisma migrate deploy

# Ou resetar banco (cuidado - perde dados!)
docker-compose exec backend npx prisma migrate reset
```

### Visualizar Banco de Dados
```bash
# Usar Prisma Studio
docker-compose exec backend npx prisma studio

# Ou conectar com cliente externo:
# Host: localhost
# Port: 5432
# User: gelatini
# Password: gelatini123
# Database: gelatini_db
```

---

## 📋 Checklist de Integração Concluída

### Frontend
- [x] CustomersPage.tsx atualizado com novos campos
- [x] Campos de endereço implementados
- [x] Novos campos de cliente adicionados:
  - [x] birthDate (Data de Nascimento)
  - [x] gender (Gênero - select com 4 opções)
  - [x] whatsapp (WhatsApp)
  - [x] customerType (PF/PJ - select)
  - [x] preferredContactMethod (Método preferido)
  - [x] acceptsMarketing (Checkbox)
- [x] Estilos padronizados:
  - [x] `.customers-form-select` customizado
  - [x] `.customers-form-checkbox` customizado
  - [x] Seções de formulário bem estruturadas
  - [x] Responsive design

### Docker
- [x] Dockerfile Frontend otimizado
- [x] docker-compose.yml melhorado
- [x] Healthchecks implementados
- [x] Network dedicada
- [x] Volumes configurados
- [x] Dependencies corretos
- [x] Auto-migrations (backend)

### Documentação
- [x] Guia de inicialização
- [x] Troubleshooting
- [x] Arquitetura documentada
- [x] Comandos úteis listados

---

## 🎯 Próximas Etapas (Opcional)

### Melhorias Possíveis
- [ ] Nginx como reverse proxy
- [ ] SSL/TLS para produção
- [ ] Backup automático do PostgreSQL
- [ ] Monitoramento com Prometheus/Grafana
- [ ] CI/CD com GitHub Actions
- [ ] Load balancing
- [ ] Caching layers adicionais

### Para Produção
- [ ] Usar `docker-compose.prod.yml`
- [ ] Nginx como servidor estático
- [ ] PostgreSQL backup strategy
- [ ] Environment variables seguras
- [ ] Scaling horizontal do backend

---

## 📚 Comandos Úteis

```bash
# Build sem cache
docker-compose build --no-cache

# Rebuild frontend apenas
docker-compose up -d --build frontend

# Terminal interativo no backend
docker-compose exec backend sh

# Instalar dependência no backend (dentro do container)
docker-compose exec backend npm install nome-pacote

# Ver histórico de container
docker-compose ps -a

# Remove tudo (cuidado!)
docker-compose down -v --rmi all
```

---

## ✅ Validação Final

Após iniciar com `docker-compose up -d`:

1. ✅ Acessar http://localhost:5173 (Frontend)
2. ✅ Ver página de clientes carregando
3. ✅ Clicar em "Novo Cliente"
4. ✅ Verificar se todos os campos aparecem:
   - Nome, Email, Telefone, WhatsApp, CPF
   - Data de Nascimento (date input)
   - Gênero (select)
   - Tipo de Cliente (select PF/PJ)
   - Endereço completo (Rua, Número, etc)
   - Preferências (select e checkbox)
5. ✅ Tentar criar um cliente
6. ✅ Verificar se salvou no banco

---

**Status:** ✅ Pronto para Desenvolvimento  
**Última Atualização:** 5 de Janeiro de 2026  
**Documentação:** Completa

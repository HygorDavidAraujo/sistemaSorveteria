# 🐳 Docker Setup - Sistema Sorveteria

## Pré-requisitos

- Docker Desktop instalado (Windows/Mac) ou Docker + Docker Compose (Linux)
- Mínimo 4GB de RAM disponível
- Portas 5173 (Frontend), 3000 (Backend), 5432 (DB), 6379 (Redis) livres

## 📋 Arquitetura

```
┌─────────────────────────────────────────┐
│         Docker Compose Stack            │
├─────────────────────────────────────────┤
│ Frontend (React + Vite) - :5173        │
│ Backend (Node.js) - :3000              │
│ PostgreSQL - :5432                      │
│ Redis - :6379                           │
└─────────────────────────────────────────┘
```

## 🚀 Quick Start (Windows)

### Opção 1: PowerShell (Recomendado)

```powershell
# Executar script de inicialização
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\init-docker.ps1
```

### Opção 2: Comando Manual

```powershell
# Construir imagens
docker-compose build --no-cache

# Iniciar containers
docker-compose up -d

# Verificar status
docker-compose ps
```

## 🚀 Quick Start (Linux/Mac)

```bash
# Dar permissão ao script
chmod +x init-docker.sh

# Executar script
./init-docker.sh
```

## 📡 Acessar Serviços

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api/v1
- **PostgreSQL**: localhost:5432
  - User: `gelatini`
  - Password: `gelatini123`
  - Database: `gelatini_db`
- **Redis**: localhost:6379

## 📊 Logs

```bash
# Ver todos os logs em tempo real
docker-compose logs -f

# Ver logs apenas do frontend
docker-compose logs -f frontend

# Ver logs apenas do backend
docker-compose logs -f backend

# Ver logs apenas do banco
docker-compose logs -f postgres
```

## 🛠️ Gerenciamento de Containers

```bash
# Ver status dos containers
docker-compose ps

# Parar todos os containers
docker-compose stop

# Parar e remover containers
docker-compose down

# Parar, remover containers e volumes
docker-compose down -v

# Reiniciar um container específico
docker-compose restart backend

# Executar comando dentro de um container
docker-compose exec backend npm run db:seed
docker-compose exec frontend npm run build
```

## 🔧 Desenvolvimento

### Fazer mudanças no Frontend

Os arquivos CSS e código TypeScript estão mapeados via volume, então mudanças são refletidas automaticamente:

```
./frontend/src → /app/src (inside container)
```

Apenas reinicie o container se necessário:

```bash
docker-compose restart frontend
```

### Fazer mudanças no Backend

Similarmente, mudanças no backend são refletidas:

```
./backend/src → /app/src (inside container)
```

Reiniciar:

```bash
docker-compose restart backend
```

## 🐛 Troubleshooting

### Frontend não carrega

1. Verifique se o backend está rodando:
   ```bash
   docker-compose logs backend
   ```

2. Limpe cache e reinicie:
   ```bash
   docker-compose down -v
   docker-compose up -d frontend backend
   ```

### Erro de conexão com banco de dados

1. Verifique se o PostgreSQL está saudável:
   ```bash
   docker-compose logs postgres
   ```

2. Aguarde mais tempo para o banco inicializar:
   ```bash
   docker-compose restart backend
   ```

### Porta já em uso

Se uma porta está em uso, altere em `docker-compose.yml`:

```yaml
ports:
  - "5173:5173"  # Frontend - mudar primeira porta
  - "3000:3000"  # Backend - mudar primeira porta
  - "5432:5432"  # Postgres - mudar primeira porta
  - "6379:6379"  # Redis - mudar primeira porta
```

### Rebuild das imagens

```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## 📦 Estrutura de Volumes

```yaml
volumes:
  postgres_data:      # Dados do banco (persiste)
  redis_data:         # Dados do Redis (persiste)
  ./frontend:/app     # Código do frontend (desenvolvimento)
  ./backend:/app      # Código do backend (desenvolvimento)
```

## 🔐 Segurança (Produção)

Para produção, altere em `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - POSTGRES_PASSWORD=senhaForte123!@#
```

Remova volumes de desenvolvimento:

```yaml
# Remova:
volumes:
  - ./frontend:/app
  - ./backend:/app
```

## 📈 Performance

Para melhor performance:

1. **Aumentar recursos do Docker**:
   - Docker Desktop: Settings → Resources → Aumentar CPUs e Memory

2. **Usar mode production**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Verificar uso de recursos**:
   ```bash
   docker stats
   ```

## 🧹 Limpeza Completa

```bash
# Remover containers, redes, volumes e imagens
docker-compose down -v
docker image prune -a
docker network prune
docker volume prune
```

## ✅ Checklist de Setup

- [ ] Docker instalado
- [ ] Portas 5173, 3000, 5432, 6379 livres
- [ ] Backend buildado e rodando
- [ ] Frontend buildado e rodando
- [ ] PostgreSQL inicializado
- [ ] Redis funcionando
- [ ] Estilos CSS carregados corretamente
- [ ] Banco de dados com dados de seed

## 📝 Notas Importantes

1. **Hot Reload**: Mudanças em arquivos são refletidas automaticamente via nodemon (backend) e Vite (frontend)

2. **Volumes**: Os arquivos CSS estão sincronizados via volumes do Docker, garantindo que todas as estilizações sejam aplicadas

3. **Database**: Dados persistem em `postgres_data` volume. Use `docker-compose down -v` para limpar

4. **Logs**: Use `docker-compose logs -f` para debugging em tempo real

## 📚 Recursos Adicionais

- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Docker Guide](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

---

**Status**: ✅ Docker configurado com volumes sincronizados para desenvolvimento
**Última atualização**: 05/01/2026

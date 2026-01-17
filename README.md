# 🍦 GELATINI - Sistema de Gestão Comercial

Sistema completo de gerenciamento para sorveteria e minimarket, com foco em PDV, comandas, delivery, controle financeiro e DRE.

---

## 📋 Índice

- [Características](#características)
- [Requisitos](#requisitos)
- [Instalação e Configuração](#instalação-e-configuração)
- [Uso](#uso)
- [Módulos](#módulos)
- [API Endpoints](#api-endpoints)
- [Arquitetura](#arquitetura)
- [Contribuindo](#contribuindo)

---

## ✨ Características

### Core Features

✅ **Implementado**
- 🔐 **Autenticação e Autorização** - JWT, 3 níveis de acesso (Admin, Manager, Cashier)
- 👥 **Gestão de Clientes** - Cadastro completo com busca fuzzy, endereços, histórico
- 📦 **Gestão de Produtos** - Venda por unidade e peso, categorias, controle de estoque
- 🛒 **PDV (Ponto de Venda)** - Interface rápida para vendas no balcão
- 📋 **Comandas** - Gestão de consumo local com abertura/fechamento
- 🚚 **Delivery** - Pedidos com tracking de status
- 🎁 **Programa de Fidelidade** - Pontos, recompensas, histórico
- 💰 **Controle de Caixa** - Abertura/fechamento em dois níveis (operador + gerente)
- 💵 **Financeiro** - Contas a pagar/receber, fluxo de caixa
- 📊 **DRE** - Demonstração do Resultado do Exercício automática
- 📈 **Dashboard** - KPIs em tempo real, gráficos, relatórios
- 🔍 **Auditoria Completa** - Log de todas as ações críticas
- ⚖️ **Integração com Balança** - Toledo Prix 3 Fit (preparado)

🚧 **Em Desenvolvimento**
- Interface do usuário (React)
- Relatórios avançados
- Backup automático
- App mobile (PWA)

---

## 🔧 Requisitos

### Desenvolvimento
- **Node.js** 18+ e npm 9+
- **PostgreSQL** 14+
- **Redis** 7+ (opcional, para cache)
- **Docker & Docker Compose** (recomendado)

### Produção
- VPS ou Cloud com 2GB+ RAM
- PostgreSQL gerenciado ou self-hosted
- SSL/HTTPS configurado
- Backup diário automatizado

---

## 🚀 Instalação e Configuração

### Opção 1: Postgres/Redis no Docker + Backend/Frontend local (Recomendado)

```bash
# Clone o repositório
git clone <repo-url>
cd sistemaSorveteria

# Inicie apenas Postgres e Redis
docker-compose up -d postgres redis

# Backend (local)
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev

# Frontend (local)
cd ../frontend
npm install
npm run dev
```

Acesse:
- **API**: http://localhost:3000/api/v1
- **Frontend**: http://localhost:5173
- **PostgreSQL**: localhost:5433
- **Redis**: localhost:6379

### Opção 2: Instalação Manual (Tudo local, sem Docker)

#### 1. PostgreSQL

```bash
# Instale o PostgreSQL 14+
# Windows: https://www.postgresql.org/download/windows/
# Crie o banco de dados
createdb gelatini_db
```

#### 2. Backend

```bash
cd backend

# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env
# Edite o .env com suas configurações

# Gere o Prisma Client
npm run db:generate

# Execute as migrations
npm run db:migrate

# Popule o banco
npm run db:seed

# Inicie o servidor
npm run dev
```

#### 3. Frontend (quando disponível)

```bash
cd frontend

# Instale as dependências
npm install

# Configure o ambiente
cp .env.example .env

# Inicie o dev server
npm run dev
```

---

## 🎯 Uso

### Credenciais Padrão

Após executar o seed:

```
E-mail: login
Senha: login
```

**⚠️ IMPORTANTE:** Altere essas credenciais imediatamente em produção!

### Fluxo Básico de Operação

#### 1. Abertura de Caixa
```
POST /api/v1/cash-sessions
{
  "terminalId": "CAIXA-01",
  "initialCash": 100.00,
  "openingNotes": "Troco inicial"
}
```

#### 2. Venda no PDV
```
POST /api/v1/sales
{
  "cashSessionId": "uuid",
  "customerId": "uuid" (opcional),
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "unitPrice": 12.00
    }
  ],
  "payments": [
    {
      "method": "cash",
      "amount": 24.00
    }
  ]
}
```

#### 3. Abrir Comanda
```
POST /api/v1/comandas
{
  "comandaNumber": 15,
  "tableNumber": "5",
  "cashSessionId": "uuid"
}
```

#### 4. Fechamento de Caixa (Operador)
```
POST /api/v1/cash-sessions/:id/cashier-close
{
  "cashCount": 450.00,
  "notes": "Movimento normal"
}
```

#### 5. Validação Gerencial
```
POST /api/v1/cash-sessions/:id/manager-close
{
  "validated": true,
  "notes": "Conferido e aprovado"
}
```

---

## 📦 Módulos

### 1. Autenticação (`/auth`)
- Login/Logout
- Refresh token
- Controle de sessão
- 3 níveis de permissão

### 2. Clientes (`/customers`)
- CRUD completo
- Busca fuzzy (nome, telefone, CPF)
- Múltiplos endereços
- Histórico de compras
- Saldo de pontos

### 3. Produtos (`/products`)
- Categorização
- Venda por unidade ou peso (kg)
- Controle de custo (CPV)
- Estoque opcional
- Elegibilidade para fidelidade

### 4. PDV (`/sales`)
- Venda rápida
- Múltiplas formas de pagamento
- Vinculação de cliente
- Aplicação/resgate de pontos
- Impressão de cupom

### 5. Comandas (`/comandas`)
- Abertura por número/mesa
- Adição de itens em tempo real
- Impressão de pré-conta
- Fechamento com pagamento

### 6. Delivery (`/delivery`)
- Criação de pedidos
- Status tracking
- Cálculo de taxa por região
- Histórico por cliente

### 7. Caixa (`/cash-sessions`)
- Abertura obrigatória
- Fechamento em dois níveis
- Conferência de valores
- Justificativa de diferenças
- Relatórios detalhados

### 8. Financeiro (`/financial`)
- Contas a pagar
- Contas a receber
- Categorização (Receita/Custo/Despesa)
- Fluxo de caixa
- Integração com DRE

### 9. DRE (`/dre`)
- Geração automática por período
- Estrutura contábil completa:
  - Receita Bruta
  - (-) Cancelamentos
  - (=) Receita Líquida
  - (-) CPV
  - (=) Lucro Bruto
  - (-) Despesas
  - (=) Lucro Líquido
- Comparativo de períodos
- Export PDF/Excel

### 10. Dashboard (`/dashboard`)
- KPIs em tempo real
- Gráficos interativos
- Top produtos
- Top clientes
- Resumo financeiro

### 11. Fidelidade (`/loyalty`)
- Configuração de regras
- Catálogo de recompensas
- Acúmulo automático
- Resgate em vendas
- Histórico completo

---

## 🌐 API Endpoints

### Autenticação
```
POST   /api/v1/auth/login
POST   /api/v1/auth/register (admin only)
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
```

### Clientes
```
GET    /api/v1/customers/search?search=nome
GET    /api/v1/customers/top
GET    /api/v1/customers/:id
GET    /api/v1/customers/:id/loyalty
POST   /api/v1/customers
PUT    /api/v1/customers/:id
POST   /api/v1/customers/:id/addresses
PUT    /api/v1/customers/addresses/:addressId
DELETE /api/v1/customers/addresses/:addressId
```

### Produtos
```
GET    /api/v1/products
GET    /api/v1/products/:id
POST   /api/v1/products
PUT    /api/v1/products/:id
DELETE /api/v1/products/:id
GET    /api/v1/products/categories
```

### PDV
```
POST   /api/v1/sales
GET    /api/v1/sales/:id
POST   /api/v1/sales/:id/reopen (manager)
POST   /api/v1/sales/:id/cancel (manager)
GET    /api/v1/sales/report
```

### Comandas
```
POST   /api/v1/comandas
GET    /api/v1/comandas/:id
POST   /api/v1/comandas/:id/items
DELETE /api/v1/comandas/:id/items/:itemId
POST   /api/v1/comandas/:id/close
```

### Caixa
```
POST   /api/v1/cash-sessions (abrir)
GET    /api/v1/cash-sessions/current
POST   /api/v1/cash-sessions/:id/cashier-close
POST   /api/v1/cash-sessions/:id/manager-close (manager)
GET    /api/v1/cash-sessions/:id/report
```

### Financeiro
```
GET    /api/v1/financial/transactions
POST   /api/v1/financial/transactions
GET    /api/v1/financial/accounts-payable
GET    /api/v1/financial/accounts-receivable
GET    /api/v1/financial/cash-flow
```

### DRE
```
GET    /api/v1/dre?startDate=2026-01-01&endDate=2026-01-31
GET    /api/v1/dre/export/pdf
GET    /api/v1/dre/export/excel
```

### Dashboard
```
GET    /api/v1/dashboard/summary
GET    /api/v1/dashboard/sales-chart
GET    /api/v1/dashboard/top-products
GET    /api/v1/dashboard/top-customers
```

---

## 🏗️ Arquitetura

### Clean Architecture

```
presentation/     → Controllers, Routes, Validators
    ↓
application/      → Use Cases, Business Logic
    ↓
domain/           → Entities, Business Rules
    ↓
infrastructure/   → Database, External Services
```

### Tecnologias

**Backend**
- Node.js + TypeScript
- Express.js (REST API)
- Prisma ORM
- PostgreSQL
- JWT (autenticação)
- Winston (logging)

**Frontend** (em desenvolvimento)
- React 18 + TypeScript
- Vite
- TailwindCSS
- TanStack Query
- Zustand

**DevOps**
- Docker & Docker Compose
- NGINX (reverse proxy)
- PostgreSQL (database)
- Redis (cache)

---

## 🗄️ Estrutura do Banco de Dados

Ver arquivo: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

Principais tabelas:
- `users` - Usuários do sistema
- `customers` - Clientes
- `products` - Produtos
- `cash_sessions` - Sessões de caixa
- `sales` - Vendas (PDV)
- `sale_items` - Itens de venda
- `comandas` - Comandas (tabs)
- `delivery_orders` - Pedidos delivery
- `financial_transactions` - Transações financeiras
- `loyalty_transactions` - Transações de fidelidade
- `audit_logs` - Log de auditoria

---

## 🔒 Segurança

- ✅ Senhas com bcrypt (hash + salt)
- ✅ JWT com refresh token
- ✅ Rate limiting
- ✅ Helmet (security headers)
- ✅ CORS configurado
- ✅ Validação de entrada (Joi)
- ✅ SQL Injection protection (Prisma)
- ✅ Auditoria completa
- ✅ Controle de acesso baseado em roles

---

## 📊 Relatórios

### DRE (Demonstração do Resultado)

Estrutura completa:

```
RECEITA BRUTA               R$ 50.000,00
  Vendas PDV                R$ 35.000,00
  Comandas                  R$ 10.000,00
  Delivery                  R$  5.000,00

(-) Cancelamentos           R$    500,00
(=) RECEITA LÍQUIDA         R$ 49.500,00

CUSTOS
  CPV                       R$ 18.000,00
  Taxas de Cartão           R$  1.500,00
  Total Custos              R$ 19.500,00

(=) LUCRO BRUTO             R$ 30.000,00

DESPESAS OPERACIONAIS
  Despesas Fixas            R$ 12.000,00
    Aluguel                 R$  5.000,00
    Salários                R$  6.000,00
    Outros                  R$  1.000,00
  
  Despesas Variáveis        R$  3.000,00
    Embalagens              R$  1.500,00
    Marketing               R$    800,00
    Outros                  R$    700,00

  Total Despesas            R$ 15.000,00

(=) LUCRO LÍQUIDO           R$ 15.000,00

Margem Bruta: 60,6%
Margem Líquida: 30,3%
```

---

## 🧪 Testes

```bash
# Executar testes
npm test

# Executar com coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## 📝 Logs

Logs são armazenados em `backend/logs/`:
- `error-YYYY-MM-DD.log` - Erros
- `combined-YYYY-MM-DD.log` - Todos os logs

Rotação automática diária, mantém 30 dias.

---

## 🔄 Backup

### Backup Manual

```bash
# Backup do banco
pg_dump -U gelatini gelatini_db > backup_$(date +%Y%m%d).sql

# Restore
psql -U gelatini gelatini_db < backup_20260101.sql
```

### Backup Automatizado (recomendado para produção)

Configure um cron job:

```bash
0 2 * * * /path/to/backup-script.sh
```

---

## 🚀 Deploy em Produção

### 1. Preparação

```bash
# Build do backend
cd backend
npm run build

# Build do frontend
cd ../frontend
npm run build
```

### 2. Variáveis de Ambiente (Produção)

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
CORS_ORIGIN=https://seudominio.com
```

### 3. NGINX (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name seudominio.com;
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location / {
        root /var/www/gelatini/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. PM2 (Process Manager)

```bash
npm install -g pm2

# Start
pm2 start dist/index.js --name gelatini-api

# Monitoramento
pm2 monit

# Logs
pm2 logs gelatini-api
```

### 5. SSL/HTTPS (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com
```

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

---

## 📄 Licença

MIT License - veja [LICENSE](./LICENSE) para detalhes.

---

## 👥 Suporte

Para suporte, entre em contato:
- Email: suporte@gelatini.com
- Issues: [GitHub Issues](https://github.com/seu-repo/issues)

---

## 🗺️ Roadmap

### v1.0 (Atual)
- ✅ Backend API completo
- ✅ Autenticação e autorização
- ✅ PDV, Comandas, Delivery
- ✅ Controle de caixa
- ✅ Financeiro e DRE
- ✅ Dashboard básico

### v1.1 (Próximo)
- 🚧 Interface do usuário (React)
- 🚧 Impressão térmica
- 🚧 Integração com balança Toledo
- 🚧 Relatórios avançados (PDF/Excel)

### v2.0 (Futuro)
- 📱 App mobile (PWA)
- 🏪 Multi-loja (multi-tenant)
- 📊 BI e analytics avançados
- 🔗 Integrações (Mercado Pago, iFood, etc)
- 📦 Controle de estoque avançado
- 👥 CRM integrado

---

**Desenvolvido com ❤️ para GELATINI**

Versão 1.0 - Janeiro 2026

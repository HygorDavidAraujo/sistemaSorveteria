# GELATINI - Sistema de Gestão Comercial
## Arquitetura do Sistema v1.0

---

## 📋 VISÃO GERAL

Sistema ERP/PDV completo para gestão de sorveteria e minimarket, com arquitetura modular, escalável e auditável.

### Stack Tecnológica

**Backend:**
- Node.js 18+ com TypeScript
- Express.js (API REST)
- PostgreSQL 14+ (banco de dados relacional)
- Prisma ORM (type-safe database access)
- JWT (autenticação)
- Winston (logging)

**Frontend:**
- React 18+ com TypeScript
- Vite (build tool)
- TanStack Query (data fetching)
- Zustand (state management)
- TailwindCSS (styling)
- shadcn/ui (component library)

**Infraestrutura:**
- Docker & Docker Compose
- NGINX (reverse proxy)
- Redis (cache e sessões)

---

## 🏗️ ARQUITETURA

### Clean Architecture em Camadas

```
┌─────────────────────────────────────────────────────┐
│                    PRESENTATION                      │
│              (API Routes, Controllers)               │
├─────────────────────────────────────────────────────┤
│                   APPLICATION                        │
│           (Use Cases, Business Logic)                │
├─────────────────────────────────────────────────────┤
│                     DOMAIN                           │
│          (Entities, Business Rules)                  │
├─────────────────────────────────────────────────────┤
│                 INFRASTRUCTURE                       │
│      (Database, External Services, Cache)            │
└─────────────────────────────────────────────────────┘
```

### Estrutura de Pastas

```
sistemaSorveteria/
├── backend/
│   ├── src/
│   │   ├── domain/              # Entidades e regras de negócio
│   │   │   ├── entities/
│   │   │   ├── repositories/    # Interfaces dos repositórios
│   │   │   └── services/        # Serviços de domínio
│   │   ├── application/         # Casos de uso
│   │   │   ├── use-cases/
│   │   │   └── dtos/
│   │   ├── infrastructure/      # Implementações técnicas
│   │   │   ├── database/
│   │   │   │   ├── prisma/
│   │   │   │   └── repositories/
│   │   │   ├── cache/
│   │   │   ├── integrations/    # Toledo Scale, Payment Gateway
│   │   │   └── queue/
│   │   ├── presentation/        # Camada de apresentação
│   │   │   ├── http/
│   │   │   │   ├── controllers/
│   │   │   │   ├── routes/
│   │   │   │   └── middlewares/
│   │   │   └── validators/
│   │   ├── shared/              # Código compartilhado
│   │   │   ├── errors/
│   │   │   ├── utils/
│   │   │   └── constants/
│   │   └── index.ts
│   ├── tests/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/          # Componentes React
│   │   │   ├── ui/              # Componentes base (shadcn)
│   │   │   ├── pdv/
│   │   │   ├── comandas/
│   │   │   ├── customers/
│   │   │   └── dashboard/
│   │   ├── pages/               # Páginas da aplicação
│   │   ├── hooks/               # Custom hooks
│   │   ├── services/            # API clients
│   │   ├── stores/              # Zustand stores
│   │   ├── types/               # TypeScript types
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
└── README.md
```

---

## 📊 MODELO DE DADOS

### Principais Entidades

#### 1. **Usuários e Autenticação**
- `users` - Usuários do sistema
- `roles` - Perfis (admin, manager, cashier)
- `permissions` - Permissões específicas
- `audit_logs` - Log completo de ações

#### 2. **Clientes**
- `customers` - Cadastro de clientes
- `customer_addresses` - Endereços para delivery
- `loyalty_points` - Saldo e histórico de pontos
- `loyalty_transactions` - Transações de pontos

#### 3. **Produtos**
- `products` - Cadastro de produtos
- `categories` - Categorias
- `product_costs` - Histórico de custos (CPV)

#### 4. **Vendas**
- `cash_sessions` - Aberturas/fechamentos de caixa
- `sales` - Vendas (PDV, comanda, delivery)
- `sale_items` - Itens da venda
- `payments` - Pagamentos recebidos
- `sale_adjustments` - Ajustes/reaberturas

#### 5. **Comandas**
- `comandas` - Comandas abertas/fechadas
- `comanda_items` - Itens da comanda
- `comanda_payments` - Pagamentos

#### 6. **Delivery**
- `delivery_orders` - Pedidos de delivery
- `delivery_fees` - Configuração de taxas

#### 7. **Financeiro**
- `financial_transactions` - Todas transações financeiras
- `financial_categories` - Categorias (receita/custo/despesa)
- `accounts_payable` - Contas a pagar
- `accounts_receivable` - Contas a receber

#### 8. **Programa de Fidelidade**
- `loyalty_config` - Configurações do programa
- `loyalty_rewards` - Catálogo de recompensas
- `loyalty_redemptions` - Histórico de resgates

---

## 🔐 AUTENTICAÇÃO E AUTORIZAÇÃO

### Perfis de Usuário

**ADMIN**
- Acesso total ao sistema
- Configurações globais
- DRE e relatórios financeiros
- Gestão de usuários

**MANAGER**
- Fechamento de caixa gerencial
- Relatórios completos
- DRE (somente leitura)
- Gestão de produtos, clientes
- Reabertura de vendas

**CASHIER**
- PDV, Comandas, Delivery
- Abertura de caixa
- Fechamento de caixa (nível operador)
- Consulta básica de clientes

### Fluxo de Autenticação

1. Login → JWT Token (access + refresh)
2. Middleware valida token em cada request
3. Permissions checked per endpoint
4. Audit log em ações críticas

---

## 💰 CONTROLE DE CAIXA (DOIS NÍVEIS)

### Nível 1: Fechamento do Operador
- Contagem de dinheiro
- Conferência por forma de pagamento
- Justificativa de diferenças
- **SEM** acesso a margens, custos, DRE

### Nível 2: Fechamento Gerencial
- Validação do fechamento do operador
- Revisão de cancelamentos e ajustes
- Análise de rentabilidade
- Auditoria completa
- Exportação de relatórios

---

## 📈 DRE (DEMONSTRAÇÃO DO RESULTADO)

### Estrutura Contábil

```
RECEITA BRUTA
  + Vendas PDV
  + Comandas
  + Delivery
(-) Cancelamentos e Descontos
(=) RECEITA LÍQUIDA

CUSTOS
  + CPV (Custo dos Produtos Vendidos)
  + Taxas de cartão/gateway
(=) LUCRO BRUTO

DESPESAS OPERACIONAIS
  + Despesas Fixas (aluguel, salários)
  + Despesas Variáveis (embalagens, delivery)
(=) RESULTADO OPERACIONAL

(=) LUCRO LÍQUIDO
```

### Geração Automática
- Consolidação automática de transações
- Classificação por categoria financeira
- Cálculo de CPV baseado em custo médio
- Ajustes manuais permitidos (auditados)
- Exportação PDF/Excel

---

## 🎯 FLUXOS PRINCIPAIS

### 1. Venda no PDV
```
1. Operador abre caixa (obrigatório)
2. Adiciona produtos à venda
3. (Opcional) Vincula cliente
4. (Opcional) Aplica pontos de fidelidade
5. Finaliza pagamento
6. Imprime cupom
7. Registra pontos ganhos
8. Atualiza financeiro automaticamente
```

### 2. Comanda (Consumo Local)
```
1. Abre comanda (número/mesa/nome)
2. Adiciona itens durante consumo
3. (Opcional) Vincula cliente
4. Imprime pré-conta (parcial)
5. Finaliza e imprime conta final
6. Registra pagamento
7. Fecha comanda
8. Registra pontos (se cliente vinculado)
```

### 3. Delivery
```
1. Cria pedido de delivery
2. Vincula cliente (obrigatório)
3. Adiciona produtos
4. Adiciona taxa de entrega
5. Status: Recebido → Preparando → Saiu → Finalizado
6. Finaliza pagamento
7. Registra pontos
```

### 4. Integração com Balança Toledo
```
1. Produto tipo "peso" selecionado no PDV
2. Sistema conecta via Serial/USB
3. Lê peso em tempo real
4. Calcula valor (peso × preço/kg)
5. Adiciona à venda
6. Tratamento de erros e reconexão
```

---

## 📊 DASHBOARD E INDICADORES

### KPIs em Tempo Real
- Faturamento (dia/semana/mês)
- Lucro bruto e líquido
- Ticket médio
- Produtos mais vendidos
- Melhores clientes
- Taxa de conversão de pontos
- Status de caixa

### Relatórios
- DRE por período
- Fluxo de caixa
- Comparativo de períodos
- Análise ABC de produtos
- Ranking de clientes

---

## 🔍 AUDITORIA E RASTREABILIDADE

### Eventos Auditados
- Login/Logout
- Abertura/Fechamento de caixa
- Vendas e cancelamentos
- Reabertura de vendas
- Ajustes financeiros
- Alterações de configuração
- Alterações em DRE

### Informações do Log
- Timestamp
- Usuário
- Ação
- Entidade afetada
- Valores antes/depois
- IP/Device
- Justificativa (quando aplicável)

---

## 🚀 ESCALABILIDADE

### Preparado para:
- Multi-loja (tenant isolation)
- Alta concorrência (Redis cache)
- Integrações externas (API Gateway)
- Migração para microserviços
- PWA/Mobile (API-first design)

---

## 📦 DEPLOYMENT

### Docker Compose (Desenvolvimento)
```yaml
services:
  - postgres
  - redis
  - backend
  - frontend
  - nginx
```

### Produção (Recomendado)
- VPS/Cloud (AWS, Azure, GCP)
- PostgreSQL gerenciado
- Load balancer
- SSL/HTTPS
- Backup automático
- Monitoring (Grafana/Prometheus)

---

## 🔒 SEGURANÇA

- Senhas com bcrypt
- JWT com refresh token
- Rate limiting
- CORS configurado
- SQL Injection protection (Prisma)
- XSS protection
- CSRF tokens
- Logs de segurança

---

## 📝 PRÓXIMOS PASSOS

1. Setup do ambiente de desenvolvimento
2. Inicialização do banco de dados
3. Implementação dos módulos core
4. Testes automatizados
5. Interface do usuário
6. Integração com balança Toledo
7. Documentação da API (Swagger)
8. Deploy em staging/produção

---

**Desenvolvido para GELATINI**
Versão 1.0 - Janeiro 2026

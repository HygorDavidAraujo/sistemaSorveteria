# 📊 MÓDULO FINANCEIRO - SISTEMA SORVETERIA

## 🎯 Visão Geral

Módulo financeiro completo e profissional para gestão de receitas, despesas, contas a pagar/receber e geração de relatórios financeiros (DRE, Cash Flow, Análises).

### Arquitetura

```
Financial Module
├── Domain (Entities & Rules)
│   └── financial.entity.ts - Tipos e interfaces
├── Application (Business Logic)
│   ├── financial.service.ts - Transações financeiras
│   ├── accounts-payable.service.ts - Contas a pagar
│   ├── accounts-receivable.service.ts - Contas a receber
│   └── dre.service.ts - Relatórios financeiros
├── Presentation (HTTP)
│   ├── controllers/financial.controller.ts
│   ├── routes/financial.routes.ts
│   └── validators/financial.validator.ts
└── Infrastructure
    └── Database (Prisma)
```

---

## 🔧 Componentes Principais

### 1. **FinancialService** - Núcleo de Transações
Gerencia todas as transações financeiras (receitas e despesas).

#### Principais Métodos:
- `createTransaction()` - Criar transação
- `updateTransaction()` - Atualizar transação
- `markAsPaid()` - Marcar como paga
- `cancelTransaction()` - Cancelar
- `searchTransactions()` - Buscar com filtros
- `getTransactionsSummary()` - Resumo por período
- `createCategory()` - Criar categoria
- `getCategoriesByType()` - Listar por tipo

#### Tipos de Transação:
```typescript
enum FinancialTransactionType {
  INCOME = 'INCOME',    // Receita
  EXPENSE = 'EXPENSE'   // Despesa
}
```

#### Status de Transação:
```typescript
enum FinancialTransactionStatus {
  PENDING = 'pending'                // Pendente
  SCHEDULED = 'scheduled'            // Agendada
  PARTIAL_PAYMENT = 'partial_payment'// Pagamento parcial
  PAID = 'paid'                      // Paga
  OVERDUE = 'overdue'                // Vencida
  CANCELLED = 'cancelled'            // Cancelada
  REFUNDED = 'refunded'              // Reembolsada
}
```

#### Categorias Financeiras:
```typescript
enum CategoryType {
  REVENUE = 'revenue'                        // Receitas de vendas
  COGS = 'cogs'                              // Custo dos produtos
  OPERATING_EXPENSES = 'operating_expenses'  // Despesas operacionais
  FINANCIAL_REVENUE = 'financial_revenue'    // Receitas financeiras
  FINANCIAL_EXPENSES = 'financial_expenses'  // Despesas financeiras
  TAXES = 'taxes'                            // Impostos
  EXTRAORDINARY = 'extraordinary'           // Extraordinários
}
```

---

### 2. **AccountPayableService** - Contas a Pagar
Gerencia débitos com fornecedores.

#### Principais Métodos:
- `createAccountPayable()` - Criar conta
- `recordPayment()` - Registrar pagamento
- `searchAccountsPayable()` - Buscar contas
- `getUpcomingPayables()` - Contas a vencer
- `getOverduePayables()` - Contas vencidas
- `getSummary()` - Resumo

#### Funcionalidades:
✅ Suporte a parcelamentos  
✅ Rastreamento de pagamentos parciais  
✅ Alertas de vencimento  
✅ Integração com transações financeiras  
✅ Histórico de movimentações  

---

### 3. **AccountReceivableService** - Contas a Receber
Gerencia créditos de clientes.

#### Principais Métodos:
- `createAccountReceivable()` - Criar conta
- `recordPayment()` - Registrar recebimento
- `searchAccountsReceivable()` - Buscar contas
- `getCustomerAccountsReceivable()` - Por cliente
- `calculateDSO()` - Days Sales Outstanding
- `getSummary()` - Resumo

#### Funcionalidades:
✅ Múltiplas formas de pagamento  
✅ Parcelamentos de vendas  
✅ Análise de DSO (dias para receber)  
✅ Rastreamento de clientes com atraso  
✅ Histórico de pagamentos  

---

### 4. **DREService** - Relatórios Financeiros
Demonstração de Resultado do Exercício (Income Statement).

#### Relatórios Disponíveis:

**DRE (Demonstração de Resultado)**
```
Receita Bruta
  - Descontos
= Receita Líquida
  - Custo dos Produtos Vendidos (COGS)
= Lucro Bruto (e Margem Bruta %)
  - Despesas Operacionais
= Lucro Operacional (e Margem Operacional %)
  + Receitas Financeiras
  - Despesas Financeiras
= Resultado Financeiro
  + Outras Receitas
  - Outras Despesas
= Lucro Antes de Impostos
  - Impostos
= Lucro Líquido (e Margem Líquida %)
```

**Fluxo de Caixa (Cash Flow)**
```
Saldo Inicial
+ Entradas (Vendas, Contas a Receber, Outras)
- Saídas (COGS, Despesas, Contas a Pagar, Impostos)
= Fluxo Líquido
= Saldo Final
```

**Análise de Lucratividade**
- Margens (Bruta, Operacional, Líquida)
- ROI (Retorno sobre Investimento)
- Ponto de Equilíbrio
- Margem de Contribuição

**Indicadores Financeiros**
- Current Ratio (Razão Corrente)
- Quick Ratio (Razão Rápida)
- Debt to Equity (Relação Dívida/Capital)
- Receivables Turnover (Rotatividade de Contas a Receber)

**Relatório Comparativo**
- Período Atual vs Período Anterior
- Variações percentuais
- Análise de tendências

---

## 📡 API Endpoints

### Financial Transactions

```
POST   /financial/transactions              # Criar
GET    /financial/transactions              # Listar/Buscar
GET    /financial/transactions/:id          # Obter
PUT    /financial/transactions/:id          # Atualizar
PATCH  /financial/transactions/:id/mark-paid # Marcar como paga
POST   /financial/transactions/:id/cancel   # Cancelar
GET    /financial/transactions/summary      # Resumo
```

### Financial Categories

```
GET    /financial/categories                       # Listar
POST   /financial/categories                       # Criar
GET    /financial/categories/type/:categoryType    # Por tipo
PUT    /financial/categories/:id                   # Atualizar
```

### Accounts Payable

```
POST   /financial/accounts-payable                 # Criar
GET    /financial/accounts-payable                 # Listar
GET    /financial/accounts-payable/:id             # Obter
PUT    /financial/accounts-payable/:id             # Atualizar
POST   /financial/accounts-payable/:id/payment     # Pagar
POST   /financial/accounts-payable/:id/cancel      # Cancelar
GET    /financial/accounts-payable/summary         # Resumo
GET    /financial/accounts-payable/upcoming        # A vencer
GET    /financial/accounts-payable/overdue         # Vencidas
```

### Accounts Receivable

```
POST   /financial/accounts-receivable              # Criar
GET    /financial/accounts-receivable              # Listar
GET    /financial/accounts-receivable/:id          # Obter
PUT    /financial/accounts-receivable/:id          # Atualizar
POST   /financial/accounts-receivable/:id/payment  # Receber
POST   /financial/accounts-receivable/:id/cancel   # Cancelar
GET    /financial/accounts-receivable/summary      # Resumo
GET    /financial/accounts-receivable/upcoming     # A receber
GET    /financial/accounts-receivable/overdue      # Vencidas
GET    /financial/accounts-receivable/customer/:id # Por cliente
GET    /financial/accounts-receivable/analytics/dso # DSO
```

### Financial Reports

```
GET    /financial/reports/dre                  # DRE
GET    /financial/reports/cash-flow            # Fluxo de Caixa
GET    /financial/reports/profitability        # Lucratividade
GET    /financial/reports/indicators           # Indicadores
GET    /financial/reports/comparative          # Comparativo
```

---

## 📝 Exemplos de Uso

### 1. Criar uma Transação Financeira

```bash
POST /financial/transactions
Content-Type: application/json
Authorization: Bearer {token}

{
  "categoryId": "550e8400-e29b-41d4-a716-446655440000",
  "transactionType": "EXPENSE",
  "amount": 150.50,
  "description": "Aluguel do mês",
  "referenceNumber": "ALG-2024-01",
  "transactionDate": "2024-01-15T10:00:00Z",
  "dueDate": "2024-02-15T10:00:00Z"
}
```

### 2. Registrar Pagamento de Conta a Pagar

```bash
POST /financial/accounts-payable/550e8400-e29b-41d4-a716-446655440001/payment
Content-Type: application/json
Authorization: Bearer {token}

{
  "paidAmount": 500.00,
  "paymentDate": "2024-01-20T14:30:00Z",
  "paymentMethod": "Transferência Bancária",
  "notes": "Pagamento parcial"
}
```

### 3. Gerar DRE para Período

```bash
GET /financial/reports/dre?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z
Authorization: Bearer {token}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-31T23:59:59Z"
    },
    "grossRevenue": 15000.00,
    "discounts": 500.00,
    "netRevenue": 14500.00,
    "costOfGoodsSold": 5000.00,
    "grossProfit": 9500.00,
    "grossProfitMargin": 65.52,
    "operatingExpenses": 3000.00,
    "operatingProfit": 6500.00,
    "operatingMargin": 44.83,
    "financialIncome": 100.00,
    "financialExpenses": 50.00,
    "financialResult": 50.00,
    "otherIncome": 0.00,
    "otherExpenses": 0.00,
    "profitBeforeTaxes": 6550.00,
    "taxes": 1310.00,
    "netProfit": 5240.00,
    "netMargin": 36.10
  }
}
```

### 4. Obter Fluxo de Caixa

```bash
GET /financial/reports/cash-flow?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z
Authorization: Bearer {token}
```

---

## 🔐 Permissões (Authorization)

| Operação | Admin | Manager | Cashier |
|----------|-------|---------|---------|
| Criar Transação | ✅ | ✅ | ❌ |
| Atualizar Transação | ✅ | ✅ | ❌ |
| Ver Relatórios | ✅ | ✅ | ❌ |
| Criar Categoria | ✅ | ❌ | ❌ |
| Contas a Pagar | ✅ | ✅ | ❌ |
| Contas a Receber | ✅ | ✅ | ❌ |
| Cancelar Transação | ✅ | ✅ | ❌ |

---

## 💾 Integração com Banco de Dados

### Tabelas Principais

**financial_categories**
- id (UUID, PK)
- name (VARCHAR 100, UNIQUE)
- category_type (ENUM)
- dre_group (VARCHAR 50)
- parent_id (UUID, FK) - Para hierarquia
- is_active (BOOLEAN)
- created_at, updated_at

**financial_transactions**
- id (UUID, PK)
- category_id (UUID, FK)
- transaction_type (ENUM: INCOME, EXPENSE)
- amount (DECIMAL 10,2)
- description (TEXT)
- reference_number (VARCHAR 100)
- transaction_date (DATE)
- due_date (DATE)
- paid_at (TIMESTAMPTZ)
- status (ENUM)
- sale_id (UUID, FK) - Referência a venda
- created_by (UUID, FK)
- created_at, updated_at

**accounts_payable**
- id (UUID, PK)
- supplier_id (VARCHAR)
- invoice_number (VARCHAR 50)
- description (TEXT)
- amount (DECIMAL 10,2)
- paid_amount (DECIMAL 10,2)
- due_date (DATE)
- paid_at (TIMESTAMPTZ)
- payment_method (VARCHAR 50)
- status (ENUM)
- category_id (UUID, FK)
- installment_number (INTEGER)
- total_installments (INTEGER)
- notes (TEXT)
- created_by (UUID, FK)
- created_at, updated_at

**accounts_receivable**
- id (UUID, PK)
- customer_id (UUID, FK)
- sale_id (UUID, FK)
- invoice_number (VARCHAR 50)
- amount (DECIMAL 10,2)
- paid_amount (DECIMAL 10,2)
- due_date (DATE)
- paid_at (TIMESTAMPTZ)
- payment_method (VARCHAR 50)
- status (ENUM)
- installment_number (INTEGER)
- total_installments (INTEGER)
- notes (TEXT)
- created_at, updated_at

---

## 🚀 Como Usar

### 1. Registrar Routes na Aplicação

No arquivo `app.ts`:

```typescript
import financialRoutes from '@presentation/http/routes/financial.routes';

// ... configurações anteriores ...

app.use('/api/financial', financialRoutes);
```

### 2. Executar Migrations do Banco

```bash
# Se forem criadas novas migrações
npx prisma migrate dev --name add_financial_module

# Ou aplicar migrations existentes
npx prisma migrate deploy
```

### 3. Testar os Endpoints

Use arquivos `.rest` ou `.http`:

**test-financial.http**
```
### Criar categoria financeira
POST http://localhost:3000/api/financial/categories
Authorization: Bearer {seu_token}
Content-Type: application/json

{
  "name": "Aluguel",
  "categoryType": "operating_expenses",
  "dreGroup": "operating_profit"
}

### Criar transação
POST http://localhost:3000/api/financial/transactions
Authorization: Bearer {seu_token}
Content-Type: application/json

{
  "categoryId": "550e8400-e29b-41d4-a716-446655440000",
  "transactionType": "EXPENSE",
  "amount": 1000,
  "description": "Aluguel janeiro",
  "transactionDate": "2024-01-05T10:00:00Z",
  "dueDate": "2024-01-20T10:00:00Z"
}

### Gerar DRE
GET http://localhost:3000/api/financial/reports/dre?startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z
Authorization: Bearer {seu_token}
```

---

## 🎓 Best Practices

### 1. **Validação de Dados**
✅ Todas as entradas são validadas com Joi  
✅ Mensagens de erro em português  
✅ Suporte a tipos de dados precisos  

### 2. **Integridade Transacional**
✅ Transações financeiras ligadas a vendas  
✅ Controle de status com máquina de estados  
✅ Auditoria de todas as operações  

### 3. **Performance**
✅ Índices no banco para buscas rápidas  
✅ Paginação em listagens  
✅ Agregações otimizadas para relatórios  

### 4. **Segurança**
✅ Autenticação JWT obrigatória  
✅ Autorização por role (admin, manager)  
✅ Logs de auditoria de operações  
✅ Soft delete (cancelamento) em vez de exclusão  

### 5. **Manutenibilidade**
✅ Código seguindo Clean Architecture  
✅ Serviços independentes e testáveis  
✅ Validadores reutilizáveis  
✅ DTOs para tipagem  

---

## 📊 Fluxo de Dados Típico

```
1. Venda criada no PDV
   ↓
2. Cria AccountReceivable (se crediário)
   ↓
3. Cria FinancialTransaction (receita)
   ↓
4. Cliente paga
   ↓
5. recordPayment() em AccountReceivable
   ↓
6. Atualiza FinancialTransaction (status = PAID)
   ↓
7. DRE inclui na receita recebida
   ↓
8. Relatórios refletem o movimento
```

---

## 🔍 Próximos Passos (v2.0)

- [ ] Integração com gateway de pagamento
- [ ] Geração de notas fiscais eletrônicas
- [ ] Cálculo automático de impostos (ICMS, PIS, COFINS)
- [ ] Análise preditiva de fluxo de caixa
- [ ] Dashboard com gráficos interativos
- [ ] Exportação em Excel/PDF
- [ ] Integração com SAP/ERP
- [ ] Regras de negócio customizáveis

---

## 📞 Suporte

Para dúvidas ou issues, reporte aqui com:
- Versão da API
- Endpoint utilizado
- Payload enviado
- Erro retornado
- Passos para reproduzir

---

**Versão:** 1.0.0  
**Status:** Production Ready ✅  
**Última Atualização:** Janeiro 2024

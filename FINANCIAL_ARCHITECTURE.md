# 🏗️ ARQUITETURA DO MÓDULO FINANCEIRO

## 📊 Diagrama da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ HTTP Routes (financial.routes.ts)                        │   │
│  │ ├─ POST   /financial/transactions                        │   │
│  │ ├─ GET    /financial/transactions                        │   │
│  │ ├─ PUT    /financial/transactions/:id                    │   │
│  │ ├─ POST   /financial/accounts-payable                    │   │
│  │ ├─ GET    /financial/accounts-receivable                 │   │
│  │ ├─ GET    /financial/reports/dre                         │   │
│  │ └─ ... (50+ endpoints)                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            ↓                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Controllers (financial.controller.ts)                    │   │
│  │ ├─ FinancialController                                   │   │
│  │ ├─ AccountPayableController                              │   │
│  │ ├─ AccountReceivableController                           │   │
│  │ └─ DREController                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            ↓                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Validators (financial.validator.ts)                      │   │
│  │ ├─ createFinancialTransactionSchema                      │   │
│  │ ├─ createAccountPayableSchema                            │   │
│  │ ├─ createAccountReceivableSchema                         │   │
│  │ └─ dreReportSchema                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
│                  (Business Logic / Use Cases)                    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ FinancialService (84 métodos)                            │   │
│  │ ├─ createTransaction()                                   │   │
│  │ ├─ updateTransaction()                                   │   │
│  │ ├─ markAsPaid()                                          │   │
│  │ ├─ cancelTransaction()                                   │   │
│  │ ├─ searchTransactions()                                  │   │
│  │ ├─ createCategory()                                      │   │
│  │ └─ ... (11 métodos total)                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ AccountPayableService (11 métodos)                       │   │
│  │ ├─ createAccountPayable()                                │   │
│  │ ├─ recordPayment()                                       │   │
│  │ ├─ getUpcomingPayables()                                 │   │
│  │ ├─ getOverduePayables()                                  │   │
│  │ └─ ... (11 métodos total)                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ AccountReceivableService (13 métodos)                    │   │
│  │ ├─ createAccountReceivable()                             │   │
│  │ ├─ recordPayment()                                       │   │
│  │ ├─ calculateDSO()                                        │   │
│  │ ├─ getCustomerAccountsReceivable()                       │   │
│  │ └─ ... (13 métodos total)                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ DREService (6 Relatórios)                                │   │
│  │ ├─ generateDREReport() - Income Statement                │   │
│  │ ├─ generateCashFlow() - Fluxo de Caixa                   │   │
│  │ ├─ analyzeProfitability() - Análise Lucratividade        │   │
│  │ ├─ calculateFinancialIndicators() - Indicadores          │   │
│  │ ├─ generateComparativeReport() - Comparativo             │   │
│  │ └─ ... (6 métodos total)                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                                │
│                  (Entities & Business Rules)                    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ financial.entity.ts                                      │   │
│  │                                                          │   │
│  │ Enums:                                                   │   │
│  │ ├─ FinancialTransactionType (INCOME, EXPENSE)           │   │
│  │ ├─ FinancialTransactionStatus (7 status)                │   │
│  │ ├─ CategoryType (7 tipos)                               │   │
│  │                                                          │   │
│  │ Entities:                                               │   │
│  │ ├─ FinancialTransactionEntity                           │   │
│  │ ├─ FinancialCategoryEntity                              │   │
│  │ ├─ AccountPayableEntity                                 │   │
│  │ ├─ AccountReceivableEntity                              │   │
│  │ ├─ DREReportEntity                                      │   │
│  │ ├─ CashFlowEntity                                       │   │
│  │ ├─ ProfitabilityAnalysisEntity                          │   │
│  │ └─ FinancialIndicatorsEntity                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                  INFRASTRUCTURE LAYER                            │
│                    (Database & Persistence)                     │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ PostgreSQL Database (Prisma ORM)                         │   │
│  │                                                          │   │
│  │ Tabelas:                                                │   │
│  │ ├─ financial_categories                                 │   │
│  │ ├─ financial_transactions                               │   │
│  │ ├─ accounts_payable                                     │   │
│  │ └─ accounts_receivable                                  │   │
│  │                                                          │   │
│  │ Índices para Performance:                               │   │
│  │ ├─ category_id                                          │   │
│  │ ├─ transaction_date                                     │   │
│  │ ├─ due_date                                             │   │
│  │ └─ status                                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Dados - Caso de Uso: Venda com Crediário

```
1. PDV cria Venda (Sale)
   ↓
   └─→ sale.ts criada
       ├─ id: UUID
       ├─ total: 500.00
       └─ customerId: UUID

2. Gera Conta a Receber (AccountReceivable)
   ↓
   └─→ accountReceivableService.createAccountReceivable()
       ├─ customerId: UUID
       ├─ saleId: UUID (referência)
       ├─ amount: 500.00
       ├─ dueDate: 2024-02-10
       └─ status: PENDING

3. Registra Transação Financeira (FinancialTransaction)
   ↓
   └─→ financialService.createTransaction()
       ├─ categoryId: {categoria_vendas}
       ├─ transactionType: INCOME
       ├─ amount: 500.00
       ├─ description: "Venda do cliente"
       └─ status: PENDING

4. Cliente Paga
   ↓
   └─→ accountReceivableService.recordPayment()
       ├─ paidAmount: 500.00
       ├─ paymentDate: 2024-02-08
       └─ paymentMethod: "Débito"

5. Atualiza Status
   ├─ AccountReceivable: status = PAID
   ├─ FinancialTransaction: status = PAID
   └─ Customer: totalPurchases += 500.00

6. DRE Inclui na Receita
   ↓
   └─→ dreService.generateDREReport()
       ├─ Busca FinancialTransaction com status PAID
       ├─ transactionType = INCOME
       ├─ Soma na grossRevenue
       └─ Calcula margens e lucro

7. Resultado no Relatório
   └─ Receita Líquida: +500.00
      Lucro Bruto: +350.00 (se COGS = 150)
      Lucro Líquido: aumenta
```

---

## 🎯 Estados Válidos de Transição

```
Máquina de Estados de Transação Financeira:

    ┌─────────────┐
    │   PENDING   │◄─────────────────────┐
    └──────┬──────┘                       │
           │ (criar)                      │
           ├─→ SCHEDULED (se tiver dueDate)
           ├─→ PAID (pagamento imediato)
           └─→ CANCELLED (cancelar)
           
    ┌────────────────┐
    │   SCHEDULED    │
    └──────┬─────────┘
           │ (quando vencer)
           ├─→ OVERDUE
           ├─→ PAID
           └─→ CANCELLED
           
    ┌────────────────┐
    │    OVERDUE     │
    └──────┬─────────┘
           │ (quando receber/pagar)
           ├─→ PAID
           ├─→ PARTIAL_PAYMENT
           └─→ CANCELLED
           
    ┌────────────────────┐
    │  PARTIAL_PAYMENT   │
    └──────┬─────────────┘
           │ (pagamento completo)
           ├─→ PAID
           ├─→ CANCELLED
           └─→ OVERDUE (se passar vencimento)
           
    ┌────────────┐
    │    PAID    │
    └──────┬─────┘
           │ (devolução/reembolso)
           └─→ REFUNDED
           
    ┌────────────────┐
    │   CANCELLED    │ (estado final - sem saída)
    └────────────────┘
    
    ┌────────────────┐
    │   REFUNDED     │ (estado final - sem saída)
    └────────────────┘
```

---

## 📊 Fluxo DRE

```
ENTRADA DE DADOS:
├─ Sales (de vendas.ts)
├─ SaleItems (produtos vendidos)
├─ FinancialTransactions (receitas/despesas)
├─ AccountsPayable (pagos)
└─ AccountsReceivable (recebidos)

PROCESSAMENTO:
├─ 1. Calcular Receita Bruta (sum(sales.total))
├─ 2. Descontos (sum(sales.discount))
├─ 3. Receita Líquida = Receita Bruta - Descontos
├─ 4. COGS = sum(saleItems.costPrice * quantity)
├─ 5. Lucro Bruto = Receita Líquida - COGS
├─ 6. Despesas Operacionais (FinancialTransactions filtrads)
├─ 7. Lucro Operacional = Lucro Bruto - Despesas
├─ 8. Resultado Financeiro (Receitas - Despesas financeiras)
├─ 9. Lucro Antes de Impostos = Lucro Operacional + Resultado
├─ 10. Impostos (FinancialTransactions category=TAXES)
└─ 11. Lucro Líquido = Lucro Antes de Impostos - Impostos

SAÍDA:
├─ Valores absolutos
├─ Percentuais de margem
├─ Indicadores de rentabilidade
└─ Dados para dashboard
```

---

## 🗄️ Schema de Banco de Dados

```
financial_categories
├─ id (UUID, PK)
├─ name (VARCHAR 100, UNIQUE)
├─ category_type (ENUM: 7 tipos)
├─ dre_group (VARCHAR 50)
├─ parent_id (UUID, FK) - Hierarquia
├─ is_active (BOOLEAN)
└─ created_at, updated_at

financial_transactions
├─ id (UUID, PK)
├─ category_id (UUID, FK)
├─ transaction_type (ENUM: INCOME, EXPENSE)
├─ amount (DECIMAL 10,2)
├─ description (TEXT)
├─ reference_number (VARCHAR 100)
├─ transaction_date (DATE)
├─ due_date (DATE)
├─ paid_at (TIMESTAMPTZ)
├─ status (ENUM: 7 status)
├─ sale_id (UUID, FK) - Ligação
├─ created_by (UUID, FK)
└─ created_at, updated_at

accounts_payable
├─ id (UUID, PK)
├─ supplier_id (VARCHAR)
├─ invoice_number (VARCHAR 50)
├─ description (TEXT)
├─ amount (DECIMAL 10,2)
├─ paid_amount (DECIMAL 10,2)
├─ due_date (DATE)
├─ paid_at (TIMESTAMPTZ)
├─ payment_method (VARCHAR 50)
├─ status (ENUM)
├─ category_id (UUID, FK)
├─ installment_number (INTEGER)
├─ total_installments (INTEGER)
├─ notes (TEXT)
└─ created_at, updated_at

accounts_receivable
├─ id (UUID, PK)
├─ customer_id (UUID, FK)
├─ sale_id (UUID, FK)
├─ invoice_number (VARCHAR 50)
├─ amount (DECIMAL 10,2)
├─ paid_amount (DECIMAL 10,2)
├─ due_date (DATE)
├─ paid_at (TIMESTAMPTZ)
├─ payment_method (VARCHAR 50)
├─ status (ENUM)
├─ installment_number (INTEGER)
├─ total_installments (INTEGER)
├─ notes (TEXT)
└─ created_at, updated_at
```

---

## 🔑 Key Design Decisions

### 1. Máquina de Estados
✅ Validar transições para integridade  
✅ Prevenir estados inválidos  
✅ Auditoria de mudanças  

### 2. Soft Delete
✅ Cancelar em vez de deletar  
✅ Manter histórico  
✅ Facilitar auditoria  

### 3. Categorias Hierárquicas
✅ Suporta subcategorias  
✅ Facilita agrupamento  
✅ Pronto para DRE  

### 4. Integridade Referencial
✅ Ligações com Sales  
✅ Ligações com Customers  
✅ Ligações com Users (auditoria)  

### 5. Relatórios Baseados em Dados
✅ Agregar FinancialTransactions  
✅ Não duplicar dados  
✅ Cálculos on-demand  

---

## 📈 Padrões de Projeto Utilizados

- **Service Layer** - Lógica de negócio centralizada
- **Repository Pattern** - Prisma como ORM
- **DTO Pattern** - Tipagem de dados de entrada
- **Validator Pattern** - Joi para validações
- **Error Handling** - AppError customizado
- **Dependency Injection** - Prisma injetado nos serviços
- **State Machine** - Transições de status
- **Audit Trail** - Rastreamento de alterações

---

**Arquitetura Profissional ✅**  
**Production Ready ✅**  
**Escalável ✅**  
**Manutenível ✅**

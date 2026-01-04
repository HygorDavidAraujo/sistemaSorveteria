import { Router, Request, Response, NextFunction } from 'express';
import {
  FinancialController,
  AccountPayableController,
  AccountReceivableController,
  DREController,
} from '@presentation/http/controllers/financial.controller';
import { validate } from '@presentation/http/middlewares/validate';
import { authenticate } from '@presentation/http/middlewares/authenticate';
import { authorize } from '@presentation/http/middlewares/authorize';
import {
  createFinancialTransactionSchema,
  updateFinancialTransactionSchema,
  searchFinancialTransactionSchema,
  cancelTransactionSchema,
  createFinancialCategorySchema,
  updateFinancialCategorySchema,
  createAccountPayableSchema,
  recordPaymentSchema,
  updateAccountPayableSchema,
  cancelAccountPayableSchema,
  createAccountReceivableSchema,
  receivePaymentSchema,
  updateAccountReceivableSchema,
  cancelAccountReceivableSchema,
  dreReportSchema,
  cashFlowSchema,
  comparativeReportSchema,
} from '@presentation/validators/financial.validator';

const router = Router();

// Instantiate controllers
const financialController = new FinancialController();
const accountPayableController = new AccountPayableController();
const accountReceivableController = new AccountReceivableController();
const dreController = new DREController();

/**
 * Middleware de autenticação para todas as rotas
 */
router.use(authenticate);

// ============================================================================
// FINANCIAL TRANSACTIONS
// ============================================================================

/**
 * POST /financial/transactions - Criar transação financeira
 */
router.post(
  '/transactions',
  authorize(['admin', 'manager']),
  validate(createFinancialTransactionSchema),
  financialController.createTransaction
);

/**
 * GET /financial/transactions - Buscar transações financeiras
 */
router.get(
  '/transactions',
  authorize(['admin', 'manager']),
  validate(searchFinancialTransactionSchema),
  financialController.searchTransactions
);

/**
 * GET /financial/transactions/:id - Obter transação por ID
 */
router.get('/transactions/:id', authorize(['admin', 'manager']), financialController.getTransaction);

/**
 * PUT /financial/transactions/:id - Atualizar transação
 */
router.put(
  '/transactions/:id',
  authorize(['admin', 'manager']),
  validate(updateFinancialTransactionSchema),
  financialController.updateTransaction
);

/**
 * PATCH /financial/transactions/:id/mark-paid - Marcar como paga
 */
router.patch(
  '/transactions/:id/mark-paid',
  authorize(['admin', 'manager']),
  financialController.markAsPaid
);

/**
 * POST /financial/transactions/:id/cancel - Cancelar transação
 */
router.post(
  '/transactions/:id/cancel',
  authorize(['admin', 'manager']),
  validate(cancelTransactionSchema),
  financialController.cancelTransaction
);

/**
 * GET /financial/transactions/summary - Resumo de transações
 */
router.get(
  '/transactions/summary',
  authorize(['admin', 'manager']),
  financialController.getTransactionsSummary
);

/**
 * GET /financial/daily - Relatório diário
 */
router.get(
  '/daily',
  authorize(['admin', 'manager']),
  financialController.getDailyReport
);

// ============================================================================
// FINANCIAL CATEGORIES
// ============================================================================

/**
 * GET /financial/categories - Listar categorias
 */
router.get(
  '/categories',
  authorize(['admin', 'manager']),
  financialController.getCategories
);

/**
 * POST /financial/categories - Criar categoria
 */
router.post(
  '/categories',
  authorize(['admin']),
  validate(createFinancialCategorySchema),
  financialController.createCategory
);

/**
 * GET /financial/categories/type/:categoryType - Categorias por tipo
 */
router.get(
  '/categories/type/:categoryType',
  authorize(['admin', 'manager']),
  financialController.getCategoriesByType
);

/**
 * PUT /financial/categories/:id - Atualizar categoria
 */
router.put(
  '/categories/:id',
  authorize(['admin']),
  validate(updateFinancialCategorySchema),
  financialController.updateCategory
);

// ============================================================================
// ACCOUNTS PAYABLE (Contas a Pagar)
// ============================================================================

/**
 * POST /financial/accounts-payable - Criar conta a pagar
 */
router.post(
  '/accounts-payable',
  authorize(['admin', 'manager']),
  validate(createAccountPayableSchema),
  accountPayableController.createAccountPayable
);

/**
 * GET /financial/accounts-payable - Buscar contas a pagar
 */
router.get(
  '/accounts-payable',
  authorize(['admin', 'manager']),
  accountPayableController.searchAccountsPayable
);

/**
 * GET /financial/accounts-payable/summary - Resumo de contas a pagar
 */
router.get(
  '/accounts-payable/summary',
  authorize(['admin', 'manager']),
  accountPayableController.getSummary
);

/**
 * GET /financial/accounts-payable/upcoming - Contas a vencer
 */
router.get(
  '/accounts-payable/upcoming',
  authorize(['admin', 'manager']),
  accountPayableController.getUpcomingPayables
);

/**
 * GET /financial/accounts-payable/overdue - Contas vencidas
 */
router.get(
  '/accounts-payable/overdue',
  authorize(['admin', 'manager']),
  accountPayableController.getOverduePayables
);

/**
 * GET /financial/accounts-payable/:id - Obter conta a pagar
 */
router.get(
  '/accounts-payable/:id',
  authorize(['admin', 'manager']),
  accountPayableController.getAccountPayable
);

/**
 * PUT /financial/accounts-payable/:id - Atualizar conta a pagar
 */
router.put(
  '/accounts-payable/:id',
  authorize(['admin', 'manager']),
  validate(updateAccountPayableSchema),
  accountPayableController.updateAccountPayable
);

/**
 * POST /financial/accounts-payable/:id/payment - Registrar pagamento
 */
router.post(
  '/accounts-payable/:id/payment',
  authorize(['admin', 'manager']),
  validate(recordPaymentSchema),
  accountPayableController.recordPayment
);

/**
 * POST /financial/accounts-payable/:id/cancel - Cancelar conta a pagar
 */
router.post(
  '/accounts-payable/:id/cancel',
  authorize(['admin', 'manager']),
  validate(cancelAccountPayableSchema),
  accountPayableController.cancelAccountPayable
);

// ============================================================================
// ACCOUNTS RECEIVABLE (Contas a Receber)
// ============================================================================

/**
 * POST /financial/accounts-receivable - Criar conta a receber
 */
router.post(
  '/accounts-receivable',
  authorize(['admin', 'manager']),
  validate(createAccountReceivableSchema),
  accountReceivableController.createAccountReceivable
);

/**
 * GET /financial/accounts-receivable - Buscar contas a receber
 */
router.get(
  '/accounts-receivable',
  authorize(['admin', 'manager']),
  accountReceivableController.searchAccountsReceivable
);

/**
 * GET /financial/accounts-receivable/summary - Resumo de contas a receber
 */
router.get(
  '/accounts-receivable/summary',
  authorize(['admin', 'manager']),
  accountReceivableController.getSummary
);

/**
 * GET /financial/accounts-receivable/upcoming - Contas a receber por vencer
 */
router.get(
  '/accounts-receivable/upcoming',
  authorize(['admin', 'manager']),
  accountReceivableController.getUpcomingReceivables
);

/**
 * GET /financial/accounts-receivable/overdue - Contas vencidas
 */
router.get(
  '/accounts-receivable/overdue',
  authorize(['admin', 'manager']),
  accountReceivableController.getOverdueReceivables
);

/**
 * GET /financial/accounts-receivable/analytics/dso - DSO (Days Sales Outstanding)
 */
router.get(
  '/accounts-receivable/analytics/dso',
  authorize(['admin', 'manager']),
  accountReceivableController.getDSO
);

/**
 * GET /financial/accounts-receivable/:id - Obter conta a receber
 */
router.get(
  '/accounts-receivable/:id',
  authorize(['admin', 'manager']),
  accountReceivableController.getAccountReceivable
);

/**
 * GET /financial/accounts-receivable/customer/:customerId - Contas por cliente
 */
router.get(
  '/accounts-receivable/customer/:customerId',
  authorize(['admin', 'manager']),
  accountReceivableController.getCustomerAccounts
);

/**
 * PUT /financial/accounts-receivable/:id - Atualizar conta a receber
 */
router.put(
  '/accounts-receivable/:id',
  authorize(['admin', 'manager']),
  validate(updateAccountReceivableSchema),
  accountReceivableController.updateAccountReceivable
);

/**
 * POST /financial/accounts-receivable/:id/payment - Registrar recebimento
 */
router.post(
  '/accounts-receivable/:id/payment',
  authorize(['admin', 'manager']),
  validate(receivePaymentSchema),
  accountReceivableController.recordPayment
);

/**
 * POST /financial/accounts-receivable/:id/cancel - Cancelar conta a receber
 */
router.post(
  '/accounts-receivable/:id/cancel',
  authorize(['admin', 'manager']),
  validate(cancelAccountReceivableSchema),
  accountReceivableController.cancelAccountReceivable
);

// ============================================================================
// FINANCIAL REPORTS (DRE, Cash Flow, etc)
// ============================================================================

/**
 * GET /financial/reports/dre - DRE (Demonstração de Resultado do Exercício)
 */
router.get(
  '/reports/dre',
  authorize(['admin', 'manager']),
  validate(dreReportSchema),
  dreController.generateDRE
);

/**
 * GET /financial/reports/cash-flow - Fluxo de Caixa
 */
router.get(
  '/reports/cash-flow',
  authorize(['admin', 'manager']),
  validate(cashFlowSchema),
  dreController.generateCashFlow
);

/**
 * GET /financial/reports/profitability - Análise de Lucratividade
 */
router.get(
  '/reports/profitability',
  authorize(['admin', 'manager']),
  validate(dreReportSchema),
  dreController.analyzeProfitability
);

/**
 * GET /financial/reports/indicators - Indicadores Financeiros
 */
router.get(
  '/reports/indicators',
  authorize(['admin', 'manager']),
  dreController.getIndicators
);

/**
 * GET /financial/reports/comparative - Relatório Comparativo
 */
router.get(
  '/reports/comparative',
  authorize(['admin', 'manager']),
  validate(comparativeReportSchema),
  dreController.generateComparative
);

export default router;

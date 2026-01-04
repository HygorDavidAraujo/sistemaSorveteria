import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/async-handler';
import { FinancialService } from '@application/use-cases/financial/financial.service';
import { AccountPayableService } from '@application/use-cases/financial/accounts-payable.service';
import { AccountReceivableService } from '@application/use-cases/financial/accounts-receivable.service';
import { DREService } from '@application/use-cases/financial/dre.service';
import { FinancialTransactionType, FinancialTransactionStatus } from '@domain/entities/financial.entity';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: string };
    }
  }
}

/**
 * Financial Controller
 * Gerencia transações financeiras e categorias
 */
export class FinancialController {
  private financialService: FinancialService;

  constructor() {
    this.financialService = new FinancialService();
  }

  /**
   * Criar transação financeira
   * POST /financial/transactions
   */
  createTransaction = asyncHandler(async (req: Request, res: Response) => {
    const {
      categoryId,
      transactionType,
      amount,
      description,
      referenceNumber,
      transactionDate,
      dueDate,
      saleId,
    } = req.body;

    const transaction = await this.financialService.createTransaction({
      categoryId,
      transactionType,
      amount,
      description,
      referenceNumber,
      transactionDate: new Date(transactionDate),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      saleId,
      createdById: req.user!.id,
    });

    res.status(201).json({
      success: true,
      data: transaction,
      message: 'Transação financeira criada com sucesso',
    });
  });

  /**
   * Buscar transações financeiras
   * GET /financial/transactions
   */
  searchTransactions = asyncHandler(async (req: Request, res: Response) => {
    const { categoryId, transactionType, status, startDate, endDate, page, limit } = req.query;

    const result = await this.financialService.searchTransactions({
      categoryId: categoryId as string,
      transactionType: transactionType as FinancialTransactionType,
      status: status as FinancialTransactionStatus,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: parseInt((page as string) || '1'),
        limit: parseInt((limit as string) || '20'),
      },
    });
  });

  /**
   * Obter transação por ID
   * GET /financial/transactions/:id
   */
  getTransaction = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const transaction = await this.financialService.getTransactionById(id);

    res.json({
      success: true,
      data: transaction,
    });
  });

  /**
   * Atualizar transação
   * PUT /financial/transactions/:id
   */
  updateTransaction = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { description, dueDate, paidAt, status } = req.body;

    const transaction = await this.financialService.updateTransaction(
      id,
      {
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        paidAt: paidAt ? new Date(paidAt) : undefined,
        status,
      },
      req.user!.id
    );

    res.json({
      success: true,
      data: transaction,
      message: 'Transação atualizada com sucesso',
    });
  });

  /**
   * Marcar transação como paga
   * PATCH /financial/transactions/:id/mark-paid
   */
  markAsPaid = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const transaction = await this.financialService.markAsPaid(id, req.user!.id);

    res.json({
      success: true,
      data: transaction,
      message: 'Transação marcada como paga',
    });
  });

  /**
   * Cancelar transação
   * POST /financial/transactions/:id/cancel
   */
  cancelTransaction = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    const transaction = await this.financialService.cancelTransaction(id, reason, req.user!.id);

    res.json({
      success: true,
      data: transaction,
      message: 'Transação cancelada com sucesso',
    });
  });

  /**
   * Resumo de transações
   * GET /financial/transactions/summary
   */
  getTransactionsSummary = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const summary = await this.financialService.getTransactionsSummary(
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      data: summary,
    });
  });

  /**
   * Relatório diário
   * GET /financial/daily
   */
  getDailyReport = asyncHandler(async (req: Request, res: Response) => {
    const { date } = req.query;
    const reportDate = date ? new Date(date as string) : new Date();

    const summary = await this.financialService.getTransactionsSummary(
      reportDate,
      reportDate
    );

    res.json({
      success: true,
      data: summary,
    });
  });

  /**
   * Listar categorias financeiras
   * GET /financial/categories
   */
  getCategories = asyncHandler(async (req: Request, res: Response) => {
    const { isActive } = req.query;

    const categories = await this.financialService.getCategories(
      isActive ? isActive === 'true' : undefined
    );

    res.json({
      success: true,
      data: categories,
    });
  });

  /**
   * Obter categorias por tipo
   * GET /financial/categories/type/:categoryType
   */
  getCategoriesByType = asyncHandler(async (req: Request, res: Response) => {
    const { categoryType } = req.params;

    const categories = await this.financialService.getCategoriesByType(categoryType as any);

    res.json({
      success: true,
      data: categories,
    });
  });

  /**
   * Criar categoria
   * POST /financial/categories
   */
  createCategory = asyncHandler(async (req: Request, res: Response) => {
    const { name, categoryType, dreGroup, parentId, isActive } = req.body;

    const category = await this.financialService.createCategory({
      name,
      categoryType,
      dreGroup,
      parentId,
      isActive,
    });

    res.status(201).json({
      success: true,
      data: category,
      message: 'Categoria criada com sucesso',
    });
  });

  /**
   * Atualizar categoria
   * PUT /financial/categories/:id
   */
  updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, categoryType, dreGroup, parentId, isActive } = req.body;

    const category = await this.financialService.updateCategory(id, {
      name,
      categoryType,
      dreGroup,
      parentId,
      isActive,
    });

    res.json({
      success: true,
      data: category,
      message: 'Categoria atualizada com sucesso',
    });
  });
}

/**
 * Accounts Payable Controller
 * Gerencia contas a pagar
 */
export class AccountPayableController {
  private accountPayableService: AccountPayableService;

  constructor() {
    this.accountPayableService = new AccountPayableService();
  }

  /**
   * Criar conta a pagar
   * POST /financial/accounts-payable
   */
  createAccountPayable = asyncHandler(async (req: Request, res: Response) => {
    const {
      supplierName,
      description,
      amount,
      dueDate,
      categoryId,
      notes,
    } = req.body;

    const accountPayable = await this.accountPayableService.createAccountPayable({
      supplierName,
      description,
      amount,
      dueDate: new Date(dueDate),
      categoryId,
      notes,
      createdById: req.user!.id,
    });

    res.status(201).json({
      success: true,
      data: accountPayable,
      message: 'Conta a pagar criada com sucesso',
    });
  });

  /**
   * Buscar contas a pagar
   * GET /financial/accounts-payable
   */
  searchAccountsPayable = asyncHandler(async (req: Request, res: Response) => {
    const { supplierName, status, startDueDate, endDueDate, page, limit } = req.query;

    const result = await this.accountPayableService.searchAccountsPayable({
      supplierName: supplierName as string,
      status: status as FinancialTransactionStatus,
      startDueDate: startDueDate ? new Date(startDueDate as string) : undefined,
      endDueDate: endDueDate ? new Date(endDueDate as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: parseInt((page as string) || '1'),
        limit: parseInt((limit as string) || '20'),
      },
    });
  });

  /**
   * Obter conta a pagar
   * GET /financial/accounts-payable/:id
   */
  getAccountPayable = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const account = await this.accountPayableService.getAccountPayableById(id);

    res.json({
      success: true,
      data: account,
    });
  });

  /**
   * Registrar pagamento
   * POST /financial/accounts-payable/:id/payment
   */
  recordPayment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { paymentDate, notes } = req.body;

    const account = await this.accountPayableService.recordPayment(id, {
      paymentDate: new Date(paymentDate),
      notes,
      userId: req.user!.id,
    });

    res.json({
      success: true,
      data: account,
      message: 'Pagamento registrado com sucesso',
    });
  });

  /**
   * Atualizar conta a pagar
   * PUT /financial/accounts-payable/:id
   */
  updateAccountPayable = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { description, dueDate, paymentMethod, notes } = req.body;

    const account = await this.accountPayableService.updateAccountPayable(id, {
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      paymentMethod,
      notes,
    });

    res.json({
      success: true,
      data: account,
      message: 'Conta atualizada com sucesso',
    });
  });

  /**
   * Cancelar conta a pagar
   * POST /financial/accounts-payable/:id/cancel
   */
  cancelAccountPayable = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    const account = await this.accountPayableService.cancelAccountPayable(
      id,
      reason,
      req.user!.id
    );

    res.json({
      success: true,
      data: account,
      message: 'Conta cancelada com sucesso',
    });
  });

  /**
   * Obter contas a vencer
   * GET /financial/accounts-payable/upcoming
   */
  getUpcomingPayables = asyncHandler(async (req: Request, res: Response) => {
    const { days } = req.query;

    const payables = await this.accountPayableService.getUpcomingPayables(
      days ? parseInt(days as string) : 7
    );

    res.json({
      success: true,
      data: payables,
    });
  });

  /**
   * Obter contas vencidas
   * GET /financial/accounts-payable/overdue
   */
  getOverduePayables = asyncHandler(async (req: Request, res: Response) => {
    const payables = await this.accountPayableService.getOverduePayables();

    res.json({
      success: true,
      data: payables,
    });
  });

  /**
   * Resumo de contas a pagar
   * GET /financial/accounts-payable/summary
   */
  getSummary = asyncHandler(async (req: Request, res: Response) => {
    const summary = await this.accountPayableService.getSummary();

    res.json({
      success: true,
      data: summary,
    });
  });
}

/**
 * Accounts Receivable Controller
 * Gerencia contas a receber
 */
export class AccountReceivableController {
  private accountReceivableService: AccountReceivableService;

  constructor() {
    this.accountReceivableService = new AccountReceivableService();
  }

  /**
   * Criar conta a receber
   * POST /financial/accounts-receivable
   */
  createAccountReceivable = asyncHandler(async (req: Request, res: Response) => {
    const {
      customerId,
      customerName,
      description,
      saleId,
      amount,
      dueDate,
      notes,
    } = req.body;

    const account = await this.accountReceivableService.createAccountReceivable({
      customerId,
      customerName,
      description,
      saleId,
      amount,
      dueDate: new Date(dueDate),
      notes,
      createdById: req.user!.id,
    });

    res.status(201).json({
      success: true,
      data: account,
      message: 'Conta a receber criada com sucesso',
    });
  });

  /**
   * Buscar contas a receber
   * GET /financial/accounts-receivable
   */
  searchAccountsReceivable = asyncHandler(async (req: Request, res: Response) => {
    const { customerId, status, startDueDate, endDueDate, page, limit } = req.query;

    const result = await this.accountReceivableService.searchAccountsReceivable({
      customerId: customerId as string,
      status: status as FinancialTransactionStatus,
      startDueDate: startDueDate ? new Date(startDueDate as string) : undefined,
      endDueDate: endDueDate ? new Date(endDueDate as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: parseInt((page as string) || '1'),
        limit: parseInt((limit as string) || '20'),
      },
    });
  });

  /**
   * Obter conta a receber
   * GET /financial/accounts-receivable/:id
   */
  getAccountReceivable = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const account = await this.accountReceivableService.getAccountReceivableById(id);

    res.json({
      success: true,
      data: account,
    });
  });

  /**
   * Registrar recebimento
   * POST /financial/accounts-receivable/:id/payment
   */
  recordPayment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { paymentDate, paymentMethod, notes } = req.body;

    const account = await this.accountReceivableService.recordPayment(id, {
      paymentDate: new Date(paymentDate),
      paymentMethod,
      notes,
      userId: req.user!.id,
    });

    res.json({
      success: true,
      data: account,
      message: 'Recebimento registrado com sucesso',
    });
  });

  /**
   * Atualizar conta a receber
   * PUT /financial/accounts-receivable/:id
   */
  updateAccountReceivable = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { dueDate, notes } = req.body;

    const account = await this.accountReceivableService.updateAccountReceivable(id, {
      dueDate: dueDate ? new Date(dueDate) : undefined,
      notes,
    });

    res.json({
      success: true,
      data: account,
      message: 'Conta atualizada com sucesso',
    });
  });

  /**
   * Cancelar conta a receber
   * POST /financial/accounts-receivable/:id/cancel
   */
  cancelAccountReceivable = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body;

    const account = await this.accountReceivableService.cancelAccountReceivable(
      id,
      reason,
      req.user!.id
    );

    res.json({
      success: true,
      data: account,
      message: 'Conta cancelada com sucesso',
    });
  });

  /**
   * Obter contas a receber por cliente
   * GET /financial/accounts-receivable/customer/:customerId
   */
  getCustomerAccounts = asyncHandler(async (req: Request, res: Response) => {
    const { customerId } = req.params;

    const accounts = await this.accountReceivableService.getCustomerAccountsReceivable(
      customerId
    );

    res.json({
      success: true,
      data: accounts,
    });
  });

  /**
   * Obter contas a receber por vencer
   * GET /financial/accounts-receivable/upcoming
   */
  getUpcomingReceivables = asyncHandler(async (req: Request, res: Response) => {
    const { days } = req.query;

    const receivables = await this.accountReceivableService.getUpcomingReceivables(
      days ? parseInt(days as string) : 7
    );

    res.json({
      success: true,
      data: receivables,
    });
  });

  /**
   * Obter contas vencidas
   * GET /financial/accounts-receivable/overdue
   */
  getOverdueReceivables = asyncHandler(async (req: Request, res: Response) => {
    const receivables = await this.accountReceivableService.getOverdueReceivables();

    res.json({
      success: true,
      data: receivables,
    });
  });

  /**
   * Resumo de contas a receber
   * GET /financial/accounts-receivable/summary
   */
  getSummary = asyncHandler(async (req: Request, res: Response) => {
    const summary = await this.accountReceivableService.getSummary();

    res.json({
      success: true,
      data: summary,
    });
  });

  /**
   * Calcular DSO (Days Sales Outstanding)
   * GET /financial/accounts-receivable/analytics/dso
   */
  getDSO = asyncHandler(async (req: Request, res: Response) => {
    const dso = await this.accountReceivableService.calculateDSO();

    res.json({
      success: true,
      data: { dso },
    });
  });
}

/**
 * DRE (Financial Reports) Controller
 * Gerencia relatórios financeiros
 */
export class DREController {
  private dreService: DREService;

  constructor() {
    this.dreService = new DREService();
  }

  /**
   * Gerar DRE
   * GET /financial/reports/dre
   */
  generateDRE = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const dre = await this.dreService.generateDREReport({
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    });

    res.json({
      success: true,
      data: dre,
    });
  });

  /**
   * Gerar Fluxo de Caixa
   * GET /financial/reports/cash-flow
   */
  generateCashFlow = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const cashFlow = await this.dreService.generateCashFlow({
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    });

    res.json({
      success: true,
      data: cashFlow,
    });
  });

  /**
   * Análise de Lucratividade
   * GET /financial/reports/profitability
   */
  analyzeProfitability = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const analysis = await this.dreService.analyzeProfitability({
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string),
    });

    res.json({
      success: true,
      data: analysis,
    });
  });

  /**
   * Indicadores Financeiros
   * GET /financial/reports/indicators
   */
  getIndicators = asyncHandler(async (req: Request, res: Response) => {
    const indicators = await this.dreService.calculateFinancialIndicators();

    res.json({
      success: true,
      data: indicators,
    });
  });

  /**
   * Relatório Comparativo
   * GET /financial/reports/comparative
   */
  generateComparative = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const report = await this.dreService.generateComparativeReport(
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json({
      success: true,
      data: report,
    });
  });
}
